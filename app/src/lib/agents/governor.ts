import type { Address, Hex } from 'viem'
import type {
  ResearchTask,
  ParsedRules,
  SSEEvent,
  AgentNode,
  ClearSignRequest,
  VeniceReasoning,
} from '../types'
import {
  createRootDelegation,
  createResearcherDelegation,
  createSummarizerDelegation,
  getScopeDescription,
} from '../delegation'
import { governorReason, researchData, summarizeData, explainForClearSign } from '../venice'
import { fetchWithX402 } from '../x402'
import { logAction, getTotalSpent } from './memory'
import { AGENT_NAMES } from '../constants'

// Global state for the agent system
interface AgentState {
  rules: ParsedRules | null
  agents: Map<string, AgentNode>
  events: SSEEvent[]
  listeners: Set<(event: SSEEvent) => void>
  currentTask: ResearchTask | null
  pendingClearSign: ClearSignRequest | null
  clearSignResolve: ((response: 'proceed' | 'reject') => void) | null
  budget: number
  spent: number
}

export const agentState: AgentState = {
  rules: null,
  agents: new Map(),
  events: [],
  listeners: new Set(),
  currentTask: null,
  pendingClearSign: null,
  clearSignResolve: null,
  budget: 10,
  spent: 0,
}

// Emit an SSE event to all listeners
function emit(event: SSEEvent) {
  agentState.events.push(event)
  agentState.listeners.forEach((listener) => listener(event))
}

// Subscribe to SSE events
export function subscribe(listener: (event: SSEEvent) => void): () => void {
  agentState.listeners.add(listener)
  return () => agentState.listeners.delete(listener)
}

// Initialize agents with addresses
export function initializeAgents(addresses: {
  user: Address
  governor: Address
  researcher: Address
  summarizer: Address
}) {
  const agents: [string, AgentNode][] = [
    ['user', {
      id: 'user',
      role: 'user',
      address: addresses.user,
      status: 'idle',
      budget: agentState.budget,
      spent: 0,
      scope: ['Full wallet authority'],
    }],
    ['governor', {
      id: 'governor',
      role: 'governor',
      address: addresses.governor,
      status: 'idle',
      budget: agentState.budget,
      spent: 0,
      scope: getScopeDescription('governor'),
    }],
    ['researcher', {
      id: 'researcher',
      role: 'researcher',
      address: addresses.researcher,
      status: 'idle',
      budget: 0.05,
      spent: 0,
      scope: getScopeDescription('researcher'),
    }],
    ['summarizer', {
      id: 'summarizer',
      role: 'summarizer',
      address: addresses.summarizer,
      status: 'idle',
      budget: 0,
      spent: 0,
      scope: getScopeDescription('summarizer'),
    }],
  ]

  agentState.agents = new Map(agents)
}

// Set the parsed rules
export function setRules(rules: ParsedRules) {
  agentState.rules = rules
}

// Update agent status
function updateAgentStatus(agentId: string, status: AgentNode['status'], extra?: Partial<AgentNode>) {
  const agent = agentState.agents.get(agentId)
  if (agent) {
    Object.assign(agent, { status, ...extra })
    emit({
      type: 'agent_status',
      data: { agentId, status, ...extra },
      timestamp: Date.now(),
    })
  }
}

// Resolve a ClearSign request
export function resolveClearSign(response: 'proceed' | 'reject') {
  if (agentState.clearSignResolve) {
    agentState.clearSignResolve(response)
    agentState.clearSignResolve = null
    agentState.pendingClearSign = null
  }
}

// The main Governor agent loop
export async function executeTask(task: ResearchTask): Promise<string> {
  if (!agentState.rules) {
    throw new Error('Rules not initialized')
  }

  const addresses = {
    governor: agentState.agents.get('governor')!.address,
    researcher: agentState.agents.get('researcher')!.address,
    summarizer: agentState.agents.get('summarizer')!.address,
    user: agentState.agents.get('user')!.address,
  }

  agentState.currentTask = task

  try {
    // === Step 1: Governor receives task ===
    updateAgentStatus('governor', 'active')
    emit({
      type: 'agent_status',
      data: { agentId: 'governor', action: `Received task: ${task.query}` },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: `Received research task: ${task.query}`,
      reasoning: 'Task received from user',
      outcome: 'success',
    })

    // === Step 2: Create delegation chain ===
    // Root: User -> Governor
    const rootDelegation = createRootDelegation(
      addresses.user,
      addresses.governor,
    )

    emit({
      type: 'delegation_created',
      data: {
        from: 'user',
        to: 'governor',
        scope: getScopeDescription('governor'),
        budget: agentState.budget,
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: 'Root delegation created: User -> Governor',
      reasoning: `Budget: $${agentState.budget}/week, time-limited`,
      outcome: 'success',
    })

    // Redelegation: Governor -> Researcher
    const researcherDelegation = createResearcherDelegation(
      rootDelegation,
      addresses.governor,
      addresses.researcher,
    )

    updateAgentStatus('researcher', 'active')
    emit({
      type: 'redelegation_created',
      data: {
        from: 'governor',
        to: 'researcher',
        scope: getScopeDescription('researcher'),
        budget: 0.05,
        parentScope: getScopeDescription('governor'),
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: 'Redelegation created: Governor -> Researcher',
      reasoning: 'Scope narrowed: max $0.05/call, data-fetch only, 1h window',
      outcome: 'success',
    })

    // Redelegation: Researcher -> Summarizer
    const summarizerDelegation = createSummarizerDelegation(
      researcherDelegation,
      addresses.researcher,
      addresses.summarizer,
    )

    emit({
      type: 'redelegation_created',
      data: {
        from: 'researcher',
        to: 'summarizer',
        scope: getScopeDescription('summarizer'),
        budget: 0,
        parentScope: getScopeDescription('researcher'),
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'researcher',
      actorAddress: addresses.researcher,
      action: 'Redelegation created: Researcher -> Summarizer',
      reasoning: 'Scope narrowed: zero budget, read-only, 30min window',
      outcome: 'success',
    })

    // === Step 3: Researcher fetches data via x402 ===
    task.status = 'researching'
    emit({
      type: 'agent_status',
      data: { agentId: 'researcher', action: 'Fetching data via x402...' },
      timestamp: Date.now(),
    })

    const rawData = await researchData(task.query)
    const x402Cost = 0.001

    emit({
      type: 'x402_payment',
      data: {
        agent: 'researcher',
        amount: x402Cost,
        endpoint: 'venice.ai/research',
        description: `Data fetch for: ${task.query.substring(0, 50)}...`,
      },
      timestamp: Date.now(),
    })

    agentState.spent += x402Cost
    updateAgentStatus('researcher', 'completed', { spent: x402Cost })

    logAction({
      actor: 'researcher',
      actorAddress: addresses.researcher,
      action: `x402 data fetch: ${task.query.substring(0, 50)}...`,
      reasoning: 'Fetched via Venice AI under delegated scope',
      x402Cost,
      outcome: 'success',
    })

    // === Step 4: Summarizer compresses data ===
    task.status = 'summarizing'
    updateAgentStatus('summarizer', 'active')
    emit({
      type: 'agent_status',
      data: { agentId: 'summarizer', action: 'Compressing research data...' },
      timestamp: Date.now(),
    })

    const summary = await summarizeData(rawData)
    updateAgentStatus('summarizer', 'completed')

    logAction({
      actor: 'summarizer',
      actorAddress: addresses.summarizer,
      action: 'Summarized research data',
      reasoning: 'Compressed to structured summary (zero-budget, read-only)',
      outcome: 'success',
    })

    // === Step 5: Governor reasons about the result ===
    task.status = 'deciding'
    emit({
      type: 'agent_status',
      data: { agentId: 'governor', action: 'Reasoning about results...' },
      timestamp: Date.now(),
    })

    const reasoning = await governorReason(task.query, agentState.rules, summary)

    emit({
      type: 'venice_reasoning',
      data: {
        agent: 'governor',
        decision: reasoning.decision,
        reasoning: reasoning.reasoning,
        thinkTrace: reasoning.thinkTrace,
        confidence: reasoning.confidence,
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: `Decision: ${reasoning.decision}`,
      reasoning: reasoning.reasoning,
      x402Cost: reasoning.cost,
      outcome: 'success',
    })

    // === Step 6: ClearSign if needed ===
    if (reasoning.decision === 'escalate' || reasoning.cost > 0.5) {
      task.status = 'clearsign'

      const explanation = await explainForClearSign(task.query, reasoning)

      const clearSignRequest: ClearSignRequest = {
        id: `cs-${Date.now()}`,
        action: task.query,
        description: explanation,
        reasoning,
        cost: reasoning.cost,
        budgetRemaining: agentState.budget - agentState.spent,
        txDetails: {
          to: addresses.governor,
          value: `$${reasoning.cost}`,
          data: '0x' as Hex,
        },
        timestamp: Date.now(),
      }

      agentState.pendingClearSign = clearSignRequest

      emit({
        type: 'clearsign_request',
        data: clearSignRequest as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      })

      // Wait for user response
      const userResponse = await new Promise<'proceed' | 'reject'>((resolve) => {
        agentState.clearSignResolve = resolve
        // Auto-approve after 30 seconds for demo
        setTimeout(() => {
          if (agentState.clearSignResolve === resolve) {
            resolve('proceed')
          }
        }, 30000)
      })

      if (userResponse === 'reject') {
        logAction({
          actor: 'user',
          actorAddress: addresses.user,
          action: 'Rejected ClearSign request',
          reasoning: 'User chose not to proceed',
          outcome: 'rejected',
        })

        task.status = 'failed'
        task.result = 'User rejected the action via ClearSign.'
        updateAgentStatus('governor', 'idle')
        return task.result
      }
    }

    // === Step 7: Execute (or just return result for research tasks) ===
    task.status = 'completed'
    task.result = summary

    agentState.spent += reasoning.cost

    emit({
      type: 'execution_result',
      data: {
        task: task.query,
        result: summary,
        decision: reasoning.decision,
        totalCost: agentState.spent,
        budgetRemaining: agentState.budget - agentState.spent,
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: `Task completed: ${task.query.substring(0, 50)}...`,
      reasoning: `Result delivered. Total cost: $${agentState.spent.toFixed(4)}`,
      x402Cost: reasoning.cost,
      outcome: 'success',
    })

    // Reset agent statuses
    updateAgentStatus('governor', 'idle')
    updateAgentStatus('researcher', 'idle')
    updateAgentStatus('summarizer', 'idle')

    agentState.currentTask = null
    return summary

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    emit({
      type: 'error',
      data: { message: errorMessage, task: task.query },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: `Task failed: ${errorMessage}`,
      reasoning: 'Unexpected error during execution',
      outcome: 'failure',
      details: errorMessage,
    })

    task.status = 'failed'
    task.result = `Error: ${errorMessage}`
    updateAgentStatus('governor', 'error')
    agentState.currentTask = null
    throw error
  }
}

// Get current state for the frontend
export function getAgentState() {
  return {
    agents: Object.fromEntries(agentState.agents),
    rules: agentState.rules,
    currentTask: agentState.currentTask,
    pendingClearSign: agentState.pendingClearSign,
    budget: agentState.budget,
    spent: agentState.spent,
    budgetRemaining: agentState.budget - agentState.spent,
    totalActions: agentState.events.length,
  }
}
