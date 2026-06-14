'use client'

import { useState } from 'react'
import type { ParsedRules } from '@/lib/types'
import { THEME } from '@/lib/constants'

interface RuleInputProps {
  onRulesParsed: (rules: ParsedRules, rawRules: string) => void
  isLoading?: boolean
}

const DEFAULT_RULES = `Research topics I approve. Max $2/week on data.
Never act without my ClearSign on transactions above $0.50.
Focus on Base ecosystem projects and grant activity.
Prefer conservative spending — only pay for data when the task requires it.`

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-2" style={{ color: THEME.text }}>
          Give your wallet opinions
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="w-full rounded-lg p-4 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{
            backgroundColor: THEME.bg,
            color: THEME.text,
            borderColor: THEME.border,
            border: `1px solid ${THEME.border}`,
            minHeight: 120,
          }}
          placeholder="Type your rules in plain English..."
        />
      </div>

      <button
        onClick={handleParse}
        disabled={parsing || isLoading || !rules.trim()}
        className="w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          backgroundColor: parsing ? THEME.bgCard : THEME.amber,
          color: THEME.bg,
        }}
      >
        {parsing ? 'Venice AI is parsing your rules...' : 'Parse Rules with Venice AI'}
      </button>

      {/* Show parsed rules split */}
      {parsedRules && (
        <div className="space-y-3">
          {/* Hard constraints (green) */}
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: THEME.green }}>
              Hard Constraints (on-chain caveats)
            </div>
            <div className="space-y-1">
              {parsedRules.hardConstraints.map((c, i) => (
                <div
                  key={i}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ backgroundColor: `${THEME.green}15`, color: THEME.green }}
                >
                  {c.type}: {c.description} ({JSON.stringify(c.value)})
                </div>
              ))}
            </div>
          </div>

          {/* Soft preferences (grey) */}
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: THEME.textMuted }}>
              Soft Preferences (reasoning guidance)
            </div>
            <div className="space-y-1">
              {parsedRules.softPreferences.map((p, i) => (
                <div
                  key={i}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ backgroundColor: `${THEME.textMuted}15`, color: THEME.textMuted }}
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
