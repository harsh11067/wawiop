'use client'

import { THEME } from '@/lib/constants'
import { Card, SectionLabel } from './ui'

export interface RelayState {
  active: boolean
  step: number // -1 idle, 0..4
  taskId: string | null
  note: string
  reverted?: boolean
}

const STEPS = ['getCapabilities', 'estimate7710', 'send7710', 'getStatus', 'Confirmed']

export default function RelayLifecycle({ relay }: { relay: RelayState }) {
  return (
    <Card>
      <SectionLabel right={relay.taskId ?? 'idle'}>
        1SHOT RELAY — GASLESS · USDC FEE · JSON-RPC
      </SectionLabel>

      <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 13 }}>
        {STEPS.map((label, i) => {
          const isLast = i === STEPS.length - 1
          const reverted = relay.reverted && relay.step >= 4 && isLast
          const done = relay.step > i || (isLast && relay.step >= 4 && !relay.reverted)
          const current = relay.step === i && relay.active
          const color = reverted ? THEME.red : done ? THEME.green : current ? THEME.cyan : THEME.textFaint
          const bg = reverted
            ? 'rgba(240,88,74,0.1)'
            : done
              ? 'rgba(74,222,128,0.1)'
              : current
                ? 'rgba(98,217,232,0.1)'
                : 'transparent'
          const displayLabel = reverted ? 'Reverted' : label
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`font-mono ${current ? 'animate-dot-pulse' : ''}`}
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color,
                  padding: '6px 9px',
                  border: `1px solid ${reverted || done || current ? color : THEME.border}`,
                  borderRadius: 7,
                  background: bg,
                }}
              >
                {reverted ? '✕ ' : done ? '✓ ' : ''}
                {displayLabel}
              </div>
              {i < STEPS.length - 1 && (
                <span className="font-mono" style={{ fontSize: 10, color: THEME.textGhost }}>
                  →
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div
        className="font-mono"
        style={{ marginTop: 11, fontSize: 9.5, lineHeight: 1.6, color: THEME.textFaint }}
      >
        {relay.note || 'Confirm relayer_getCapabilities before mainnet · nothing hardcoded.'}
      </div>
    </Card>
  )
}
