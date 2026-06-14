'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Position,
  Handle,
  type NodeProps,
  Background,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { AgentNode } from '@/lib/types'
import { THEME, AGENT_NAMES } from '@/lib/constants'

// Custom node component for each agent in the delegation tree
function AgentNodeComponent({ data }: NodeProps) {
  const agent = data.agent as AgentNode
  const isUser = agent.role === 'user'
  const budgetPercent = agent.budget > 0 ? Math.max(0, 1 - agent.spent / agent.budget) * 100 : 0

  const statusColors: Record<string, string> = {
    idle: THEME.textMuted,
    active: THEME.green,
    pending: THEME.amber,
    completed: THEME.cyan,
    error: THEME.red,
    revoked: THEME.red,
  }

  const roleColors: Record<string, string> = {
    user: THEME.cyan,
    governor: THEME.amber,
    researcher: THEME.green,
    summarizer: THEME.cyan,
  }

  return (
    <div
      className="rounded-xl border px-4 py-3 min-w-[220px] shadow-lg"
      style={{
        backgroundColor: THEME.bgCard,
        borderColor: roleColors[agent.role] || THEME.border,
        borderWidth: agent.status === 'active' ? 2 : 1,
      }}
    >
      {!isUser && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: THEME.textMuted, border: 'none', width: 8, height: 8 }}
        />
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: roleColors[agent.role] }}>
          {AGENT_NAMES[agent.role]}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: statusColors[agent.status] }}
          title={agent.status}
        />
      </div>

      <div className="text-xs mb-2 font-mono" style={{ color: THEME.textMuted }}>
        {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
      </div>

      {/* Budget bar */}
      {agent.budget > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: THEME.textMuted }}>Budget</span>
            <span style={{ color: THEME.text }}>
              ${(agent.budget - agent.spent).toFixed(2)} / ${agent.budget.toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: THEME.border }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${budgetPercent}%`,
                backgroundColor: budgetPercent > 30 ? THEME.green : budgetPercent > 10 ? THEME.amber : THEME.red,
              }}
            />
          </div>
        </div>
      )}

      {/* Zero budget indicator */}
      {agent.role === 'summarizer' && (
        <div className="text-xs mb-2 px-2 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: THEME.red }}>
          Zero Budget — Read Only
        </div>
      )}

      {/* Scope list */}
      <div className="space-y-0.5 mb-2">
        {agent.scope.slice(0, 3).map((s, i) => (
          <div key={i} className="text-xs" style={{ color: THEME.textMuted }}>
            • {s}
          </div>
        ))}
      </div>

      {/* Tx hash */}
      {agent.txHash && (
        <div className="text-xs font-mono" style={{ color: THEME.cyan }}>
          tx: {agent.txHash.slice(0, 10)}...
        </div>
      )}

      {/* Status label */}
      {agent.status !== 'idle' && (
        <div
          className="text-xs mt-1 px-2 py-0.5 rounded text-center"
          style={{
            backgroundColor: `${statusColors[agent.status]}20`,
            color: statusColors[agent.status],
          }}
        >
          {agent.status === 'active' ? 'Processing...' : agent.status}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: THEME.textMuted, border: 'none', width: 8, height: 8 }}
      />
    </div>
  )
}

const nodeTypes = {
  agentNode: AgentNodeComponent,
}

interface DelegationTreeProps {
  agents: Record<string, AgentNode>
  onRevoke?: (agentId: string) => void
}

export default function DelegationTree({ agents, onRevoke }: DelegationTreeProps) {
  const { nodes, edges } = useMemo(() => {
    const agentList = Object.values(agents)
    if (agentList.length === 0) {
      return { nodes: [], edges: [] }
    }

    const nodePositions: Record<string, { x: number; y: number }> = {
      user: { x: 250, y: 0 },
      governor: { x: 250, y: 150 },
      researcher: { x: 100, y: 300 },
      summarizer: { x: 400, y: 300 },
    }

    const nodes: Node[] = agentList.map((agent) => ({
      id: agent.id,
      type: 'agentNode',
      position: nodePositions[agent.role] || { x: 250, y: 0 },
      data: { agent },
    }))

    const edgeConfig = [
      { source: 'user', target: 'governor', label: 'ERC-7715 Grant' },
      { source: 'governor', target: 'researcher', label: 'ERC-7710 Redelegate' },
      { source: 'governor', target: 'summarizer', label: 'ERC-7710 Redelegate' },
    ]

    const edges: Edge[] = edgeConfig
      .filter((e) => agents[e.source] && agents[e.target])
      .map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: agents[e.target]?.status === 'active',
        style: {
          stroke: agents[e.target]?.status === 'active' ? THEME.cyan : THEME.textMuted,
          strokeWidth: 2,
        },
        labelStyle: {
          fill: THEME.textMuted,
          fontSize: 10,
          fontFamily: 'monospace',
        },
        labelBgStyle: {
          fill: THEME.bgCard,
          fillOpacity: 0.9,
        },
      }))

    return { nodes, edges }
  }, [agents])

  return (
    <ReactFlowProvider>
      <div className="w-full h-full rounded-xl overflow-hidden" style={{ backgroundColor: THEME.bg }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color={THEME.border} variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
