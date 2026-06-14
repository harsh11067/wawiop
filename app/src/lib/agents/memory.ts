import type { ActionLogEntry, AgentRole } from '../types'
import type { Address, Hex } from 'viem'

// In-memory action log store (persists for the server session)
let actionLog: ActionLogEntry[] = []

let idCounter = 0

export function logAction(params: {
  actor: AgentRole
  actorAddress: Address
  action: string
  reasoning: string
  x402Cost?: number
  txHash?: Hex
  outcome: ActionLogEntry['outcome']
  details?: string
}): ActionLogEntry {
  const entry: ActionLogEntry = {
    id: `action-${++idCounter}`,
    timestamp: Date.now(),
    actor: params.actor,
    actorAddress: params.actorAddress,
    action: params.action,
    reasoning: params.reasoning,
    x402Cost: params.x402Cost || 0,
    txHash: params.txHash,
    outcome: params.outcome,
    details: params.details,
  }

  actionLog.push(entry)
  return entry
}

export function getActionLog(): ActionLogEntry[] {
  return [...actionLog]
}

export function getRecentActions(count: number = 20): ActionLogEntry[] {
  return actionLog.slice(-count)
}

export function clearActionLog(): void {
  actionLog = []
  idCounter = 0
}

export function getTotalSpent(): number {
  return actionLog.reduce((sum, entry) => sum + entry.x402Cost, 0)
}
