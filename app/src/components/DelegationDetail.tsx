'use client'

import type { AgentRole } from '@/lib/types'
import { THEME } from '@/lib/constants'
import { delegationInfo, CAVEAT_COLOR } from '@/lib/chainMeta'
import { Card } from './ui'

interface Props {
  role: AgentRole
  remainingUsd: number
  onClose: () => void
}

export default function DelegationDetail({ role, remainingUsd, onClose }: Props) {
  const info = delegationInfo(role, remainingUsd)

  return (
    <Card accent="rgba(242,181,68,0.22)" className="animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="mono-label">◆ DELEGATION DETAIL — {info.name}</div>
        <button
          onClick={onClose}
          className="font-mono"
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 1,
            color: THEME.textFaint,
            padding: '5px 9px',
            border: `1px solid ${THEME.border}`,
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5" style={{ marginTop: 13 }}>
        <div className="flex flex-col gap-2">
          {[
            ['ACCOUNT', info.name],
            ['PARENT', info.parent],
            ['SCOPE', info.scope],
          ].map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
          <Row k="BUDGET" v={info.budget} valueColor={THEME.amber} />
          <div className="flex flex-col gap-1.5" style={{ marginTop: 6 }}>
            {info.checks.map((c, i) => (
              <div key={i} className="font-mono" style={{ fontSize: 9.5, lineHeight: 1.5, color: THEME.venice }}>
                <span style={{ color: THEME.cyan }}>✓</span> {c}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.8, color: THEME.textFaint }}>
            CAVEATS AT REDEMPTION
          </div>
          <div className="flex flex-col gap-2" style={{ marginTop: 9 }}>
            {info.caveats.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span
                  className="font-mono"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 600,
                    letterSpacing: 0.8,
                    padding: '3px 6px',
                    borderRadius: 4,
                    background: `${CAVEAT_COLOR[c.kind]}1f`,
                    color: CAVEAT_COLOR[c.kind],
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.kind}
                </span>
                <span className="font-mono" style={{ fontSize: 10, lineHeight: 1.4, color: THEME.textSoft }}>
                  {c.t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function Row({ k, v, valueColor = THEME.textSoft }: { k: string; v: string; valueColor?: string }) {
  return (
    <div className="flex justify-between font-mono" style={{ fontSize: 10, lineHeight: 1.4 }}>
      <span style={{ color: THEME.textFaint }}>{k}</span>
      <span style={{ color: valueColor, textAlign: 'right' }}>{v}</span>
    </div>
  )
}
