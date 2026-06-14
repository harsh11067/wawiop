'use client'

import type { ActionLogEntry } from '@/lib/types'
import { THEME, AGENT_NAMES } from '@/lib/constants'

interface MemoryLogProps {
  entries: ActionLogEntry[]
}

export default function MemoryLog({ entries }: MemoryLogProps) {
  const outcomeColors: Record<string, string> = {
    success: THEME.green,
    failure: THEME.red,
    pending: THEME.amber,
    rejected: THEME.red,
  }

  return (
    <div
      className="rounded-xl border p-4 h-full overflow-auto"
      style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm" style={{ color: THEME.text }}>
          Memory (Action Log)
        </span>
        <span className="text-xs" style={{ color: THEME.textMuted }}>
          {entries.length} actions
        </span>
      </div>

      <div className="space-y-1">
        {entries.length === 0 ? (
          <div className="text-xs text-center py-4" style={{ color: THEME.textMuted }}>
            No actions recorded yet.
          </div>
        ) : (
          [...entries].reverse().map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 text-xs py-1.5 border-b"
              style={{ borderColor: `${THEME.border}80` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: outcomeColors[entry.outcome] }}
              />
              <span className="shrink-0 font-medium" style={{ color: THEME.amber }}>
                {AGENT_NAMES[entry.actor]}
              </span>
              <span className="truncate" style={{ color: THEME.text }}>
                {entry.action}
              </span>
              {entry.x402Cost > 0 && (
                <span className="shrink-0" style={{ color: THEME.amber }}>
                  ${entry.x402Cost.toFixed(4)}
                </span>
              )}
              {entry.txHash && (
                <span className="shrink-0 font-mono" style={{ color: THEME.cyan }}>
                  {entry.txHash.slice(0, 8)}...
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
