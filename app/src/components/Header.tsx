'use client'

import type { Address } from 'viem'
import { THEME, ACTIVE_CHAIN } from '@/lib/constants'
import { short } from './ui'

interface HeaderProps {
  walletAddress?: Address
  budget: number
  spent: number
  isConnected: boolean
  relayerOperational?: boolean
  isTestnet?: boolean
  veniceStatus?: string
}

function StatusChip({
  dotColor,
  pulse,
  children,
  border = THEME.border,
  color = THEME.textMuted,
  bg,
}: {
  dotColor?: string
  pulse?: boolean
  children: React.ReactNode
  border?: string
  color?: string
  bg?: string
}) {
  return (
    <div
      className="flex items-center gap-1.5 font-mono"
      style={{
        fontSize: 10,
        fontWeight: 500,
        color,
        padding: '8px 11px',
        border: `1px solid ${border}`,
        borderRadius: 8,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {dotColor && (
        <span
          className={pulse ? 'animate-dot-pulse' : ''}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            display: 'inline-block',
            boxShadow: pulse ? `0 0 8px ${dotColor}` : 'none',
          }}
        />
      )}
      {children}
    </div>
  )
}

export default function Header({
  walletAddress,
  budget,
  spent,
  isConnected,
  relayerOperational = true,
  isTestnet = true,
  veniceStatus = 'unknown',
}: HeaderProps) {
  const remaining = (budget - spent).toFixed(2)
  const venice = (() => {
    switch (veniceStatus) {
      case 'live': return { label: 'VENICE · LIVE', color: THEME.green, dot: THEME.green }
      case 'no-credits': return { label: 'VENICE · NO CREDITS', color: THEME.amber, dot: THEME.amber }
      case 'no-key': return { label: 'VENICE · NO KEY', color: THEME.red, dot: THEME.red }
      case 'fallback': return { label: 'VENICE · FALLBACK', color: THEME.amber, dot: THEME.amber }
      default: return { label: 'VENICE · READY', color: THEME.textMuted, dot: THEME.venice }
    }
  })()

  return (
    <header
      className="flex items-center justify-between gap-4"
      style={{ padding: '14px 26px', borderBottom: `1px solid ${THEME.border}` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="font-display flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: `1px solid rgba(240,88,74,0.55)`,
            background: 'linear-gradient(140deg, rgba(240,88,74,0.2), rgba(240,88,74,0.02))',
            color: THEME.red,
            fontStyle: 'italic',
            fontSize: 22,
            paddingBottom: 6,
            boxSizing: 'border-box',
          }}
        >
          ”
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 20, letterSpacing: 0.3, lineHeight: 1 }}>
            Wallet with Opinions
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2.6, color: THEME.textFaint, marginTop: 5 }}
          >
            AGENTIC COMMAND CENTER
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap justify-end">
        <StatusChip dotColor={isConnected ? THEME.baseBlue : THEME.red}>
          {ACTIVE_CHAIN.name.toUpperCase()} · {ACTIVE_CHAIN.id}
        </StatusChip>
        <StatusChip dotColor={THEME.cyan} pulse>
          {isTestnet ? 'DELEGATION MANAGER · LIVE' : '1SHOT RELAYER · OPERATIONAL'}
        </StatusChip>
        <StatusChip dotColor={venice.dot} color={venice.color} pulse={veniceStatus === 'live'}>
          {venice.label}
        </StatusChip>
        <StatusChip
          color={THEME.amber}
          border="rgba(242,181,68,0.3)"
          bg="rgba(242,181,68,0.05)"
        >
          {remaining} / {budget.toFixed(2)} USDC · WK
        </StatusChip>
        {walletAddress && <StatusChip color={THEME.textSoft}>{short(walletAddress, 6, 4)}</StatusChip>}
      </div>
    </header>
  )
}
