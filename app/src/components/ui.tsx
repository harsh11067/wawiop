'use client'

import type { CSSProperties, ReactNode } from 'react'
import { THEME } from '@/lib/constants'

/**
 * Shared design primitives that encode the dashboard mockup's visual language
 * (dashboard/Command Center.dc.html). Cards, mono micro-labels, telemetry pills,
 * status dots, and authority bars are reused across every panel.
 */

export function Card({
  children,
  style,
  className = '',
  accent,
}: {
  children: ReactNode
  style?: CSSProperties
  className?: string
  accent?: string
}) {
  return (
    <div
      className={`rounded-[14px] ${className}`}
      style={{
        background: THEME.bgCard,
        border: `1px solid ${accent ?? THEME.border}`,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({
  children,
  right,
  marker = '◆',
}: {
  children: ReactNode
  right?: ReactNode
  marker?: string | null
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="mono-label">
        {marker ? `${marker} ` : ''}
        {children}
      </div>
      {right != null && (
        <div className="font-mono" style={{ fontSize: 9, color: THEME.textFaint }}>
          {right}
        </div>
      )}
    </div>
  )
}

type PillTone = 'hard' | 'soft' | 'neutral' | 'live'

export function Pill({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode
  tone?: PillTone
  style?: CSSProperties
}) {
  const tones: Record<PillTone, CSSProperties> = {
    hard: { background: 'rgba(98,217,232,0.12)', color: THEME.cyan, letterSpacing: 1 },
    soft: { background: 'rgba(242,181,68,0.12)', color: THEME.amber, letterSpacing: 1 },
    live: { background: 'rgba(74,222,128,0.12)', color: THEME.green, letterSpacing: 1 },
    neutral: { border: `1px solid ${THEME.borderStrong}`, color: THEME.textMuted },
  }
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 8.5,
        fontWeight: 500,
        lineHeight: 1,
        padding: '3px 6px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

const TONE_COLOR: Record<string, string> = {
  idle: '#6E6A60',
  active: '#62D9E8',
  pending: '#F2B544',
  completed: '#4ADE80',
  error: '#F0584A',
  revoked: '#F0584A',
}

export function StatusDot({ status, glow = true }: { status: string; glow?: boolean }) {
  const color = TONE_COLOR[status] ?? '#6E6A60'
  const animate = status === 'active' || status === 'pending'
  return (
    <span
      className={animate ? 'animate-dot-pulse' : ''}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        boxShadow: glow && animate ? `0 0 8px ${color}` : 'none',
      }}
    />
  )
}

export function AuthorityBar({
  percent,
  color,
  label = true,
}: {
  percent: number
  color: string
  label?: boolean
}) {
  const pct = Math.max(0, Math.min(100, percent))
  return (
    <div className="flex items-center gap-2">
      <div
        style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${color}, ${color}55)`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      {label && (
        <span
          className="font-mono"
          style={{ fontSize: 8.5, fontWeight: 600, color: THEME.textFaint, whiteSpace: 'nowrap' }}
        >
          {Math.round(pct)}% AUTHORITY
        </span>
      )}
    </div>
  )
}

/** Shorten an 0x address for display */
export function short(addr?: string, head = 6, tail = 4): string {
  if (!addr) return '—'
  if (addr.length <= head + tail + 2) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}
