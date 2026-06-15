import Link from 'next/link'
import HeroCanvas from '@/components/HeroCanvas'
import { THEME } from '@/lib/constants'

const mono = { fontFamily: 'var(--font-mono), monospace' }
const display = { fontFamily: 'var(--font-display), Georgia, serif' }

function Numbered({ n, color }: { n: string; color: string }) {
  return (
    <div
      className="flex items-center justify-center font-mono"
      style={{ width: 36, height: 36, borderRadius: '50%', background: THEME.bgNode, border: `1px solid ${color}99`, color, fontSize: 11, fontWeight: 600, boxShadow: `0 0 26px ${color}3d` }}
    >
      {n}
    </div>
  )
}

const GIVE = [
  {
    marker: '◆',
    color: THEME.amber,
    label: 'OPINIONS — RULES',
    quote: '“Never spend more than $10 a week. Be skeptical of anything promising yield above 8%.”',
    body: ['You write rules once, in plain English. Venice splits them in two: hard limits become ', { t: 'on-chain caveats', c: THEME.cyan }, ' the chain itself enforces; preferences become ', { t: 'reasoning guidance', c: THEME.amber }, ' the agent thinks with.'],
  },
  {
    marker: '◇',
    color: THEME.cyan,
    label: 'MEMORY — THE AUDIT LOG',
    quote: '“I declined that farm at 12:15. Here’s why, and here’s the hash.”',
    body: ['Every action lands in a tamper-evident log — actor, reasoning, cost, tx hash, outcome. When an unsafe action is blocked, the ', { t: 'blocking caveat is named on the record', c: THEME.cyan }, '. The wallet remembers why.'],
  },
  {
    marker: '◈',
    color: THEME.amber,
    label: 'BUDGET — DELEGATED ALLOWANCE',
    quote: '“It spends inside an allowance. It never holds your keys.”',
    body: ['A weekly USDC allowance delegated under ERC-7710. The Governor spends within it; sub-agents get ', { t: 'slices of slices', c: THEME.text }, ' — 20% of remaining, then nothing at all. Settlement is gasless via the 1Shot relayer.'],
  },
]

const PILLARS = [
  { n: '1', color: THEME.amber, title: 'Attenuated redelegation', body: 'Authority only ever shrinks downstream. A child agent can never spend more, reach further, or delegate wider than its parent — the invariant is checked on-chain at redemption, every hop.', cite: 'South & Pentland · arXiv:2501.09674' },
  { n: '2', color: THEME.cyan, title: 'Policy + immutable audit log', body: 'An unsafe action doesn’t get caught by a reviewer — it reverts on-chain, and the attempt is recorded with its reason and the blocking caveat named. Tamper-evident by construction.', cite: 'arXiv:2509.07131 · arXiv:2507.08249' },
  { n: '3', color: THEME.red, title: 'Cascade revocation', body: 'Revoke the root and the entire subtree dies at once. A redemption that worked a minute ago now reverts — the kill switch isn’t a feature bolted on, it’s intrinsic to the chain.', cite: 'arXiv:2507.08249 · kill switches' },
]

const FLOW: [string, string, string][] = [
  ['MONITOR', 'governor', THEME.amber],
  ['REDELEGATE', 'scope ⊂ parent', THEME.cyan],
  ['x402 PAY', '402 → 200', THEME.cyan],
  ['SUMMARIZE', '≤ 500 tokens', THEME.amber],
  ['REASON', 'venice · trace', THEME.amber],
  ['CLEARSIGN', 'if high-stakes', THEME.red],
  ['1SHOT RELAY', 'gasless · webhook', THEME.green],
  ['MEMORY', 'hash + reason', THEME.text],
]

export default function Landing() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* ===== HERO ===== */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <HeroCanvas />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 46%, rgba(11,7,8,0.40), rgba(11,7,8,0.04) 55%, rgba(11,7,8,0.94) 100%)', pointerEvents: 'none' }} />

        {/* top bar */}
        <div className="flex items-center gap-3" style={{ position: 'absolute', top: 24, left: 28, zIndex: 3 }}>
          <div className="flex items-center justify-center" style={{ ...display, width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(240,88,74,0.55)', background: 'rgba(240,88,74,0.09)', color: THEME.red, fontStyle: 'italic', fontSize: 20, paddingBottom: 6, boxSizing: 'border-box' }}>”</div>
          <div style={{ ...display, fontSize: 18 }}>Wallet with Opinions</div>
        </div>
        <div className="flex items-center gap-1.5 font-mono" style={{ position: 'absolute', top: 26, right: 28, zIndex: 3, fontSize: 10, color: THEME.textMuted, padding: '8px 11px', border: `1px solid ${THEME.borderStrong}`, borderRadius: 8, background: THEME.bgNode }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: THEME.baseBlue, display: 'inline-block' }} />
          BASE MAINNET · 8453
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1000, textAlign: 'center', padding: '0 24px' }}>
          <div className="font-mono animate-fade-up" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 4, color: THEME.textFaint }}>
            METAMASK SMART ACCOUNTS × VENICE AI × 1SHOT × BASE MAINNET
          </div>
          <h1 className="animate-fade-up" style={{ ...display, marginTop: 26, fontSize: 82, lineHeight: 1.04, letterSpacing: -0.5, color: '#F0EBE0', textWrap: 'balance' }}>
            The wallet that has <span style={{ fontStyle: 'italic', color: THEME.red }}>something to say.</span>
          </h1>
          <p className="animate-fade-up" style={{ margin: '26px auto 0', maxWidth: 680, fontSize: 16.5, lineHeight: 1.65, color: THEME.textSoft, textWrap: 'pretty' }}>
            Give it opinions, memory, and a budget — it stops being a vault and starts acting for you.
            Authority flows down a cryptographic chain where every link holds{' '}
            <span style={{ color: THEME.text }}>less power than the one above it</span>, enforced on-chain, not by promise.
          </p>
          <div className="flex gap-3 justify-center animate-fade-up" style={{ marginTop: 34 }}>
            <Link href="/command-center" style={{ ...mono, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: '#0B0708', padding: '15px 26px', background: THEME.red, borderRadius: 10, boxShadow: '0 6px 34px rgba(240,88,74,0.36)', textDecoration: 'none' }}>
              ▶ Watch it think
            </Link>
            <Link href="/onboard" style={{ ...mono, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: THEME.text, padding: '15px 26px', border: `1px solid ${THEME.borderStrong}`, borderRadius: 10, textDecoration: 'none' }}>
              Set up your wallet ↓
            </Link>
          </div>
          <div className="flex gap-2 justify-center flex-wrap animate-fade-up" style={{ marginTop: 38 }}>
            {['ERC-7710 · DEPTH-2 REDELEGATION', 'x402 MICRO-PAYMENTS', 'GASLESS · EIP-7702', 'ZERO-RETENTION REASONING'].map((t) => (
              <span key={t} className="font-mono" style={{ fontSize: 9.5, letterSpacing: 1, padding: '7px 11px', border: `1px solid ${THEME.borderStrong}`, borderRadius: 7, color: THEME.textFaint }}>{t}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
          <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 3, color: THEME.textGhost }}>THE CHAIN BEGINS HERE</div>
          <div className="animate-nudge" style={{ color: THEME.red, fontSize: 14 }}>↓</div>
          <div style={{ width: 1, height: 74, background: 'linear-gradient(180deg, rgba(240,88,74,0.75), rgba(240,88,74,0))' }} />
        </div>
      </section>

      {/* ===== NARRATIVE ===== */}
      <div style={{ position: 'relative', padding: '110px 24px 30px', maxWidth: 1180, margin: '0 auto' }}>
        {/* S1 */}
        <section className="flex flex-col items-center gap-3.5" style={{ textAlign: 'center' }}>
          <Numbered n="01" color={THEME.red} />
          <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3.5, color: THEME.textFaint }}>WHAT YOU GIVE IT</div>
          <div style={{ ...display, fontSize: 42, color: '#F0EBE0' }}>Opinions. Memory. Budget.</div>
        </section>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 48 }}>
          {GIVE.map((c) => (
            <div key={c.label} style={{ background: THEME.bgCard, border: `1px solid ${c.color}38`, borderRadius: 14, padding: '22px 24px' }}>
              <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2.5, color: c.color }}>{c.marker} {c.label}</div>
              <div style={{ ...display, marginTop: 12, fontStyle: 'italic', fontSize: 20, color: THEME.textSoft, lineHeight: 1.35 }}>{c.quote}</div>
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.65, color: THEME.textMuted }}>
                {c.body.map((seg, i) => (typeof seg === 'string' ? seg : <span key={i} style={{ color: seg.c }}>{seg.t}</span>))}
              </div>
            </div>
          ))}
        </div>

        {/* S2 */}
        <section className="flex flex-col items-center gap-3.5" style={{ textAlign: 'center', marginTop: 130 }}>
          <Numbered n="02" color={THEME.cyan} />
          <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3.5, color: THEME.textFaint }}>ONE PRIMITIVE, VIEWED THREE WAYS</div>
          <div style={{ ...display, fontSize: 42, color: '#F0EBE0', maxWidth: 760, lineHeight: 1.15 }}>
            The delegation engine is the policy, the log, <span style={{ fontStyle: 'italic', color: THEME.cyan }}>and the kill switch.</span>
          </div>
        </section>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 48 }}>
          {PILLARS.map((p) => (
            <div key={p.n} style={{ background: THEME.bgCard, border: `1px solid ${THEME.borderStrong}`, borderRadius: 14, padding: '22px 24px' }}>
              <div className="font-mono" style={{ fontSize: 22, fontWeight: 600, color: p.color }}>{p.n}</div>
              <div style={{ ...display, marginTop: 12, fontSize: 21, color: '#F0EBE0' }}>{p.title}</div>
              <div style={{ marginTop: 9, fontSize: 12.5, lineHeight: 1.65, color: THEME.textMuted }}>{p.body}</div>
              <div className="font-mono" style={{ marginTop: 13, fontSize: 9, lineHeight: 1.6, color: THEME.textGhost }}>{p.cite}</div>
            </div>
          ))}
        </div>

        {/* S3 */}
        <section className="flex flex-col items-center gap-3.5" style={{ textAlign: 'center', marginTop: 130 }}>
          <Numbered n="03" color={THEME.amber} />
          <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3.5, color: THEME.textFaint }}>HOW A DECISION FLOWS</div>
          <div style={{ ...display, fontSize: 42, color: '#F0EBE0' }}>Eight moves, every one on the record.</div>
        </section>
        <div className="flex items-stretch justify-center flex-wrap gap-2.5" style={{ marginTop: 44 }}>
          {FLOW.map(([title, sub, color], i) => (
            <div key={title} className="flex items-center gap-2.5">
              <div className="flex flex-col gap-1.5" style={{ minWidth: 128, padding: '15px 16px', border: `1px solid ${color}66`, borderRadius: 11, background: THEME.bgCard, textAlign: 'center', boxShadow: `0 0 24px ${color}12` }}>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color }}>{title}</div>
                <div className="font-mono" style={{ fontSize: 10.5, lineHeight: 1.3, color: THEME.textMuted }}>{sub}</div>
              </div>
              {i < FLOW.length - 1 && <span style={{ color: THEME.textFaint, fontSize: 15 }}>→</span>}
            </div>
          ))}
        </div>
        <div className="font-mono" style={{ marginTop: 26, textAlign: 'center', fontSize: 10, lineHeight: 1.6, color: THEME.textGhost }}>
          the judge’s eye travels: proposal → authority → reasoning → on-chain result
        </div>

        {/* CTA into command center */}
        <section className="flex flex-col items-center gap-3.5" style={{ marginTop: 110, textAlign: 'center' }}>
          <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: '50%', background: THEME.bgNode, border: '1px solid rgba(98,217,232,0.6)', color: THEME.green, fontSize: 13, boxShadow: '0 0 30px rgba(98,217,232,0.28)' }}>▶</div>
          <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3.5, color: THEME.textFaint }}>EVERYTHING ABOVE — RUNNING LIVE</div>
          <div style={{ ...display, fontSize: 46, color: '#F0EBE0' }}>The Command Center</div>
          <div className="flex gap-3" style={{ marginTop: 8 }}>
            <Link href="/command-center" style={{ ...mono, fontSize: 12, fontWeight: 600, color: '#0B0708', padding: '14px 24px', background: THEME.amber, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 24px rgba(242,181,68,0.25)' }}>
              Enter the command center →
            </Link>
            <Link href="/onboard" style={{ ...mono, fontSize: 12, fontWeight: 600, color: THEME.text, padding: '14px 24px', border: `1px solid ${THEME.borderStrong}`, borderRadius: 10, textDecoration: 'none' }}>
              Set up your own
            </Link>
          </div>
        </section>

        <div className="font-mono" style={{ marginTop: 90, textAlign: 'center', fontSize: 9, letterSpacing: 1.4, color: THEME.textGhost }}>
          BUILT FOR METAMASK SMART ACCOUNTS KIT × 1SHOT API × VENICE AI · BASE MAINNET
        </div>
      </div>
    </div>
  )
}
