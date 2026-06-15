'use client'

import type { ActionLogEntry, AgentRole } from '@/lib/types'
import { THEME, ROLE_COLOR } from '@/lib/constants'
import { Card, SectionLabel } from './ui'
import { BASE_EXPLORER_TX } from '@/lib/constants'

interface MemoryLogProps {
  entries: ActionLogEntry[]
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const OUTCOME_COLOR: Record<string, string> = {
  success: THEME.green,
  failure: THEME.red,
  rejected: THEME.red,
  pending: THEME.amber,
}

function actorChip(actor: AgentRole) {
  const color = ROLE_COLOR[actor] ?? THEME.textMuted
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 8.5,
        fontWeight: 600,
        letterSpacing: 1,
        padding: '2px 5px',
        borderRadius: 4,
        background: `${color}1f`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {actor.toUpperCase()}
    </span>
  )
}

export default function MemoryLog({ entries }: MemoryLogProps) {
  const ordered = [...entries].reverse()

  return (
    <Card style={{ paddingBottom: 8 }}>
      <SectionLabel right={`${entries.length} ENTRIES`}>MEMORY — ACTION LOG</SectionLabel>

      <div style={{ marginTop: 4, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
        {ordered.length === 0 ? (
          <div
            className="font-mono"
            style={{ fontSize: 10, color: THEME.textFaint, padding: '24px 0', textAlign: 'center' }}
          >
            No actions recorded yet.
          </div>
        ) : (
          ordered.map((e) => (
            <div
              key={e.id}
              className="animate-fade-up"
              style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono" style={{ fontSize: 9, color: THEME.textFaint }}>
                  {formatTime(e.timestamp)}
                </span>
                {actorChip(e.actor)}
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: OUTCOME_COLOR[e.outcome] ?? THEME.textFaint,
                    display: 'inline-block',
                  }}
                />
                {e.x402Cost > 0 && (
                  <span
                    className="font-mono"
                    style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: THEME.amber }}
                  >
                    ${e.x402Cost.toFixed(4)}
                  </span>
                )}
              </div>
              <div
                style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.5, color: THEME.textSoft }}
              >
                {e.action}
              </div>
              {e.reasoning && e.reasoning !== e.action && (
                <div style={{ marginTop: 2, fontSize: 11, lineHeight: 1.5, color: THEME.textMuted }}>
                  {e.reasoning}
                </div>
              )}
              {e.txHash && /^0x[0-9a-fA-F]{64}$/.test(e.txHash) ? (
                <a
                  href={`${BASE_EXPLORER_TX}${e.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono"
                  style={{ fontSize: 9, lineHeight: 1.8, color: THEME.cyan, textDecoration: 'none' }}
                >
                  {e.txHash.slice(0, 18)}… ↗
                </a>
              ) : e.txHash ? (
                <span className="font-mono" style={{ fontSize: 9, lineHeight: 1.8, color: THEME.textFaint }}>
                  {e.txHash} · scenario ref
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
