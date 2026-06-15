'use client'

import { THEME } from '@/lib/constants'
import { Card, SectionLabel } from './ui'

interface BudgetPanelProps {
  budget: number
  spent: number
  perActionCap?: number
  x402Count: number
  txCount: number
  resetsIn?: string
}

function Ring({ remaining, budget }: { remaining: number; budget: number }) {
  const size = 104
  const stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = budget > 0 ? Math.max(0, Math.min(1, remaining / budget)) : 0
  const color = pct > 0.3 ? THEME.amber : pct > 0.1 ? '#F2B544' : THEME.red

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: THEME.amber }}>
          {remaining.toFixed(2)}
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 7.5, fontWeight: 500, letterSpacing: 1.6, color: THEME.textFaint, marginTop: 5 }}
        >
          USDC LEFT
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color = THEME.textSoft }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between font-mono" style={{ fontSize: 9.5, fontWeight: 500 }}>
      <span style={{ color: THEME.textFaint }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}

export default function BudgetPanel({
  budget,
  spent,
  perActionCap = 5,
  x402Count,
  txCount,
  resetsIn = '2D 14H',
}: BudgetPanelProps) {
  const remaining = Math.max(0, budget - spent)
  return (
    <Card>
      <SectionLabel>BUDGET — DELEGATED ALLOWANCE</SectionLabel>
      <div className="flex items-center gap-4" style={{ marginTop: 14 }}>
        <Ring remaining={remaining} budget={budget} />
        <div className="flex-1 flex flex-col gap-2.5">
          <Stat label="SPENT THIS WEEK" value={spent.toFixed(2)} />
          <Stat label="PER-ACTION CAP" value={perActionCap.toFixed(2)} />
          <Stat label="RESETS IN" value={resetsIn} />
          <Stat label="x402 CALLS" value={String(x402Count)} color={THEME.cyan} />
          <Stat label="RELAYED TX" value={String(txCount)} color={THEME.cyan} />
        </div>
      </div>
    </Card>
  )
}
