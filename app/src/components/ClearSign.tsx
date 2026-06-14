'use client'

import { useState, useEffect } from 'react'
import type { ClearSignRequest } from '@/lib/types'
import { THEME } from '@/lib/constants'

interface ClearSignProps {
  request: ClearSignRequest | null
  onRespond: (response: 'proceed' | 'reject') => void
}

export default function ClearSign({ request, onRespond }: ClearSignProps) {
  const [displayedThink, setDisplayedThink] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Typewriter effect for the thinking trace
  useEffect(() => {
    if (!request) {
      setDisplayedThink('')
      setIsTyping(false)
      return
    }

    const thinkText = request.reasoning.thinkTrace || request.reasoning.reasoning
    setDisplayedThink('')
    setIsTyping(true)
    let i = 0

    const interval = setInterval(() => {
      if (i < thinkText.length) {
        setDisplayedThink(thinkText.slice(0, i + 1))
        i++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [request])

  if (!request) {
    return (
      <div
        className="rounded-xl border p-4 h-full flex items-center justify-center"
        style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
      >
        <div className="text-center" style={{ color: THEME.textMuted }}>
          <div className="text-2xl mb-2">🛡</div>
          <div className="text-sm">ClearSign</div>
          <div className="text-xs mt-1">Waiting for high-stakes action...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-4 h-full overflow-auto"
      style={{
        backgroundColor: THEME.bgCard,
        borderColor: THEME.amber,
        borderWidth: 2,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡</span>
          <span className="font-semibold text-sm" style={{ color: THEME.amber }}>
            ClearSign Required
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: `${THEME.amber}20`, color: THEME.amber }}
        >
          {request.reasoning.decision.toUpperCase()}
        </span>
      </div>

      {/* Action description */}
      <div className="mb-3">
        <div className="text-xs mb-1" style={{ color: THEME.textMuted }}>About to:</div>
        <div className="text-sm font-medium" style={{ color: THEME.text }}>
          {request.action}
        </div>
      </div>

      {/* Venice reasoning trace */}
      <div className="mb-3">
        <div className="text-xs mb-1" style={{ color: THEME.textMuted }}>Venice reasoning:</div>
        <div
          className="rounded-lg p-3 text-xs font-mono leading-relaxed max-h-32 overflow-auto"
          style={{ backgroundColor: THEME.bg, color: THEME.text }}
        >
          <span style={{ color: THEME.cyan }}>&lt;think&gt;</span>
          <br />
          {displayedThink}
          {isTyping && <span className="animate-pulse" style={{ color: THEME.cyan }}>▊</span>}
          <br />
          <span style={{ color: THEME.cyan }}>&lt;/think&gt;</span>
        </div>
      </div>

      {/* Plain English explanation */}
      <div className="mb-3 text-sm" style={{ color: THEME.text }}>
        {request.description}
      </div>

      {/* Cost and budget */}
      <div className="flex justify-between mb-4 text-xs">
        <div>
          <span style={{ color: THEME.textMuted }}>Cost: </span>
          <span style={{ color: THEME.amber }}>${request.cost.toFixed(4)}</span>
        </div>
        <div>
          <span style={{ color: THEME.textMuted }}>Budget left: </span>
          <span style={{ color: THEME.green }}>${request.budgetRemaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onRespond('proceed')}
          className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: THEME.green,
            color: THEME.bg,
          }}
        >
          Proceed
        </button>
        <button
          onClick={() => onRespond('reject')}
          className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: THEME.red,
            border: `1px solid ${THEME.red}`,
          }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
