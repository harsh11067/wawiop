import { subscribe } from '@/lib/agents/governor'
import type { SSEEvent } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /api/events — Server-Sent Events stream for live updates
export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
      )

      // Subscribe to agent events
      const unsubscribe = subscribe((event: SSEEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        } catch {
          // Stream closed
          unsubscribe()
        }
      })

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
          )
        } catch {
          clearInterval(heartbeat)
          unsubscribe()
        }
      }, 15000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
