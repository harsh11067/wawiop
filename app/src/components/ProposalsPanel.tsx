'use client'

import type { Proposal } from '@/lib/types'
import { THEME, BASE_EXPLORER_TX } from '@/lib/constants'
import { Card, SectionLabel } from './ui'

function VoteBadge({ vote }: { vote: Proposal['vote'] }) {
  const color = vote === 'NO' ? THEME.red : vote === 'YES' ? THEME.green : THEME.amber
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 1,
        padding: '3px 7px',
        borderRadius: 5,
        background: `${color}1f`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {vote === '…' ? 'VOTING…' : `VOTED ${vote}`}
    </span>
  )
}

export default function ProposalsPanel({ proposals }: { proposals: Proposal[] }) {
  return (
    <Card>
      <SectionLabel right={`${proposals.length}`}>GOVERNANCE — castVote VIA ERC-7710</SectionLabel>
      <div className="font-mono" style={{ fontSize: 9, color: THEME.textFaint, marginTop: 5, lineHeight: 1.5 }}>
        account authority (ERC-7710) — not ERC20Votes vote-delegation
      </div>

      <div className="flex flex-col" style={{ marginTop: 8 }}>
        {proposals.length === 0 ? (
          <div className="font-mono" style={{ fontSize: 10, color: THEME.textFaint, padding: '16px 0', textAlign: 'center' }}>
            No proposals yet. Run the ⚖ Proposal Vote beat.
          </div>
        ) : (
          proposals.map((p) => {
            const color = p.vote === 'NO' ? THEME.red : p.vote === 'YES' ? THEME.green : THEME.amber
            return (
              <div
                key={p.id}
                className="animate-fade-up"
                style={{ padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono" style={{ fontSize: 9, fontWeight: 600, color: THEME.textMuted }}>{p.id}</span>
                    <VoteBadge vote={p.vote} />
                  </div>
                  {p.pending ? (
                    <span className="font-mono animate-dot-pulse" style={{ fontSize: 9, color: THEME.amber }}>pending…</span>
                  ) : /^0x[0-9a-fA-F]{64}$/.test(p.hash) ? (
                    <a
                      href={`${BASE_EXPLORER_TX}${p.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 9, color: THEME.cyan, textDecoration: 'none' }}
                    >
                      {p.hash} ↗
                    </a>
                  ) : (
                    <span className="font-mono" style={{ fontSize: 9, color: THEME.textFaint }}>{p.hash} · scenario</span>
                  )}
                </div>
                <div style={{ marginTop: 5, fontSize: 12.5, color: THEME.textSoft }}>{p.title}</div>
                <div className="font-mono" style={{ marginTop: 3, fontSize: 9, color: THEME.textFaint }}>{p.rule}</div>
                {/* tally bar */}
                <div className="flex items-center gap-2" style={{ marginTop: 7 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ width: `${p.forPct}%`, height: 4, borderRadius: 2, background: color, transition: 'width 0.6s ease' }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 8.5, color: THEME.textFaint }}>{p.forPct}% FOR</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
