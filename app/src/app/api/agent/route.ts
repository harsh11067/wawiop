import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Address } from 'viem'
import {
  executeTask,
  initializeAgents,
  setRules,
  resolveClearSign,
  getAgentState,
} from '@/lib/agents/governor'
import { parseRules } from '@/lib/venice'
import { getActionLog, clearActionLog } from '@/lib/agents/memory'
import type { ResearchTask, ParsedRules } from '@/lib/types'

// POST /api/agent — handle agent actions
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'initialize': {
      const { addresses } = body as {
        addresses: {
          user: Address
          governor: Address
          researcher: Address
          summarizer: Address
        }
      }
      initializeAgents(addresses)
      return NextResponse.json({ success: true, message: 'Agents initialized' })
    }

    case 'set-rules': {
      const { rules: rawRules } = body as { rules: string }

      let parsedRules: ParsedRules
      try {
        parsedRules = await parseRules(rawRules)
      } catch {
        // Fallback to default rules if Venice fails
        parsedRules = {
          hardConstraints: [
            { type: 'budget', description: 'Weekly budget limit', value: 2 },
            { type: 'timeWindow', description: '7-day delegation window', value: 604800 },
          ],
          softPreferences: [rawRules],
        }
      }

      setRules(parsedRules)
      return NextResponse.json({ success: true, parsedRules })
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
