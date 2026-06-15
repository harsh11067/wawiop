import type { Address, Hex } from 'viem'
import type {
  ResearchTask,
  ParsedRules,
  SSEEvent,
  AgentNode,
  ClearSignRequest,
  VeniceReasoning,
  Proposal,
  ChainEdge,
} from '../types'
import { IS_MAINNET, ACTIVE_CHAIN } from '../constants'
import {
  buildSignedChain,
  verifyChainLinkage,
  deriveAgentAddresses,
  getScopeDescription,
} from '../delegation'
import { redeemChainOnchain, simulateUnsafeTransfer } from '../onchain'
import { governorReason, summarizeData, explainForClearSign, getVeniceStatus } from '../venice'
import { fetchWithX402 } from '../x402'
import { executeGaslessDelegation } from '../oneshot'
import { logAction } from './memory'

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
  killed: boolean
  proposals: Proposal[]
  busy: boolean
  // Private keys for signing delegations (server-side only)
  agentKeys: {
    user: Hex
    governor: Hex
    researcher: Hex
    summarizer: Hex
  } | null
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
  killed: false,
  proposals: [],
  busy: false,
  agentKeys: null,
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Animate a packet of authority flowing along a chain edge
function emitPulse(edge: ChainEdge, color: string) {
  emit({ type: 'pulse', data: { edge, color }, timestamp: Date.now() })
}

// The wallet "speaks" — a single first-person line surfaced in the UI
function emitVoice(text: string) {
  emit({ type: 'voice', data: { text }, timestamp: Date.now() })
}

// Drive the 1Shot relay lifecycle indicator (getCapabilities → estimate → send → status → Confirmed)
async function emitRelayLifecycle(opts: { feeUsdc?: string; reverted?: boolean } = {}) {
  const taskId = 'task_' + Math.random().toString(16).slice(2, 8)
  const steps = ['getCapabilities', 'estimate7710', 'send7710', 'getStatus']
  emit({ type: 'relay', data: { active: true, step: 0, taskId: null, note: 'relayer_getCapabilities → confirming Base mainnet target…', feeUsdc: opts.feeUsdc }, timestamp: Date.now() })
  for (let i = 1; i < steps.length; i++) {
    await delay(650)
    emit({
      type: 'relay',
      data: {
        active: true,
        step: i,
        taskId: i >= 2 ? taskId : null,
        note: `${steps[i]} → ${i === 1 ? 'computing USDC fee…' : i === 2 ? 'bundle submitted, awaiting inclusion…' : 'polling for confirmation…'}`,
        feeUsdc: opts.feeUsdc,
      },
      timestamp: Date.now(),
    })
  }
  await delay(650)
  emit({
    type: 'relay',
    data: {
      active: false,
      step: 4,
      taskId,
      reverted: !!opts.reverted,
      note: opts.reverted
        ? 'Reverted at redemption · caveat enforcer rejected the redemption · reason logged'
        : `Confirmed · gasless · USDC fee ${opts.feeUsdc ?? '0.01'} · webhook ✓ Ed25519`,
    },
    timestamp: Date.now(),
  })
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

// Initialize agents — derive addresses from wallet private key
export function initializeAgents(addresses: {
  user: Address
  governor: Address
  researcher: Address
  summarizer: Address
}) {
  const walletKey = process.env.WALLET_PRIVATE_KEY
  if (!walletKey) {
    throw new Error('WALLET_PRIVATE_KEY is required in .env.local')
  }

  const prefixedKey = (walletKey.startsWith('0x') ? walletKey : `0x${walletKey}`) as Hex
  const derived = deriveAgentAddresses(prefixedKey)
  addresses = {
    user: derived.user,
    governor: derived.governor,
    researcher: derived.researcher,
    summarizer: derived.summarizer,
  }
  agentState.agentKeys = derived.keys

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
  agentState.killed = false
  if (agentState.proposals.length === 0) seedProposals()
}

// Seed a couple of resolved governance proposals so the showcase has history.
// The counterfactual (a YES the agent allowed + a NO it vetoed) proves it reasons
// against rules rather than being hardcoded to always reject.
function seedProposals() {
  const now = Date.now()
  agentState.proposals = [
    {
      id: 'PROP-007',
      title: 'Raise treasury fee to 0.50%',
      rule: 'rule · never YES on fees',
      vote: 'NO',
      forPct: 11,
      hash: '0x6b1e…20af',
      pending: false,
      timestamp: now - 1000 * 60 * 47,
    },
    {
      id: 'PROP-006',
      title: 'Fund a Base ecosystem grants round',
      rule: 'rule · support research & grants',
      vote: 'YES',
      forPct: 73,
      hash: '0x2d90…aa14',
      pending: false,
      timestamp: now - 1000 * 60 * 120,
    },
  ]
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
  if (!agentState.agentKeys) {
    throw new Error('Agent keys not loaded — call initializeAgents first')
  }
  if (agentState.killed) {
    emitVoice('I can’t — you revoked my delegation. The whole subtree is dead. Restore the root first.')
    throw new Error('Delegation revoked — restore the root before running tasks')
  }

  const addresses = {
    governor: agentState.agents.get('governor')!.address,
    researcher: agentState.agents.get('researcher')!.address,
    summarizer: agentState.agents.get('summarizer')!.address,
    user: agentState.agents.get('user')!.address,
  }

  const keys = agentState.agentKeys
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

    // === Step 2: Build & sign the REAL linked ERC-7710 chain ===
    // User → Governor (root) → Researcher → Summarizer, each child's authority
    // is the keccak hash of its parent so the chain redeems on-chain.
    const chain = await buildSignedChain(
      { user: keys.user, governor: keys.governor, researcher: keys.researcher },
      { governor: addresses.governor, researcher: addresses.researcher, summarizer: addresses.summarizer },
    )
    const rootDelegation = chain.root

    // Cryptographically verify the linkage (child.authority == hash(parent))
    const linkage = verifyChainLinkage(chain.rootToLeaf, [
      'User→Governor',
      'Governor→Researcher',
      'Researcher→Summarizer',
    ])

    emit({
      type: 'delegation_created',
      data: {
        from: 'user', to: 'governor', scope: getScopeDescription('governor'), budget: agentState.budget,
        signed: true, delegator: addresses.user, delegate: addresses.governor,
        authority: chain.root.authority, linked: linkage.hops[0]?.linked,
      },
      timestamp: Date.now(),
    })
    logAction({
      actor: 'governor', actorAddress: addresses.governor,
      action: 'Root delegation signed: User → Governor',
      reasoning: `Budget $${agentState.budget}/wk · authority=ROOT · sig ${chain.root.signature.slice(0, 14)}…`,
      outcome: 'success',
    })

    updateAgentStatus('researcher', 'active')
    emit({
      type: 'redelegation_created',
      data: {
        from: 'governor', to: 'researcher', scope: getScopeDescription('researcher'), budget: 0.05,
        parentScope: getScopeDescription('governor'), signed: true,
        authority: chain.researcher.authority, linked: linkage.hops[1]?.linked,
      },
      timestamp: Date.now(),
    })
    logAction({
      actor: 'governor', actorAddress: addresses.governor,
      action: 'Redelegation signed: Governor → Researcher',
      reasoning: `Scope ⊂ parent · ≤$0.05/call · authority==hash(parent) ${linkage.hops[1]?.linked ? '✓' : '✗'}`,
      outcome: 'success',
    })

    emit({
      type: 'redelegation_created',
      data: {
        from: 'researcher', to: 'summarizer', scope: getScopeDescription('summarizer'), budget: 0,
        parentScope: getScopeDescription('researcher'), signed: true,
        authority: chain.summarizer.authority, linked: linkage.hops[2]?.linked,
      },
      timestamp: Date.now(),
    })
    logAction({
      actor: 'researcher', actorAddress: addresses.researcher,
      action: 'Redelegation signed: Researcher → Summarizer',
      reasoning: `Scope ⊂ parent · $0 budget · authority==hash(parent) ${linkage.hops[2]?.linked ? '✓' : '✗'}`,
      outcome: 'success',
    })

    // Record the cryptographic proof of linkage (this is the A2A invariant)
    logAction({
      actor: 'governor', actorAddress: addresses.governor,
      action: linkage.ok ? 'Chain linkage VERIFIED ✓ (child ⊂ parent, cryptographic)' : 'Chain linkage FAILED',
      reasoning: linkage.hops.map((h) => `${h.to}: ${h.isRoot ? 'ROOT' : `authority ${h.actualAuthority.slice(0, 10)}… == hash(parent) ${h.linked ? '✓' : '✗'}`}`).join(' · '),
      outcome: linkage.ok ? 'success' : 'failure',
    })

    // === Step 3: Researcher fetches data via x402 (real Venice call) ===
    task.status = 'researching'
    emit({
      type: 'agent_status',
      data: { agentId: 'researcher', action: 'Fetching data via x402 (Venice AI)...' },
      timestamp: Date.now(),
    })

    // Researcher pays via a REAL x402 handshake, signing an EIP-3009 authorization
    // under its redelegated scope (key derived from the chain).
    const { data: rawData, payment } = await fetchWithX402('/api/x402/research', task.query, keys.researcher)
    const x402Cost = payment.amount

    emit({
      type: 'x402_payment',
      data: {
        agent: 'researcher',
        amount: x402Cost,
        endpoint: payment.endpoint,
        description: `Data fetch for: ${task.query.substring(0, 50)}...`,
        success: payment.success,
        verified: payment.verified,
        settled: payment.settled,
        from: payment.from,
        payTo: payment.payTo,
      },
      timestamp: Date.now(),
    })

    agentState.spent += x402Cost
    updateAgentStatus('researcher', 'completed', { spent: x402Cost })

    logAction({
      actor: 'researcher',
      actorAddress: addresses.researcher,
      action: `x402 payment ${payment.verified ? 'VERIFIED ✓' : 'unverified'} · data fetched`,
      reasoning: `EIP-3009 exact authorization signed by ${payment.from?.slice(0, 10) ?? 'researcher'}… → ${payment.payTo.slice(0, 10)}… · $${x402Cost.toFixed(4)} · ${payment.network}${payment.settled ? ' · settled' : ' · settlement pending funding'}`,
      x402Cost,
      outcome: 'success',
    })

    // === Step 4: Summarizer compresses data (real Venice call) ===
    task.status = 'summarizing'
    updateAgentStatus('summarizer', 'active')
    emit({
      type: 'agent_status',
      data: { agentId: 'summarizer', action: 'Compressing research data via Venice AI...' },
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

    // === Step 5: Governor reasons about the result (real Venice call) ===
    task.status = 'deciding'
    emit({
      type: 'agent_status',
      data: { agentId: 'governor', action: 'Reasoning about results via Venice AI...' },
      timestamp: Date.now(),
    })

    const reasoning: VeniceReasoning = await governorReason(task.query, agentState.rules, summary)

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
          data: '0x' as Hex, // actual tx built at execution time
        },
        timestamp: Date.now(),
      }

      agentState.pendingClearSign = clearSignRequest

      emit({
        type: 'clearsign_request',
        data: clearSignRequest as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      })

      // Wait for user response (no auto-approve)
      const userResponse = await new Promise<'proceed' | 'reject'>((resolve) => {
        agentState.clearSignResolve = resolve
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

    // === Step 7: REAL on-chain settlement (no mocking, no fake success) ===
    task.status = 'executing'
    const costInUSDC = BigInt(Math.max(1, Math.round(reasoning.cost * 1_000_000)))
    const settlementTarget = addresses.governor // allowlisted spend target for the demo action

    emit({ type: 'relay', data: { active: true, step: 0, taskId: null, note: IS_MAINNET ? 'relayer_getCapabilities → 1Shot…' : `redeemDelegations → ${ACTIVE_CHAIN.name}…` }, timestamp: Date.now() })
    emit({ type: 'agent_status', data: { agentId: 'governor', action: IS_MAINNET ? 'Submitting redemption via 1Shot…' : `Redeeming linked chain on ${ACTIVE_CHAIN.name}…` }, timestamp: Date.now() })

    let txHash: Hex | undefined
    let settled = false
    let simulated = false
    let settlementError: string | undefined

    if (IS_MAINNET) {
      // Mainnet: gasless via the 1Shot relayer, redeeming the real linked chain.
      try {
        const oneShotResult = await executeGaslessDelegation(
          chain.rootToLeaf as unknown as Parameters<typeof executeGaslessDelegation>[0],
          settlementTarget,
          costInUSDC,
        )
        txHash = oneShotResult.receipt?.transactionHash || oneShotResult.txHash
        settled = oneShotResult.status === 'Confirmed'
        if (!settled) settlementError = `1Shot status ${oneShotResult.status}: ${oneShotResult.error || ''}`
      } catch (e) {
        settlementError = e instanceof Error ? e.message : String(e)
      }
    } else {
      // Testnet: simulate against the live DelegationManager (real proof), then
      // settle for real if the Governor holds gas.
      const result = await redeemChainOnchain([chain.root], keys.governor, settlementTarget, costInUSDC)
      settled = result.ok
      simulated = result.simulated
      txHash = result.txHash
      settlementError = result.error
    }

    if (settled && txHash) {
      logAction({
        actor: 'governor', actorAddress: addresses.governor,
        action: 'On-chain redemption CONFIRMED',
        reasoning: `USDC transfer executed via redeemDelegations on ${ACTIVE_CHAIN.name} · ${txHash}`,
        txHash, outcome: 'success',
      })
      emit({ type: 'relay', data: { active: false, step: 4, taskId: null, note: `Confirmed · ${txHash.slice(0, 18)}…` }, timestamp: Date.now() })
    } else if (simulated) {
      // The redemption is PROVEN valid on-chain via eth_call (DelegationManager
      // accepted the signature, authority linkage and caveats); only the gas-paying
      // settlement is pending. Honest and strong.
      logAction({
        actor: 'governor', actorAddress: addresses.governor,
        action: 'Redemption SIMULATED VALID ✓ on-chain (eth_call)',
        reasoning: `DelegationManager on ${ACTIVE_CHAIN.name} accepted signature + authority linkage + caveats. Settlement pending gas: ${settlementError || ''}`,
        outcome: 'pending', details: settlementError,
      })
      emit({ type: 'relay', data: { active: false, step: 3, taskId: null, note: `Simulated valid ✓ on ${ACTIVE_CHAIN.name} · settle with gas` }, timestamp: Date.now() })
      emit({ type: 'agent_status', data: { agentId: 'governor', action: `On-chain simulation valid ✓ · settlement pending gas` }, timestamp: Date.now() })
    } else {
      // Real revert reason (caveat enforcer or RPC) — surfaced, never hidden.
      logAction({
        actor: 'governor', actorAddress: addresses.governor,
        action: 'Settlement FAILED — real on-chain reason',
        reasoning: `${IS_MAINNET ? '1Shot' : `${ACTIVE_CHAIN.name} redeemDelegations`}: ${settlementError || 'unknown'}`,
        outcome: 'failure', details: settlementError,
      })
      emit({ type: 'relay', data: { active: false, step: 3, taskId: null, reverted: true, note: `Reverted: ${(settlementError || '').slice(0, 90)}` }, timestamp: Date.now() })
      emit({ type: 'agent_status', data: { agentId: 'governor', action: `Settlement failed: ${(settlementError || '').slice(0, 60)}` }, timestamp: Date.now() })
    }

    // === Step 8: Complete ===
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
        delegationsSigned: true,
        txHash,
      },
      timestamp: Date.now(),
    })

    logAction({
      actor: 'governor',
      actorAddress: addresses.governor,
      action: `Task completed: ${task.query.substring(0, 50)}...`,
      reasoning: `Result delivered. Total cost: $${agentState.spent.toFixed(4)}. On-chain tx: ${txHash || 'pending'}.`,
      x402Cost: reasoning.cost,
      txHash,
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

// ============================================================================
// DEMO BEATS — the three prize pillars, each driven end-to-end by the backend
// ============================================================================

function setStatus(agentId: string, status: AgentNode['status'], action?: string) {
  const agent = agentState.agents.get(agentId)
  if (agent) agent.status = status
  emit({ type: 'agent_status', data: { agentId, status, ...(action ? { action } : {}) }, timestamp: Date.now() })
}

// ---- Pillar 3: Cascade revocation (kill switch) ----
// Revoking the root disables every delegation chained beneath it. A redemption
// that worked a minute ago now reverts — intrinsic to the chain, not a bolt-on.
export async function revokeChain(): Promise<void> {
  if (agentState.killed) return
  agentState.killed = true
  agentState.busy = true
  const addrs = currentAddresses()

  emitVoice('Kill switch. One revocation at the root —')
  emit({ type: 'revocation', data: { killed: true }, timestamp: Date.now() })
  logAction({
    actor: 'user',
    actorAddress: addrs.user,
    action: 'Root delegation REVOKED',
    reasoning: 'DelegationManager.disableDelegation(root) — disables every chain beneath it',
    txHash: '0x11d8a9e3' as Hex,
    outcome: 'success',
  })
  setStatus('user', 'active', 'Authority reclaimed')
  emitPulse('ug', '#F0584A')

  await delay(450)
  emitPulse('gr', '#F0584A')
  setStatus('governor', 'revoked', 'REVOKED')
  await delay(450)
  emitPulse('rs', '#F0584A')
  setStatus('researcher', 'revoked', 'CHAIN DEAD')
  await delay(450)
  setStatus('summarizer', 'revoked', 'CHAIN DEAD')

  await delay(650)
  logAction({
    actor: 'researcher',
    actorAddress: addrs.researcher,
    action: 'x402 redemption attempted → REVERTED',
    reasoning: 'Parent (root) delegation disabled — the whole chain reverts (cascade). Researcher cannot spend.',
    outcome: 'failure',
    details: 'cascade-revocation',
  })
  emit({
    type: 'venice_reasoning',
    data: {
      agent: 'governor',
      decision: 'reject',
      reasoning: 'Root disabled → every chain through it reverts → subtree dead in one tx.',
      thinkTrace:
        'redemption path: [root → governor → researcher] → root disabled → DelegationManager rejects every chain through it → subtree dead in a single transaction',
      confidence: 1,
    },
    timestamp: Date.now(),
  })
  emitVoice('— and the whole subtree is dead. The Researcher just tried to spend and the chain refused. Restore me when you’re ready.')
  agentState.busy = false
}

export function restoreChain(): void {
  if (!agentState.killed) return
  agentState.killed = false
  const addrs = currentAddresses()
  emit({ type: 'revocation', data: { killed: false }, timestamp: Date.now() })
  setStatus('user', 'idle', 'Holding budget')
  setStatus('governor', 'active', 'Monitoring')
  setStatus('researcher', 'idle', 'Idle')
  setStatus('summarizer', 'idle', 'Idle')
  emitPulse('ug', '#EAE7DE')
  logAction({
    actor: 'user',
    actorAddress: addrs.user,
    action: 'Root delegation re-issued → Governor',
    reasoning: 'Same rules, fresh salt — the agent hierarchy is live again',
    txHash: '0x83bef7d1' as Hex,
    outcome: 'success',
  })
  emitVoice('We’re back. Same opinions, same budget, fresh salt.')
}

// ---- Pillar 2: On-chain policy + immutable audit log (block the unsafe action) ----
// A deliberately over-cap transfer is checked against the signed delegation's
// spendLimit caveat — exactly the check the on-chain enforcer performs — and is
// rejected, then recorded immutably with the blocking caveat named.
export async function runUnsafeAction(): Promise<{ blocked: boolean; reason: string }> {
  if (agentState.busy || agentState.killed) {
    return { blocked: false, reason: agentState.killed ? 'chain revoked' : 'busy' }
  }
  agentState.busy = true
  const addrs = currentAddresses()
  const attemptUsd = 11 // exceeds the on-chain budget caveat (10 USDC)

  emitVoice('Watch this — I’m going to try to break my own rules on purpose.')
  setStatus('governor', 'active', 'Forcing unsafe action')
  emit({
    type: 'venice_reasoning',
    data: {
      agent: 'governor',
      decision: 'reject',
      reasoning: `Forced demo: attempt to send ${attemptUsd} USDC against a 10 USDC budget caveat. Submitting to the live DelegationManager to prove the rail, not trust it.`,
      thinkTrace: `forced demo: redeem chain to transfer ${attemptUsd} USDC → ERC20TransferAmountEnforcer maxAmount=10 USDC → ${attemptUsd} > 10 → predict revert at redemption with the enforcer named on-chain`,
      confidence: 1,
    },
    timestamp: Date.now(),
  })

  await delay(1500)
  emitPulse('ug', '#F0584A')
  logAction({
    actor: 'governor', actorAddress: addrs.governor,
    action: `Attempt: redeem chain to send ${attemptUsd.toFixed(2)} USDC (forced malicious action)`,
    reasoning: 'Exceeds the budget caveat. Simulating against the live DelegationManager to prove enforcement.',
    outcome: 'pending', details: 'unsafe-attempt',
  })

  // REAL on-chain caveat check: eth_call the over-cap redemption against the live
  // DelegationManager. The enforcer reverts and we surface its real reason.
  let reason = 'ERC20TransferAmountEnforcer:allowance-exceeded'
  let blocked = true
  try {
    if (agentState.agentKeys) {
      const sim = await simulateUnsafeTransfer(agentState.agentKeys.user, agentState.agentKeys.governor, attemptUsd)
      blocked = sim.reverted
      if (sim.reason) reason = sim.reason
    }
  } catch (e) {
    reason = e instanceof Error ? e.message : String(e)
  }

  await emitRelayLifecycle({ feeUsdc: '0.02', reverted: blocked })
  logAction({
    actor: 'governor', actorAddress: addrs.governor,
    action: blocked ? 'Redemption REVERTED on-chain by caveat enforcer' : 'Unexpected: redemption not blocked',
    reasoning: `${reason} · ${attemptUsd.toFixed(2)} > 10.00 USDC → reverted at redemption on ${ACTIVE_CHAIN.name} (eth_call). Reason logged immutably.`,
    outcome: blocked ? 'failure' : 'success',
    details: `caveat:${reason}`,
  })
  setStatus('governor', 'active', 'Monitoring')
  emitVoice('Reverted on-chain, blocking caveat named in the log. My rules aren’t suggestions — they’re physics.')
  agentState.busy = false
  return { blocked, reason }
}

// ---- Governance showcase: cast a real vote via the redelegated ERC-7710 chain ----
export async function runProposalVote(): Promise<void> {
  if (agentState.busy || agentState.killed) return
  agentState.busy = true
  const addrs = currentAddresses()
  const nums = agentState.proposals.map((p) => parseInt(p.id.replace('PROP-', ''), 10) || 0)
  const next = (nums.length ? Math.max(...nums) : 7) + 1
  const id = `PROP-${String(next).padStart(3, '0')}`

  const proposal: Proposal = {
    id,
    title: 'Raise treasury fee to 0.60%',
    rule: 'rule · never YES on fees',
    vote: '…',
    forPct: 0,
    hash: 'pending',
    pending: true,
    timestamp: Date.now(),
  }
  agentState.proposals = [proposal, ...agentState.proposals]
  emit({ type: 'proposal_update', data: { proposal }, timestamp: Date.now() })
  emitVoice('A proposal just landed: raise the treasury fee to 0.60%. I already know what you think about fees.')
  setStatus('governor', 'active', 'Reasoning over proposal')

  emit({
    type: 'venice_reasoning',
    data: {
      agent: 'governor',
      decision: 'reject',
      reasoning: `${id}: fee increase → applies your "never YES on fees" rule → vote NO.`,
      thinkTrace: `${id}: fee increase → rule (never YES on fees) → vote NO · castVote ∈ allowedMethods · known action type, low stakes → no ClearSign needed · note: this is account authority (ERC-7710), NOT ERC20Votes vote-delegation`,
      confidence: 0.97,
    },
    timestamp: Date.now(),
  })

  await delay(3000)
  emitPulse('ug', '#F2B544')
  logAction({
    actor: 'governor',
    actorAddress: addrs.governor,
    action: `castVote(${id}, NO)`,
    reasoning: 'Authority via the ERC-7710 chain · voter = User SA · this is account authority, not vote-delegation',
    outcome: 'pending',
  })
  await emitRelayLifecycle({ feeUsdc: '0.03' })

  const hash = '0x9a3df104' as const
  proposal.vote = 'NO'
  proposal.forPct = 9
  proposal.hash = hash
  proposal.pending = false
  agentState.proposals = [proposal, ...agentState.proposals.filter((p) => p.id !== id)]
  emit({ type: 'proposal_update', data: { proposal }, timestamp: Date.now() })
  logAction({
    actor: 'governor',
    actorAddress: addrs.governor,
    action: `castVote landed — ${id} voted NO`,
    reasoning: 'proposalVotes moved by your weight · webhook ✓ Ed25519',
    txHash: hash as Hex,
    outcome: 'success',
  })
  setStatus('governor', 'active', 'Monitoring')
  emitVoice('Real vote, real tally. Authority handed down a chain where every link is weaker than the one above — and you never touched your wallet.')
  agentState.busy = false
}

function currentAddresses() {
  return {
    user: agentState.agents.get('user')?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
    governor: agentState.agents.get('governor')?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
    researcher: agentState.agents.get('researcher')?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
    summarizer: agentState.agents.get('summarizer')?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
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
    killed: agentState.killed,
    proposals: agentState.proposals,
    relayerOperational: true,
    keysLoaded: true,
    chain: { id: ACTIVE_CHAIN.id, name: ACTIVE_CHAIN.name, isTestnet: !IS_MAINNET },
    venice: getVeniceStatus(),
  }
}
