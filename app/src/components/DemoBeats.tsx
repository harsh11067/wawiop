'use client'

import { THEME } from '@/lib/constants'

interface Props {
  killed: boolean
  busy: boolean
  onVote: () => void
  onUnsafe: () => void
  onKill: () => void
}

function Beat({
  label,
  hoverColor,
  onClick,
  disabled,
  variant = 'ghost',
  active,
}: {
  label: string
  hoverColor: string
  onClick: () => void
  disabled?: boolean
  variant?: 'ghost' | 'kill'
  active?: boolean
}) {
  const base: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.6,
    padding: '8px 11px',
    borderRadius: 8,
    cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    opacity: disabled ? 0.45 : 1,
    userSelect: 'none',
  }
  const style: React.CSSProperties =
    variant === 'kill'
      ? {
          ...base,
          color: active ? THEME.red : THEME.cyan,
          border: `1px solid ${active ? 'rgba(240,88,74,0.4)' : 'rgba(98,217,232,0.25)'}`,
          background: active ? 'rgba(240,88,74,0.06)' : 'rgba(98,217,232,0.04)',
        }
      : {
          ...base,
          color: THEME.textMuted,
          border: `1px solid ${THEME.borderStrong}`,
          background: 'transparent',
        }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono beat-btn"
      style={style}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = hoverColor
          e.currentTarget.style.color = hoverColor
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = style.border as string
        e.currentTarget.style.color = style.color as string
      }}
    >
      {label}
    </button>
  )
}

export default function DemoBeats({ killed, busy, onVote, onUnsafe, onKill }: Props) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div
        className="font-mono"
        style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2.6, color: THEME.textFaint }}
      >
        DEMO BEATS — ONE CLAIM, ONE CLICK
      </div>
      <div className="flex gap-2">
        <Beat label="⚖ PROPOSAL VOTE" hoverColor={THEME.amber} onClick={onVote} disabled={busy || killed} />
        <Beat label="⛔ UNSAFE ACTION" hoverColor={THEME.red} onClick={onUnsafe} disabled={busy || killed} />
        <Beat
          label={killed ? '⏻ RESTORE ROOT' : '⏻ KILL SWITCH'}
          hoverColor={THEME.red}
          onClick={onKill}
          disabled={busy && !killed}
          variant="kill"
          active={killed}
        />
      </div>
    </div>
  )
}
