import type { Hex, Address } from 'viem'
import type { Delegation } from '@metamask/smart-accounts-kit'

// Agent types in the delegation chain
export type AgentRole = 'user' | 'governor' | 'researcher' | 'summarizer'

export type AgentStatus = 'idle' | 'active' | 'pending' | 'completed' | 'error' | 'revoked'

export interface AgentNode {
  id: string
  role: AgentRole
  address: Address
  status: AgentStatus
  budget: number      // max budget in USD
  spent: number       // spent so far
  scope: string[]     // human-readable scope descriptions
  txHash?: Hex        // delegation tx hash
  parentId?: string   // parent agent node ID
}

// Rule parsing types
export interface ParsedRules {
  hardConstraints: HardConstraint[]
  softPreferences: string[]
}

export interface HardConstraint {
  type: 'budget' | 'perTxCap' | 'allowedTargets' | 'timeWindow' | 'blockedActions'
  description: string
  value: string | number | string[]
}

// Venice AI types
export interface VeniceReasoning {
  decision: 'approve' | 'reject' | 'escalate'
  reasoning: string
  thinkTrace: string // <think> block content
  confidence: number
  cost: number
  rulesCited: string[]
}

// ClearSign types
export interface ClearSignRequest {
  id: string
  action: string
  description: string
  reasoning: VeniceReasoning
  cost: number
  budgetRemaining: number
  txDetails: {
    to: Address
    value: string
    data: Hex
  }
  timestamp: number
}

export type ClearSignResponse = {
  action: 'proceed' | 'override' | 'reject'
  id: string
}

// Action log / memory types
export interface ActionLogEntry {
  id: string
  timestamp: number
  actor: AgentRole
  actorAddress: Address
  action: string
  reasoning: string
  x402Cost: number
  txHash?: Hex
  outcome: 'success' | 'failure' | 'pending' | 'rejected'
  details?: string
}

// SSE event types
export type SSEEventType =
  | 'delegation_created'
  | 'redelegation_created'
  | 'x402_payment'
  | 'venice_reasoning'
  | 'clearsign_request'
  | 'execution_result'
  | 'agent_status'
  | 'error'

export interface SSEEvent {
  type: SSEEventType
  data: Record<string, unknown>
  timestamp: number
}

// Research task types
export interface ResearchTask {
  id: string
  query: string
  status: 'pending' | 'researching' | 'summarizing' | 'deciding' | 'clearsign' | 'executing' | 'completed' | 'failed'
  createdAt: number
  result?: string
}

// 1Shot types
export interface OneShotCapabilities {
  acceptedTokens: { address: Address; symbol: string }[]
  feeCollector: Address
  targetAddress: Address
}

export interface OneShotEstimate {
  success: boolean
  requiredPaymentAmount?: string
  gasUsed: Record<string, string>
  context?: string
  error?: string
}

export interface OneShotTask {
  id: string
  status: 'Pending' | 'Submitted' | 'Confirmed' | 'Rejected' | 'Reverted'
  txHash?: Hex
  receipt?: {
    transactionHash: Hex
    blockNumber: string
    gasUsed: string
  }
  error?: string
}

// Delegation chain type for the tree visualization
export interface DelegationChainNode {
  delegation: Delegation
  agent: AgentNode
  children: DelegationChainNode[]
}
