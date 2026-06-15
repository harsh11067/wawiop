import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Address, Hex } from 'viem'
import {
  executeTask,
  initializeAgents,
  setRules,
  resolveClearSign,
  getAgentState,
  revokeChain,
  restoreChain,
  runUnsafeAction,
  runProposalVote,
  resolveUserKey,
} from '@/lib/agents/governor'
import { deriveAgentAddresses } from '@/lib/delegation'
import { parseRules } from '@/lib/venice'
import { getActionLog, clearActionLog } from '@/lib/agents/memory'
import type { ResearchTask, ParsedRules } from '@/lib/types'

// POST /api/agent — handle agent actions
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const { action } = body

  switch (action) {
    case 'initialize': {
      const { addresses: providedAddresses } = body as {
        addresses: {
          user: Address
          governor: Address
          researcher: Address
          summarizer: Address
        }
      }

      const derived = deriveAgentAddresses(resolveUserKey())
      initializeAgents(derived)
      return NextResponse.json({
        success: true,
        message: 'Agents initialized with derived addresses',
        addresses: {
          user: derived.user,
          governor: derived.governor,
          researcher: derived.researcher,
          summarizer: derived.summarizer,
        },
        keysLoaded: true,
      })
    }

    case 'get-addresses': {
      const derived = deriveAgentAddresses(resolveUserKey())
      return NextResponse.json({
        user: derived.user,
        governor: derived.governor,
        researcher: derived.researcher,
        summarizer: derived.summarizer,
        keysLoaded: true,
      })
    }

    case 'set-rules': {
      const { rules: rawRules } = body as { rules: string }
      const parsedRules: ParsedRules = await parseRules(rawRules)
      setRules(parsedRules)
      return NextResponse.json({ success: true, parsedRules, veniceStatus: 'ok' })
    }

    case 'execute-task': {
      const { query } = body as { query: string }
      const task: ResearchTask = {
        id: `task-${Date.now()}`,
        query,
        status: 'pending',
        createdAt: Date.now(),
      }

      // Run the task asynchronously - don't await to allow SSE streaming
      executeTask(task).catch((error) => {
        console.error('Task execution error:', error)
      })

      return NextResponse.json({ success: true, taskId: task.id })
    }

    case 'clearsign-response': {
      const { response } = body as { response: 'proceed' | 'reject' }
      resolveClearSign(response)
      return NextResponse.json({ success: true })
    }

    case 'beat-vote': {
      runProposalVote().catch((e) => console.error('vote beat error:', e))
      return NextResponse.json({ success: true })
    }

    case 'beat-unsafe': {
      runUnsafeAction().catch((e) => console.error('unsafe beat error:', e))
      return NextResponse.json({ success: true })
    }

    case 'revoke': {
      revokeChain().catch((e) => console.error('revoke error:', e))
      return NextResponse.json({ success: true })
    }

    case 'restore': {
      restoreChain()
      return NextResponse.json({ success: true })
    }

    case 'get-state': {
      return NextResponse.json(getAgentState())
    }

    case 'get-log': {
      return NextResponse.json({ log: getActionLog() })
    }

    case 'clear-log': {
      clearActionLog()
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

// GET /api/agent — get current state
export async function GET() {
  return NextResponse.json(getAgentState())
}
