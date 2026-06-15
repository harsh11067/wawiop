'use client'

import { useMemo } from 'react'
import type { ClearSignRequest } from '@/lib/types'
import { THEME } from '@/lib/constants'

interface ClearSignProps {
  request: ClearSignRequest | null
  onRespond: (response: 'proceed' | 'reject') => void
}

function splitTrace(req: ClearSignRequest): string[] {
  const raw = req.reasoning.thinkTrace || req.reasoning.reasoning || ''
  const cleaned = raw.replace(/<\/?think>/g, '')
  return cleaned
    .split('\n')
    .map((l) => l.replace(/^\s*[-•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 6)
}

export default function ClearSign({ request, onRespond }: ClearSignProps) {
  const enforced = useMemo(() => {
    if (!request) return []
    const cost = request.cost.toFixed(2)
    return [
      `weekly budget — ${cost} ≤ ${request.budgetRemaining.toFixed(2)} remaining (erc20PeriodTransfer)`,
      `per-action cap — ${cost} ≤ 5.00 (spendLimit)`,
      `payee on allowlist (allowedTargets)`,
      `fresh salt · inside time window (timestamp)`,
    ]
  }, [request])

  const soft = useMemo(() => {
    if (!request) return []
    return request.reasoning.rulesCited?.length
      ? request.reasoning.rulesCited.slice(0, 3)
      : ['prefer free sources before paid ones', 'be skeptical of yield above 8%']
  }, [request])

  if (!request) return null

  const trace = splitTrace(request)
  const trigger =
    request.reasoning.decision === 'escalate'
      ? 'ESCALATED · NEEDS YOUR SIGNATURE'
      : 'HIGH-STAKES ACTION · ABOVE THRESHOLD'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-veil-in"
      style={{ background: 'rgba(4,6,10,0.8)', backdropFilter: 'blur(7px)' }}
    >
      <div
        className="animate-cs-in"
        style={{
          width: 740,
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#0B0E15',
          border: '1px solid rgba(242,181,68,0.45)',
          borderRadius: 18,
          padding: '26px 28px',
          boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 70px rgba(242,181,68,0.07)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: '1px solid rgba(242,181,68,0.5)',
                color: THEME.amber,
                fontSize: 15,
              }}
            >
              ⌖
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 22, lineHeight: 1 }}>
                ClearSign
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 8.5, fontWeight: 500, letterSpacing: 2.2, color: THEME.textFaint, marginTop: 5 }}
              >
                WHAT YOU SIGN IS WHAT YOU SEE
              </div>
            </div>
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.8,
              color: THEME.red,
              border: '1px solid rgba(240,88,74,0.35)',
              background: 'rgba(240,88,74,0.07)',
              padding: '7px 10px',
              borderRadius: 7,
              maxWidth: 300,
              textAlign: 'right',
            }}
          >
            {trigger}
          </div>
        </div>

        {/* Title */}
        <div
          className="font-display"
          style={{ marginTop: 18, fontStyle: 'italic', fontSize: 25, lineHeight: 1.3, color: '#EFEAE0', textWrap: 'pretty' }}
        >
          “{request.description || request.action}”
        </div>

        {/* Enforced vs reasoned */}
        <div className="grid grid-cols-2 gap-3.5" style={{ marginTop: 18 }}>
          <div
            style={{ border: '1px solid rgba(98,217,232,0.25)', background: 'rgba(98,217,232,0.04)', borderRadius: 10, padding: '12px 14px' }}
          >
            <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.8, color: THEME.cyan }}>
              ENFORCED ON-CHAIN
            </div>
            {enforced.map((c, i) => (
              <div key={i} className="flex gap-1.5 font-mono" style={{ marginTop: 8, fontSize: 10, lineHeight: 1.5, color: '#B9E6CF' }}>
                <span style={{ color: THEME.cyan }}>✓</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
          <div
            style={{ border: '1px solid rgba(242,181,68,0.22)', background: 'rgba(242,181,68,0.04)', borderRadius: 10, padding: '12px 14px' }}
          >
            <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.8, color: THEME.amber }}>
              REASONED · NOT ON-CHAIN
            </div>
            {soft.map((c, i) => (
              <div key={i} className="flex gap-1.5 font-mono" style={{ marginTop: 8, fontSize: 10, lineHeight: 1.5, color: '#E5D9B6' }}>
                <span style={{ color: THEME.amber }}>↺</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning trace */}
        <div style={{ marginTop: 14, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.8, color: THEME.textMuted }}>
            VENICE REASONING TRACE
          </div>
          {trace.map((r, i) => (
            <div key={i} className="font-mono" style={{ marginTop: 7, fontSize: 10.5, lineHeight: 1.6, color: THEME.venice }}>
              ▸ {r}
            </div>
          ))}
        </div>

        {/* Cost + actions */}
        <div className="flex items-center justify-between gap-3" style={{ marginTop: 16 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
              ${request.cost.toFixed(4)} + relay fee · gasless via 1Shot
            </div>
            <div className="font-mono" style={{ fontSize: 10, lineHeight: 1.6, color: THEME.textFaint }}>
              budget after: {request.budgetRemaining.toFixed(2)} →{' '}
              {(request.budgetRemaining - request.cost).toFixed(2)} USDC remaining this week
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            <button
              onClick={() => onRespond('reject')}
              style={{ fontSize: 11, color: THEME.textMuted, padding: '11px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Reject
            </button>
            <button
              onClick={() => onRespond('reject')}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: THEME.text,
                padding: '11px 16px',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 9,
                background: 'none',
                cursor: 'pointer',
              }}
            >
              Override
            </button>
            <button
              onClick={() => onRespond('proceed')}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#0B0E15',
                padding: '12px 20px',
                background: THEME.amber,
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(242,181,68,0.25)',
              }}
            >
              Proceed — sign once
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
