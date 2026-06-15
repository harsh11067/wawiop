import type { AgentRole } from './types'
import { THEME } from './constants'

// Absolute layout coordinates (within a 660×704 canvas) — ported from the
// dashboard mockup so the chain reads exactly like the design.
export const CANVAS = { w: 660, h: 704 }

export const NODE_POS: Record<AgentRole | 'risk', { x: number; y: number; w: number; h: number }> = {
  user: { x: 190, y: 24, w: 280, h: 104 },
  governor: { x: 190, y: 192, w: 280, h: 132 },
  researcher: { x: 40, y: 400, w: 280, h: 124 },
  summarizer: { x: 40, y: 584, w: 280, h: 108 },
  risk: { x: 380, y: 400, w: 240, h: 100 },
}

// Bezier/line paths connecting the nodes (used for both the static edges and the
// animated authority "pulses" that travel along them).
export const PATHS = {
  ug: 'M330,128 L330,192',
  gr: 'M330,324 C330,364 180,358 180,400',
  gx: 'M330,324 C330,360 500,356 500,400',
  rs: 'M180,524 L180,584',
} as const

export const END_DOTS: [number, number][] = [
  [330, 128], [330, 192], [330, 324], [180, 400], [180, 524], [180, 584], [500, 400],
]

export const EDGE_LABELS: { left: number; top: number; lines: string[] }[] = [
  { left: 344, top: 146, lines: ['ERC-7710 DELEGATION', 'rules + budget as caveats'] },
  { left: 248, top: 348, lines: ['REDELEGATION', 'scope ⊂ parent'] },
  { left: 96, top: 538, lines: ['REDELEGATION · text-only · $0'] },
]

export interface RoleMeta {
  color: string
  marker: string
  tag: string
  descriptor: string
  scope: string[]
  authority: number // visual attenuation (real caps live in the pills + detail)
}

export const ROLE_META: Record<AgentRole, RoleMeta> = {
  user: {
    color: THEME.user,
    marker: '●',
    tag: 'ROOT',
    descriptor: 'EIP-7702 ✓ · holds 120 USDC',
    scope: ['upgraded via 1Shot', 'delegates ↓ once'],
    authority: 100,
  },
  governor: {
    color: THEME.red,
    marker: '◆',
    tag: 'EXECUTIVE',
    descriptor: 'reasons via Venice · acts via 1Shot',
    scope: ['≤ $10 / wk', '≤ $5 / action', 'allowlist'],
    authority: 64,
  },
  researcher: {
    color: THEME.cyan,
    marker: '◇',
    tag: '',
    descriptor: 'pays for data via x402',
    scope: ['read + web', '≤ $0.05 / call', 'redelegates ↓'],
    authority: 28,
  },
  summarizer: {
    color: THEME.amber,
    marker: '◈',
    tag: 'LEAF',
    descriptor: 'text in → ≤ 500 tokens out',
    scope: ['text-only', '$0 budget', 'depth 2 — leaf'],
    authority: 8,
  },
}

// Status text shown on each node, by role + raw status
export function nodeStatusLabel(role: AgentRole, status: string): string {
  if (status === 'revoked') return role === 'user' ? 'AUTHORITY RECLAIMED' : role === 'governor' ? 'REVOKED' : 'CHAIN DEAD'
  if (status === 'idle') return role === 'user' ? 'HOLDING BUDGET' : role === 'governor' ? 'MONITORING' : 'IDLE'
  if (status === 'active') return 'ACTIVE'
  if (status === 'completed') return 'DONE'
  if (status === 'error') return 'ERROR'
  return status.toUpperCase()
}

export type CaveatKind = 'HARD' | 'SOFT' | 'CHAIN' | 'ROOT'

export const CAVEAT_COLOR: Record<CaveatKind, string> = {
  HARD: THEME.cyan,
  SOFT: THEME.amber,
  CHAIN: THEME.amber,
  ROOT: THEME.textSoft,
}

export interface DelegationInfo {
  name: string
  parent: string
  scope: string
  budget: string
  checks: string[]
  caveats: { kind: CaveatKind; t: string }[]
}

// Full delegation detail surfaced when a node is selected — the caveats are the
// exact enforcers that run on-chain at redemption.
export function delegationInfo(role: AgentRole, remainingUsd: number): DelegationInfo {
  const rem = remainingUsd.toFixed(2)
  switch (role) {
    case 'user':
      return {
        name: 'USER SA',
        parent: '— root of trust',
        scope: 'full account authority',
        budget: '120 USDC held',
        checks: [
          'EIP-7702 upgrade relayed by 1Shot',
          'issued root delegation → Governor',
          'can revoke → entire subtree dies (cascade)',
        ],
        caveats: [
          { kind: 'ROOT', t: 'no caveats — you are the source of authority' },
          { kind: 'HARD', t: 'delegation to Governor carries all your rules' },
        ],
      }
    case 'governor':
      return {
        name: 'GOVERNOR',
        parent: 'USER SA (root delegation)',
        scope: 'transfer · castVote · x402 · spawn sub-agents',
        budget: `10.00 / wk · ${rem} remaining`,
        checks: [
          'delegation signed by USER SA',
          'redeems via DelegationManager.redeemDelegations',
        ],
        caveats: [
          { kind: 'HARD', t: 'erc20PeriodTransfer · ≤ 10 USDC / 7 days' },
          { kind: 'HARD', t: 'spendLimit · ≤ 5 USDC per action' },
          { kind: 'HARD', t: 'allowedTargets · [aerodrome, dexmetrics, venice-x402]' },
          { kind: 'HARD', t: 'timestamp · inside the 7-day window' },
          { kind: 'SOFT', t: '“prefer free sources first” → system prompt' },
          { kind: 'CHAIN', t: 'may redelegate — strictly narrower only' },
        ],
      }
    case 'researcher':
      return {
        name: 'RESEARCHER',
        parent: 'GOVERNOR SA (redelegation)',
        scope: 'read + web fetch · x402 pay',
        budget: '≤ 20% of parent remaining',
        checks: [
          'chain [root → governor → researcher] verified',
          'child ⊂ parent at every hop',
        ],
        caveats: [
          { kind: 'HARD', t: 'allowedMethods · [httpGet, x402Pay]' },
          { kind: 'HARD', t: 'budget slice · ≤ 20% of parent remaining' },
          { kind: 'HARD', t: 'allowedTargets ⊂ parent allowlist' },
          { kind: 'CHAIN', t: 'may redelegate text-only · one hop max' },
        ],
      }
    case 'summarizer':
      return {
        name: 'SUMMARIZER',
        parent: 'RESEARCHER SA (redelegation)',
        scope: 'text in → text out',
        budget: '0 USDC',
        checks: [
          'chain [root → gov → res → sum] redeemable',
          'cannot exceed any ancestor — enforced',
        ],
        caveats: [
          { kind: 'HARD', t: 'no spend — budget 0' },
          { kind: 'HARD', t: 'no external calls — text-only' },
          { kind: 'CHAIN', t: 'leaf — cannot redelegate (depth 2)' },
        ],
      }
  }
}
