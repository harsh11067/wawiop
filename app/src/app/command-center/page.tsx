'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import WalletVoice from '@/components/WalletVoice'
import DemoBeats from '@/components/DemoBeats'
import OpinionsPanel from '@/components/OpinionsPanel'
import BudgetPanel from '@/components/BudgetPanel'
import RedelegationChain, { type Pulse } from '@/components/RedelegationChain'
import DelegationDetail from '@/components/DelegationDetail'
import RelayLifecycle, { type RelayState } from '@/components/RelayLifecycle'
import VeniceReasoning from '@/components/VeniceReasoning'
import ProposalsPanel from '@/components/ProposalsPanel'
import MemoryLog from '@/components/MemoryLog'
import ClearSign from '@/components/ClearSign'
import type { SSEEvent, AgentNode, ActionLogEntry, ClearSignRequest, ParsedRules, Proposal, ChainEdge } from '@/lib/types'
import type { AgentRole } from '@/lib/types'
import { THEME } from '@/lib/constants'
import type { Address } from 'viem'

const TECH = ['ERC-7710', 'ERC-7715', 'EIP-7702', 'x402', 'VENICE AI', '1SHOT', 'BASE']

const AMBIENT_VOICES = [
  "I'm watching Base. Nothing worth your money has happened in a while.",
  'Your budget is intact. My opinions are intact. All is well.',
  'Gas is cheap and nobody is doing anything interesting. I checked twice.',
  'I read three governance forums so you didn’t have to. You’re welcome.',
]

const post = (body: object) =>
  fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function CommandCenter() {
  const [agents, setAgents] = useState<Record<string, AgentNode>>({})
  const [rules, setRules] = useState<ParsedRules | null>(null)
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [clearSignRequest, setClearSignRequest] = useState<ClearSignRequest | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [budget, setBudget] = useState(10)
  const [spent, setSpent] = useState(0)
  const [killed, setKilled] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [chainInfo, setChainInfo] = useState<{ name: string; isTestnet: boolean } | null>(null)
  const [veniceStatus, setVeniceStatus] = useState<string>('unknown')
  const [result, setResult] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<Address | undefined>(undefined)
  const [selected, setSelected] = useState<AgentRole | null>(null)
  const [pulses, setPulses] = useState<Pulse[]>([])

  const [venice, setVenice] = useState<{ actor: string | null; text: string; traceId: number }>({ actor: null, text: '', traceId: 0 })
  const [relay, setRelay] = useState<RelayState>({ active: false, step: -1, taskId: null, note: '' })
  const [voice, setVoice] = useState<{ text: string; id: number }>({ text: AMBIENT_VOICES[0], id: 0 })

  const pulseId = useRef(0)
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((text: string) => setVoice((v) => ({ text, id: v.id + 1 })), [])

  const addPulse = useCallback((edge: ChainEdge, color: string) => {
    const id = ++pulseId.current
    setPulses((p) => [...p, { id, edge, color }])
    setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 1400)
  }, [])

  const markBusy = useCallback((ms: number) => {
    setBusy(true)
    if (busyTimer.current) clearTimeout(busyTimer.current)
    busyTimer.current = setTimeout(() => setBusy(false), ms)
  }, [])

  const fetchState = useCallback(async () => {
    try {
      const [stateRes, logRes] = await Promise.all([fetch('/api/agent'), post({ action: 'get-log' })])
      const state = await stateRes.json()
      const log = await logRes.json()
      if (state.agents && Object.keys(state.agents).length > 0) setAgents(state.agents)
      if (state.rules) setRules(state.rules)
      if (typeof state.budget === 'number') setBudget(state.budget)
      if (typeof state.spent === 'number') setSpent(state.spent)
      if (typeof state.killed === 'boolean') setKilled(state.killed)
      if (Array.isArray(state.proposals)) setProposals(state.proposals)
      if (state.chain) setChainInfo({ name: state.chain.name, isTestnet: state.chain.isTestnet })
      if (state.venice?.status) setVeniceStatus(state.venice.status)
      if (state.pendingClearSign) setClearSignRequest(state.pendingClearSign)
      if (log.log) setActionLog(log.log)
      return state
    } catch {
      return null
    }
  }, [])

  const refreshLog = useCallback(() => {
    post({ action: 'get-log' }).then((r) => r.json()).then((j) => j.log && setActionLog(j.log)).catch(() => {})
  }, [])

  // Initial load + SSE
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vectis-state') : null
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s.walletAddress) setWalletAddress(s.walletAddress)
        if (s.rules) setRules(s.rules)
      } catch { /* ignore */ }
    }

    ;(async () => {
      const state = await fetchState()
      if (!state || !state.agents || Object.keys(state.agents).length === 0) {
        await post({
          action: 'initialize',
          addresses: {
            user: '0x0000000000000000000000000000000000000000',
            governor: '0x0000000000000000000000000000000000000000',
            researcher: '0x0000000000000000000000000000000000000000',
            summarizer: '0x0000000000000000000000000000000000000000',
          },
        })
        await fetchState()
      }
    })()

    const es = new EventSource('/api/events')
    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data)
        const t = parsed.type as string
        if (t === 'heartbeat' || t === 'connected') return
        const d = parsed.data

        switch (parsed.type) {
          case 'agent_status': {
            const id = d.agentId as string
            setAgents((prev) => {
              if (!prev[id]) return prev
              return {
                ...prev,
                [id]: {
                  ...prev[id],
                  status: (d.status as AgentNode['status']) || prev[id].status,
                  ...(d.spent !== undefined ? { spent: d.spent as number } : {}),
                },
              }
            })
            const action = d.action as string | undefined
            if (action && /1Shot|delegation redemption/i.test(action)) {
              setRelay({ active: true, step: 0, taskId: null, note: 'relaying via 1Shot…' })
            }
            break
          }
          case 'venice_reasoning':
            setVenice((v) => ({ actor: (d.agent as string) || 'governor', text: (d.thinkTrace as string) || (d.reasoning as string) || '', traceId: v.traceId + 1 }))
            break
          case 'voice':
            say(d.text as string)
            break
          case 'pulse':
            addPulse(d.edge as ChainEdge, (d.color as string) || THEME.cyan)
            break
          case 'relay':
            setRelay({
              active: !!d.active,
              step: (d.step as number) ?? -1,
              taskId: (d.taskId as string) ?? null,
              note: (d.note as string) || '',
              reverted: !!d.reverted,
            })
            break
          case 'proposal_update': {
            const p = d.proposal as Proposal
            setProposals((prev) => [p, ...prev.filter((x) => x.id !== p.id)])
            break
          }
          case 'revocation':
            setKilled(!!d.killed)
            break
          case 'clearsign_request':
            setClearSignRequest(d as unknown as ClearSignRequest)
            break
          case 'execution_result':
            if (typeof d.totalCost === 'number') setSpent(d.totalCost)
            setResult(d.result as string)
            setIsRunning(false)
            setBusy(false)
            setRelay((r) => ({ ...r, active: false, step: 4, note: d.txHash ? `Confirmed · ${(d.txHash as string).slice(0, 18)}…` : 'Confirmed · gasless · webhook ✓' }))
            break
          case 'error':
            setIsRunning(false)
            setBusy(false)
            setRelay((r) => ({ ...r, active: false }))
            break
        }
        refreshLog()
      } catch { /* ignore */ }
    }

    return () => {
      es.close()
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fallback poll
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [logRes, stateRes] = await Promise.all([post({ action: 'get-log' }), fetch('/api/agent')])
        const log = await logRes.json()
        const state = await stateRes.json()
        if (log.log) setActionLog(log.log)
        if (typeof state.spent === 'number') setSpent(state.spent)
        if (typeof state.killed === 'boolean') setKilled(state.killed)
        if (Array.isArray(state.proposals)) setProposals(state.proposals)
        if (state.agents && Object.keys(state.agents).length > 0) setAgents(state.agents)
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  // Ambient voice
  useEffect(() => {
    const iv = setInterval(() => {
      if (isRunning || busy || clearSignRequest) return
      say(AMBIENT_VOICES[Math.floor(Math.random() * AMBIENT_VOICES.length)])
    }, 12000)
    return () => clearInterval(iv)
  }, [isRunning, busy, clearSignRequest, say])

  const handleSubmitTask = async () => {
    if (!taskInput.trim() || isRunning || busy || killed) return
    setIsRunning(true)
    setBusy(true)
    setResult(null)
    setVenice((v) => ({ ...v, text: '', traceId: v.traceId + 1 }))
    try {
      await post({ action: 'execute-task', query: taskInput })
    } catch {
      setIsRunning(false)
      setBusy(false)
    }
  }

  const handleClearSignResponse = async (response: 'proceed' | 'reject') => {
    setClearSignRequest(null)
    try {
      await post({ action: 'clearsign-response', response })
    } catch { /* ignore */ }
  }

  const handleVote = () => { markBusy(7500); post({ action: 'beat-vote' }).catch(() => {}) }
  const handleUnsafe = () => { markBusy(6500); post({ action: 'beat-unsafe' }).catch(() => {}) }
  const handleKill = () => {
    if (killed) {
      post({ action: 'restore' }).catch(() => {})
    } else {
      markBusy(4000)
      post({ action: 'revoke' }).catch(() => {})
    }
  }

  const x402Count = actionLog.filter((e) => /x402/i.test(e.action)).length
  const txCount = actionLog.filter((e) => !!e.txHash).length
  const remaining = Math.max(0, budget - spent)

  return (
    <div className="min-h-screen flex flex-col">
      <Header walletAddress={walletAddress} budget={budget} spent={spent} isConnected={Object.keys(agents).length > 0} isTestnet={chainInfo?.isTestnet ?? true} veniceStatus={veniceStatus} />

      {/* Voice + demo beats */}
      <div className="flex items-end justify-between gap-6" style={{ padding: '14px 28px 4px' }}>
        <div className="flex-1 min-w-0">
          <WalletVoice voice={voice.text} voiceId={voice.id} />
        </div>
        <DemoBeats killed={killed} busy={busy} onVote={handleVote} onUnsafe={handleUnsafe} onKill={handleKill} />
      </div>

      {/* Task input */}
      <div style={{ padding: '8px 28px 4px' }}>
        <div className="flex gap-3">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitTask()}
            placeholder={killed ? 'Delegation revoked — restore the root to run tasks' : 'Give the wallet a task… e.g. “Find the best LST yield for my idle USDC”'}
            disabled={isRunning || busy || killed}
            className="flex-1 font-mono"
            style={{ fontSize: 12, background: THEME.bgNode, color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px 14px', outline: 'none', opacity: killed ? 0.6 : 1 }}
          />
          <button
            onClick={handleSubmitTask}
            disabled={isRunning || busy || killed || !taskInput.trim()}
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: isRunning || busy ? 'default' : 'pointer', background: isRunning ? THEME.bgNode : THEME.amber, color: isRunning ? THEME.textFaint : '#0B0708', opacity: (!taskInput.trim() || killed) && !isRunning ? 0.5 : 1 }}
          >
            {isRunning ? 'RUNNING…' : 'EXECUTE'}
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid items-start" style={{ gridTemplateColumns: '300px minmax(560px, 1fr) 372px', gap: 16, padding: '16px 26px 8px' }}>
        {/* LEFT */}
        <div className="flex flex-col gap-4">
          <OpinionsPanel rules={rules} />
          <BudgetPanel budget={budget} spent={spent} x402Count={x402Count} txCount={txCount} />
          <div className="flex flex-wrap gap-1.5">
            {TECH.map((t) => (
              <span key={t} className="font-mono" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, padding: '5px 8px', border: `1px solid ${THEME.border}`, borderRadius: 6, color: THEME.textFaint }}>{t}</span>
            ))}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col gap-4">
          <RedelegationChain agents={agents} killed={killed} pulses={pulses} selected={selected} onSelect={(r) => setSelected((cur) => (cur === r ? null : r))} />
          {selected && <DelegationDetail role={selected} remainingUsd={remaining} onClose={() => setSelected(null)} />}
          <RelayLifecycle relay={relay} />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          <VeniceReasoning actor={venice.actor} text={venice.text} traceId={venice.traceId} />
          <ProposalsPanel proposals={proposals} />
          <MemoryLog entries={actionLog} />
        </div>
      </div>

      {/* Result strip */}
      {result && (
        <div style={{ margin: '4px 26px 0', borderRadius: 14, border: `1px solid ${THEME.border}`, background: THEME.bgCard, padding: 16, maxHeight: 200, overflow: 'auto' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span className="mono-label" style={{ color: THEME.green }}>◆ TASK RESULT</span>
            <button onClick={() => setResult(null)} className="font-mono" style={{ fontSize: 9, color: THEME.textFaint, background: 'none', border: 'none', cursor: 'pointer' }}>✕ DISMISS</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.textSoft, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}

      {/* Footer */}
      <div className="font-mono flex justify-between gap-4" style={{ padding: '10px 26px 18px', fontSize: 9, letterSpacing: 1.4, color: THEME.textGhost }}>
        <div>BUILT FOR METAMASK SMART ACCOUNTS KIT × 1SHOT API × VENICE AI</div>
        <Link href="/" style={{ color: THEME.textFaint, textDecoration: 'none' }}>← BACK TO OVERVIEW</Link>
      </div>

      <ClearSign request={clearSignRequest} onRespond={handleClearSignResponse} />
    </div>
  )
}
