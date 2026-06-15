'use client'

import type { ParsedRules, HardConstraint } from '@/lib/types'
import { THEME } from '@/lib/constants'
import { Card, SectionLabel, Pill } from './ui'

// Map a parsed hard-constraint type to the on-chain caveat enforcer it becomes
const ENFORCER: Record<HardConstraint['type'], string> = {
  budget: 'erc20PeriodTransfer',
  perTxCap: 'spendLimit',
  allowedTargets: 'allowedTargets',
  timeWindow: 'timestamp',
  blockedActions: 'argsEqualityCheck',
}

function quoteFromConstraint(c: HardConstraint): string {
  // Prefer a clean human sentence; fall back to the description
  return c.description.replace(/\s*\([^)]*\)\s*$/, '')
}

function Rule({
  quote,
  tone,
  tag,
  last,
}: {
  quote: string
  tone: 'hard' | 'soft'
  tag: string
  last?: boolean
}) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingBottom: last ? 0 : 12,
        borderBottom: last ? 'none' : `1px solid rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="font-display"
        style={{ fontStyle: 'italic', fontSize: 15, color: THEME.textSoft, lineHeight: 1.35 }}
      >
        “{quote}”
      </div>
      <div className="flex gap-1.5 flex-wrap" style={{ marginTop: 7 }}>
        <Pill tone={tone}>{tone === 'hard' ? 'HARD · ON-CHAIN' : 'SOFT · REASONED'}</Pill>
        <Pill tone="neutral">{tag}</Pill>
      </div>
    </div>
  )
}

export default function OpinionsPanel({ rules }: { rules: ParsedRules | null }) {
  const hard = rules?.hardConstraints ?? []
  const soft = rules?.softPreferences ?? []
  const total = hard.length + soft.length

  return (
    <Card>
      <SectionLabel right={total || undefined}>OPINIONS — YOUR RULES</SectionLabel>

      {total === 0 ? (
        <div
          className="font-mono"
          style={{ marginTop: 14, fontSize: 10, color: THEME.textFaint, lineHeight: 1.6 }}
        >
          No opinions set yet. Define rules at onboarding — they split into
          on-chain caveats and reasoning guidance.
        </div>
      ) : (
        <>
          {hard.map((c, i) => (
            <Rule
              key={`h-${i}`}
              quote={quoteFromConstraint(c)}
              tone="hard"
              tag={ENFORCER[c.type] ?? c.type}
            />
          ))}
          {soft.map((p, i) => (
            <Rule
              key={`s-${i}`}
              quote={p}
              tone="soft"
              tag="governor prompt"
              last={i === soft.length - 1}
            />
          ))}
        </>
      )}
    </Card>
  )
}
