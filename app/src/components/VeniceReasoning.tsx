'use client'

import { useEffect, useRef, useState } from 'react'
import { THEME, ROLE_COLOR } from '@/lib/constants'
import { Card, SectionLabel } from './ui'

interface VeniceReasoningProps {
  actor: string | null
  text: string
  /** changes whenever a new trace arrives, to retrigger the typewriter */
  traceId: number
}

export default function VeniceReasoning({ actor, text, traceId }: VeniceReasoningProps) {
  const [shown, setShown] = useState('')
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (ivRef.current) clearInterval(ivRef.current)
    if (!text) {
      setShown('')
      return
    }
    let i = 0
    setShown('')
    ivRef.current = setInterval(() => {
      i = Math.min(text.length, i + 3)
      setShown(text.slice(0, i))
      if (i >= text.length && ivRef.current) clearInterval(ivRef.current)
    }, 30)
    return () => {
      if (ivRef.current) clearInterval(ivRef.current)
    }
  }, [text, traceId])

  const accent = actor ? ROLE_COLOR[actor] ?? THEME.venice : THEME.venice

  return (
    <Card>
      <SectionLabel right="ZERO-RETENTION">VENICE REASONING</SectionLabel>

      <div className="flex items-center gap-2" style={{ marginTop: 11 }}>
        <span
          className="font-mono"
          style={{
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: 1,
            padding: '3px 6px',
            borderRadius: 4,
            background: `${accent}1f`,
            color: accent,
          }}
        >
          {(actor ?? 'idle').toUpperCase()}
        </span>
        <span className="font-mono" style={{ fontSize: 9, color: THEME.textFaint }}>
          venice · llama-3.3-70b · trace on
        </span>
      </div>

      <div
        className="font-mono"
        style={{
          marginTop: 11,
          minHeight: 120,
          fontSize: 11,
          lineHeight: 1.75,
          color: THEME.venice,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {shown || (
          <span style={{ color: THEME.textFaint }}>
            Waiting for the Governor to reason… reasoning traces stream here before
            any high-stakes action.
          </span>
        )}
        {shown && (
          <span
            className="animate-caret"
            style={{
              display: 'inline-block',
              width: 7,
              height: 13,
              background: THEME.venice,
              marginLeft: 3,
              verticalAlign: -2,
            }}
          />
        )}
      </div>
    </Card>
  )
}
