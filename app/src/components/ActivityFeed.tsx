'use client'

import type { SSEEvent } from '@/lib/types'
import { THEME, AGENT_NAMES } from '@/lib/constants'

interface ActivityFeedProps {
  events: SSEEvent[]
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function getEventIcon(type: SSEEvent['type']): string {
  switch (type) {
    case 'delegation_created': return '🔗'
    case 'redelegation_created': return '↳'
    case 'x402_payment': return '💰'
    case 'venice_reasoning': return '🧠'
    case 'clearsign_request': return '🛡'
    case 'execution_result': return '✅'
    case 'agent_status': return '⚡'
    case 'error': return '❌'
    default: return '•'
  }
}

function getEventColor(type: SSEEvent['type']): string {
  switch (type) {
    case 'delegation_created':
    case 'redelegation_created':
      return THEME.cyan
    case 'x402_payment':
      return THEME.amber
    case 'venice_reasoning':
      return THEME.green
    case 'clearsign_request':
      return THEME.amber
    case 'execution_result':
      return THEME.green
    case 'agent_status':
      return THEME.text
    case 'error':
      return THEME.red
    default:
      return THEME.textMuted
  }
}

function getEventMessage(event: SSEEvent): string {
  const d = event.data
  switch (event.type) {
    case 'delegation_created':
      return `Delegation: ${d.from} → ${d.to} ($${d.budget})`
    case 'redelegation_created':
      return `Redelegate: ${d.from} → ${d.to} ($${d.budget})`
    case 'x402_payment':
      return `x402 payment: ${d.agent} → $${d.amount} (${d.endpoint})`
    case 'venice_reasoning':
      return `Venice: ${d.agent} decided ${d.decision} (${Math.round((d.confidence as number) * 100)}% confidence)`
    case 'clearsign_request':
      return `ClearSign required: ${(d as Record<string, unknown>).action}`
    case 'execution_result':
      return `Completed: $${(d.totalCost as number)?.toFixed(4)} spent, $${(d.budgetRemaining as number)?.toFixed(2)} remaining`
    case 'agent_status':
      return `${AGENT_NAMES[(d.agentId as string) as keyof typeof AGENT_NAMES] || d.agentId}: ${d.action || d.status}`
    case 'error':
      return `Error: ${d.message}`
    default:
      return JSON.stringify(d)
  }
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const displayEvents = events.filter(
    (e) => (e.type as string) !== 'heartbeat' && (e.type as string) !== 'connected'
  )

  return (
    <div
      className="rounded-xl border p-4 h-full overflow-auto"
      style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm" style={{ color: THEME.text }}>
          Activity Feed
        </span>
        <span className="text-xs" style={{ color: THEME.textMuted }}>
          {displayEvents.length} events
        </span>
      </div>

      <div className="space-y-1.5">
        {displayEvents.length === 0 ? (
          <div className="text-xs text-center py-4" style={{ color: THEME.textMuted }}>
            No activity yet. Submit a research task to begin.
          </div>
        ) : (
          [...displayEvents].reverse().map((event, i) => (
            <div
              key={i}
              className="flex gap-2 items-start text-xs py-1.5 border-b"
              style={{ borderColor: `${THEME.border}80` }}
            >
              <span className="text-[10px] shrink-0" style={{ color: THEME.textMuted }}>
                {formatTime(event.timestamp)}
              </span>
              <span className="shrink-0">{getEventIcon(event.type)}</span>
              <span style={{ color: getEventColor(event.type) }}>
                {getEventMessage(event)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
