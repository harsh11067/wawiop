'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import ActivityFeed from '@/components/ActivityFeed'
import ClearSign from '@/components/ClearSign'
import MemoryLog from '@/components/MemoryLog'
import type { SSEEvent, AgentNode, ActionLogEntry, ClearSignRequest } from '@/lib/types'
import { THEME } from '@/lib/constants'
import type { Address } from 'viem'

// Dynamic import for DelegationTree (uses react-flow which needs client-only rendering)
const DelegationTree = dynamic(() => import('@/components/DelegationTree'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ color: THEME.textMuted }}>
      Loading delegation tree...
    </div>
  ),
})

export default function CommandCenter() {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [agents, setAgents] = useState<Record<string, AgentNode>>({})
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [clearSignRequest, setClearSignRequest] = useState<ClearSignRequest | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [budget, setBudget] = useState(10)
  const [spent, setSpent] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load state from URL params or localStorage
  const [walletAddress, setWalletAddress] = useState<Address | undefined>(undefined)

  useEffect(() => {
    // Try to load saved state
    const saved = localStorage.getItem('vectis-state')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        setWalletAddress(state.walletAddress)
      } catch { /* ignore */ }
    }

    // Fetch initial agent state
    fetchState()

    // Connect SSE
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data)

        if ((parsed.type as string) === 'heartbeat' || (parsed.type as string) === 'connected') return

        setEvents((prev) => [...prev, parsed])

        // Handle specific event types
        if (parsed.type === 'agent_status') {
          setAgents((prev) => {
            const updated = { ...prev }
            const agentId = parsed.data.agentId as string
            if (updated[agentId]) {
              updated[agentId] = {
                ...updated[agentId],
                status: (parsed.data.status as AgentNode['status']) || updated[agentId].status,
                ...(parsed.data.spent !== undefined ? { spent: parsed.data.spent as number } : {}),
              }
            }
            return updated
          })
        }

        if (parsed.type === 'clearsign_request') {
          setClearSignRequest(parsed.data as unknown as ClearSignRequest)
        }

        if (parsed.type === 'execution_result') {
          setSpent(parsed.data.totalCost as number)
          setResult(parsed.data.result as string)
          setIsRunning(false)
        }

        if (parsed.type === 'error') {
          setIsRunning(false)
        }
      } catch { /* ignore parse errors */ }
    }

    return () => {
      es.close()
    }
  }, [])

  const fetchState = useCallback(async () => {
    try {
      const [stateRes, logRes] = await Promise.all([
        fetch('/api/agent'),
        fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-log' }),
        }),
      ])

      const state = await stateRes.json()
      const log = await logRes.json()

      if (state.agents) setAgents(state.agents)
      if (state.budget) setBudget(state.budget)
      if (state.spent) setSpent(state.spent)
      if (state.pendingClearSign) setClearSignRequest(state.pendingClearSign)
      if (log.log) setActionLog(log.log)
    } catch { /* ignore */ }
  }, [])

  // Periodically refresh the action log
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const logRes = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-log' }),
        })
        const log = await logRes.json()
        if (log.log) setActionLog(log.log)
      } catch { /* ignore */ }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleSubmitTask = async () => {
    if (!taskInput.trim() || isRunning) return

    setIsRunning(true)
    setResult(null)
    setEvents([])

    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-task', query: taskInput }),
      })
    } catch (err) {
      console.error('Failed to submit task:', err)
      setIsRunning(false)
    }
  }

  const handleClearSignResponse = async (response: 'proceed' | 'reject') => {
    setClearSignRequest(null)
    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearsign-response', response }),
      })
    } catch (err) {
      console.error('ClearSign response failed:', err)
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: THEME.bg }}>
      <Header
        walletAddress={walletAddress}
        budget={budget}
        spent={spent}
        isConnected={Object.keys(agents).length > 0}
      />

      {/* Task input bar */}
      <div className="px-6 py-3 border-b" style={{ borderColor: THEME.border }}>
        <div className="flex gap-3">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitTask()}
            placeholder="Enter a research task... (e.g., 'Analyse on-chain grant activity for Base ecosystem projects')"
            className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: THEME.bgCard,
              color: THEME.text,
              border: `1px solid ${THEME.border}`,
            }}
            disabled={isRunning}
          />
          <button
            onClick={handleSubmitTask}
            disabled={isRunning || !taskInput.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: isRunning ? THEME.bgCard : THEME.amber,
              color: THEME.bg,
            }}
          >
            {isRunning ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3 min-h-0">
        {/* Top-left: Delegation Tree */}
        <div className="row-span-1 min-h-0">
          <div className="h-full">
            <div className="text-xs font-medium mb-2 px-2" style={{ color: THEME.textMuted }}>
              Delegation Tree (Live)
            </div>
            <div className="h-[calc(100%-24px)]">
              <DelegationTree agents={agents} />
            </div>
          </div>
        </div>

        {/* Top-right: Activity Feed */}
        <div className="row-span-1 min-h-0 overflow-hidden">
          <ActivityFeed events={events} />
        </div>

        {/* Bottom-left: ClearSign */}
        <div className="row-span-1 min-h-0 overflow-hidden">
          <ClearSign request={clearSignRequest} onRespond={handleClearSignResponse} />
        </div>

        {/* Bottom-right: Memory Log */}
        <div className="row-span-1 min-h-0 overflow-hidden">
          <MemoryLog entries={actionLog} />
        </div>
      </div>

      {/* Result panel (slides up when task completes) */}
      {result && (
        <div
          className="border-t p-4 max-h-48 overflow-auto"
          style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: THEME.green }}>
              Task Result
            </span>
            <button
              onClick={() => setResult(null)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: THEME.textMuted }}
            >
              Dismiss
            </button>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: THEME.text }}>
            {result}
          </div>
        </div>
      )}
    </div>
  )
}
