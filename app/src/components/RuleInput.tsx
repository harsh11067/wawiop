'use client'

import { useState } from 'react'
import type { ParsedRules } from '@/lib/types'
import { THEME } from '@/lib/constants'
import { Pill } from './ui'

interface RuleInputProps {
  onRulesParsed: (rules: ParsedRules, rawRules: string) => void
  isLoading?: boolean
}

const DEFAULT_RULES = `Never spend more than $10 a week.
No single action over $5.
Only pay services on my allowlist.
Prefer free sources before paid ones.
Be skeptical of anything promising yield above 8%.`

export default function RuleInput({ onRulesParsed, isLoading }: RuleInputProps) {
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [parsing, setParsing] = useState(false)
  const [parsedRules, setParsedRules] = useState<ParsedRules | null>(null)

  const handleParse = async () => {
    setParsing(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-rules', rules }),
      })
      const data = await res.json()
      if (data.parsedRules) {
        setParsedRules(data.parsedRules)
        onRulesParsed(data.parsedRules, rules)
      }
    } catch (err) {
      console.error('Failed to parse rules:', err)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        className="w-full font-display"
        style={{
          fontStyle: 'italic',
          fontSize: 16,
          lineHeight: 1.5,
          color: THEME.textSoft,
          background: THEME.bgNode,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: 16,
          minHeight: 140,
          resize: 'none',
          outline: 'none',
        }}
        placeholder="Type your rules in plain English…"
      />

      <button
        onClick={handleParse}
        disabled={parsing || isLoading || !rules.trim()}
        className="font-mono"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          padding: '13px',
          borderRadius: 10,
          border: 'none',
          cursor: parsing ? 'default' : 'pointer',
          background: parsing ? THEME.bgNode : THEME.amber,
          color: parsing ? THEME.textFaint : '#0B0708',
          opacity: !rules.trim() ? 0.5 : 1,
        }}
      >
        {parsing ? 'VENICE AI IS PARSING…' : 'PARSE RULES WITH VENICE AI'}
      </button>

      {parsedRules && (
        <div className="flex flex-col gap-3 animate-fade-up">
          <div>
            <div className="mono-label" style={{ color: THEME.cyan, letterSpacing: 1.8 }}>
              ENFORCED ON-CHAIN — CAVEATS
            </div>
            <div className="flex flex-col gap-1.5" style={{ marginTop: 8 }}>
              {parsedRules.hardConstraints.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2"
                  style={{ background: 'rgba(98,217,232,0.06)', borderRadius: 8, padding: '8px 10px' }}
                >
                  <span style={{ fontSize: 12, color: THEME.textSoft }}>{c.description}</span>
                  <Pill tone="hard">{c.type}</Pill>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mono-label" style={{ color: THEME.amber, letterSpacing: 1.8 }}>
              REASONED — GOVERNOR GUIDANCE
            </div>
            <div className="flex flex-col gap-1.5" style={{ marginTop: 8 }}>
              {parsedRules.softPreferences.map((p, i) => (
                <div
                  key={i}
                  style={{ fontSize: 12, color: THEME.textMuted, background: 'rgba(242,181,68,0.05)', borderRadius: 8, padding: '8px 10px' }}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
