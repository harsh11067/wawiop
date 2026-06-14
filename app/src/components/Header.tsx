'use client'

import type { Address } from 'viem'
import { THEME, ACTIVE_CHAIN } from '@/lib/constants'

interface HeaderProps {
  walletAddress?: Address
  budget: number
  spent: number
  isConnected: boolean
}

export default function Header({ walletAddress, budget, spent, isConnected }: HeaderProps) {
  const remaining = budget - spent
  const chainName = ACTIVE_CHAIN.name

  return (
    <header
      className="border-b px-6 py-3 flex items-center justify-between"
      style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="text-lg tracking-tight"
          style={{
            color: THEME.text,
            fontFamily: "'Instrument Serif', Georgia, serif",
          }}
        >
          Wallet with Opinions
        </h1>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: THEME.textMuted }}>
          Vectis
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Network indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isConnected ? THEME.green : THEME.red }}
          />
          <span className="text-xs" style={{ color: THEME.textMuted }}>
            {chainName}
          </span>
        </div>

        {/* Budget */}
        <div className="text-xs">
          <span style={{ color: THEME.textMuted }}>Budget: </span>
          <span style={{ color: remaining > 2 ? THEME.green : remaining > 0 ? THEME.amber : THEME.red }}>
            ${remaining.toFixed(2)}
          </span>
          <span style={{ color: THEME.textMuted }}> / ${budget.toFixed(2)}</span>
        </div>

        {/* Wallet */}
        {walletAddress && (
          <div
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ backgroundColor: THEME.border, color: THEME.text }}
          >
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        )}
      </div>
    </header>
  )
}
