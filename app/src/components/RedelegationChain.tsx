'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AgentNode, AgentRole } from '@/lib/types'
import { THEME } from '@/lib/constants'
import {
  CANVAS,
  NODE_POS,
  PATHS,
  END_DOTS,
  EDGE_LABELS,
  ROLE_META,
  nodeStatusLabel,
} from '@/lib/chainMeta'
import { Card, SectionLabel, Pill, short } from './ui'

export interface Pulse {
  id: number
  edge: keyof typeof PATHS
  color: string
}

interface Props {
  agents: Record<string, AgentNode>
  killed: boolean
  pulses: Pulse[]
  selected: AgentRole | null
  onSelect: (role: AgentRole) => void
}

function AgentCard({
  agent,
  killed,
  selected,
  onSelect,
  remainingPct,
}: {
  agent: AgentNode
  killed: boolean
  selected: boolean
  onSelect: (r: AgentRole) => void
  remainingPct: number
}) {
  const meta = ROLE_META[agent.role]
  const pos = NODE_POS[agent.role]
  const dead = agent.status === 'revoked' || killed
  const active = agent.status === 'active' && !dead
  const ringColor = dead ? THEME.red : meta.color
  const authority = agent.role === 'governor' ? remainingPct : meta.authority

  const cardStyle: CSSProperties = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    width: pos.w,
    height: pos.h,
    boxSizing: 'border-box',
    padding: agent.role === 'user' ? '12px 14px' : '13px 14px',
    border: `1px solid ${selected ? ringColor : dead ? 'rgba(240,88,74,0.5)' : `${meta.color}${active ? 'cc' : '66'}`}`,
    borderRadius: 12,
    background:
      agent.role === 'user'
        ? THEME.bgNode
        : `linear-gradient(180deg, ${meta.color}12, rgba(11,14,20,0)) ${THEME.bgNode}`,
    cursor: 'pointer',
    zIndex: 2,
    transition: 'border-color 0.3s',
  }

  return (
    <div onClick={() => onSelect(agent.role)} style={cardStyle}>
      {/* glow ring */}
      <span
        className={active ? 'animate-ring' : ''}
        style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 12,
          pointerEvents: 'none',
          boxShadow: `0 0 0 1px ${ringColor}, 0 0 26px ${ringColor}47, inset 0 0 18px ${ringColor}0F`,
          opacity: active || dead || selected ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: dead ? THEME.red : meta.color, fontSize: 10 }}>{meta.marker}</span>
          <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 1.6, color: THEME.text }}>
            {agent.role.toUpperCase()}{agent.role === 'user' ? ' SA' : ''}
          </span>
          {meta.tag && (
            <span className="font-mono" style={{ fontSize: 8.5, fontWeight: 500, color: THEME.textFaint }}>
              {meta.tag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={active ? 'animate-dot-pulse' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              display: 'inline-block',
              background: dead ? THEME.red : active ? meta.color : '#3A3E48',
              boxShadow: dead ? '0 0 8px rgba(240,88,74,0.8)' : active ? `0 0 8px ${meta.color}` : 'none',
            }}
          />
          <span className="font-mono" style={{ fontSize: 9, fontWeight: 500, color: dead ? THEME.red : THEME.textMuted }}>
            {nodeStatusLabel(agent.role, killed && agent.role !== 'user' ? 'revoked' : agent.status)}
          </span>
        </div>
      </div>

      <div className="font-mono" style={{ marginTop: 7, fontSize: 9.5, fontWeight: 500, color: THEME.textFaint }}>
        {short(agent.address, 6, 4)} · {meta.descriptor}
      </div>

      {/* authority bar */}
      <div className="flex items-center gap-2" style={{ marginTop: agent.role === 'governor' ? 12 : 11 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
          <div
            style={{
              width: `${dead ? 0 : authority}%`,
              height: 4,
              borderRadius: 2,
              background:
                agent.role === 'user'
                  ? 'linear-gradient(90deg, rgba(234,231,222,0.85), rgba(234,231,222,0.35))'
                  : `linear-gradient(90deg, ${meta.color}, ${meta.color}4d)`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <span className="font-mono" style={{ fontSize: 8.5, fontWeight: 600, color: THEME.textFaint, whiteSpace: 'nowrap' }}>
          {dead ? 'REVOKED' : `${Math.round(authority)}% AUTHORITY`}
        </span>
      </div>

      <div className="flex gap-1.5" style={{ marginTop: agent.role === 'user' ? 9 : 10 }}>
        {meta.scope.map((s) => (
          <Pill key={s} tone="neutral">{s}</Pill>
        ))}
      </div>
    </div>
  )
}

export default function RedelegationChain({ agents, killed, pulses, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      setScale(Math.min(1.08, Math.max(0.4, w / CANVAS.w)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const order: AgentRole[] = ['user', 'governor', 'researcher', 'summarizer']
  const nodes = order.map((r) => agents[r]).filter(Boolean)
  const gov = agents.governor
  const remainingPct = gov && gov.budget > 0 ? Math.max(0, Math.round(((gov.budget - gov.spent) / gov.budget) * 100)) : 64

  const baseStroke = killed ? 'rgba(240,88,74,0.30)' : 'rgba(255,255,255,0.13)'
  const baseDash = killed ? '3 6' : undefined
  const hot: Partial<Record<string, string>> = {}
  pulses.forEach((p) => { hot[p.edge] = p.color })

  const depth = nodes.length > 1 ? nodes.length - 1 : 0

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      {/* dotted texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <SectionLabel
          right={
            <span className="flex items-center gap-1.5" style={{ color: killed ? THEME.red : THEME.cyan }}>
              <span
                className={killed ? '' : 'animate-dot-pulse'}
                style={{ width: 6, height: 6, borderRadius: '50%', background: killed ? THEME.red : THEME.cyan, display: 'inline-block' }}
              />
              {killed ? 'REVOKED · SUBTREE DEAD' : `DEPTH ${depth} · LIVE`}
            </span>
          }
        >
          THE REDELEGATION CHAIN
        </SectionLabel>
        <div className="font-mono" style={{ fontSize: 9, color: THEME.textFaint, marginTop: 5, lineHeight: 1.5 }}>
          ERC-7710 · child ⊂ parent — enforced on-chain at redemption · click a node for its caveats
        </div>

        {/* scaled canvas */}
        <div ref={wrapRef} style={{ marginTop: 12, width: '100%', height: CANVAS.h * scale, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: CANVAS.w,
              height: CANVAS.h,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <svg
              width={CANVAS.w}
              height={CANVAS.h}
              viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
              style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, overflow: 'visible' }}
            >
              {(['ug', 'gr', 'rs'] as const).map((k) => (
                <path key={k} d={PATHS[k]} fill="none" stroke={baseStroke} strokeWidth={1.5} strokeDasharray={baseDash} />
              ))}
              <path d={PATHS.gx} fill="none" stroke={baseStroke} strokeWidth={1.5} strokeDasharray="3 6" />
              {(['ug', 'gr', 'rs'] as const).map((k) =>
                hot[k] ? (
                  <path key={k + 'h'} d={PATHS[k]} fill="none" stroke={hot[k]} strokeWidth={1.5} opacity={0.9} style={{ filter: `drop-shadow(0 0 6px ${hot[k]})` }} />
                ) : null,
              )}
              {END_DOTS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={2.5} fill={killed ? 'rgba(240,88,74,0.4)' : 'rgba(255,255,255,0.25)'} />
              ))}
            </svg>

            {/* animated pulses travelling along the edges */}
            {pulses.map((p) => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: p.color,
                  boxShadow: `0 0 14px 3px ${p.color}66`,
                  offsetPath: `path("${PATHS[p.edge]}")`,
                  animation: 'pulseMove 1.3s ease-in-out forwards',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* edge labels */}
            {EDGE_LABELS.map((l, i) => (
              <div
                key={i}
                className="font-mono"
                style={{ position: 'absolute', left: l.left, top: l.top, fontSize: 8.5, fontWeight: 500, lineHeight: 1.6, color: THEME.textFaint, zIndex: 2 }}
              >
                {l.lines.map((ln, j) => <div key={j}>{ln}</div>)}
              </div>
            ))}

            {/* RISK-SCORER stretch slot (dashed, not spawned) */}
            <div
              style={{
                position: 'absolute',
                left: NODE_POS.risk.x,
                top: NODE_POS.risk.y,
                width: NODE_POS.risk.w,
                height: NODE_POS.risk.h,
                boxSizing: 'border-box',
                padding: '13px 14px',
                border: `1px dashed ${THEME.borderStrong}`,
                borderRadius: 12,
                opacity: 0.6,
                zIndex: 2,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: THEME.textFaint, fontSize: 10 }}>◌</span>
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.6, color: THEME.textMuted }}>
                  RISK-SCORER
                </span>
              </div>
              <div className="font-mono" style={{ marginTop: 8, fontSize: 9, lineHeight: 1.6, color: THEME.textFaint }}>
                stretch slot — redelegate<br />read-only · ≤ 10% remaining
              </div>
              <div className="font-mono" style={{ marginTop: 9, fontSize: 8.5, color: THEME.textGhost }}>NOT SPAWNED</div>
            </div>

            {/* agent nodes */}
            {nodes.map((agent) => (
              <AgentCard
                key={agent.role}
                agent={agent}
                killed={killed}
                selected={selected === agent.role}
                onSelect={onSelect}
                remainingPct={remainingPct}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
