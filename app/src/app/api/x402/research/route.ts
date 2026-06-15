import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { researchData } from '@/lib/venice'
import {
  verifyX402Payment,
  x402PayTo,
  X402_PRICE_UNITS,
  X402_NETWORK,
  type X402PaymentPayload,
} from '@/lib/x402'
import { USDC_ADDRESS } from '@/lib/constants'
import type { Address } from 'viem'

// A real x402-protected resource. Without a valid X-PAYMENT header it returns
// HTTP 402 with payment requirements; with a cryptographically valid EIP-3009
// payment authorization it returns the research data.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || 'Base ecosystem research'
  const payTo = x402PayTo()
  const resource = request.nextUrl.pathname

  const paymentHeader = request.headers.get('x-payment')
  if (!paymentHeader) {
    return NextResponse.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: X402_NETWORK,
            maxAmountRequired: X402_PRICE_UNITS.toString(),
            resource,
            payTo,
            asset: USDC_ADDRESS as Address,
            description: `Research data: ${query.slice(0, 60)}`,
          },
        ],
      },
      { status: 402 },
    )
  }

  // Decode + cryptographically verify the payment authorization
  let payload: X402PaymentPayload
  try {
    payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'malformed X-PAYMENT header' }, { status: 400 })
  }

  const v = await verifyX402Payment(payload, payTo, X402_PRICE_UNITS)
  if (!v.ok) {
    return NextResponse.json({ error: `payment invalid: ${v.reason}` }, { status: 402 })
  }

  // Payment verified — deliver the data
  const data = await researchData(query)
  return NextResponse.json(
    { data, paidBy: v.from, amount: X402_PRICE_UNITS.toString(), asset: USDC_ADDRESS },
    { headers: { 'X-PAYMENT-RESPONSE': Buffer.from(JSON.stringify({ verified: true, from: v.from })).toString('base64') } },
  )
}
