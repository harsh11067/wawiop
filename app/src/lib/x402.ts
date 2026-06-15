import type { Hex, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { recoverTypedDataAddress } from 'viem'
import { researchData } from './venice'
import { USDC_ADDRESS, ACTIVE_CHAIN_ID, ACTIVE_CHAIN } from './constants'

/**
 * A real x402 implementation (HTTP 402 → pay → 200) using EIP-3009
 * `TransferWithAuthorization` as the payment scheme — the same primitive Coinbase's
 * x402 "exact" scheme uses for USDC. The payer signs an off-chain authorization
 * (no gas); the resource server verifies the signature before delivering data.
 * On-chain settlement of the authorization requires a funded payer + facilitator.
 */

export const X402_NETWORK = ACTIVE_CHAIN_ID === 8453 ? 'base' : 'base-sepolia'
// Per-call price for the data endpoint, in USDC base units (6 decimals): $0.001
export const X402_PRICE_UNITS = 1000n

export interface PaymentAuthorization {
  from: Address
  to: Address
  value: string // base units
  validAfter: string
  validBefore: string
  nonce: Hex
}

export interface X402PaymentPayload {
  x402Version: number
  scheme: 'exact'
  network: string
  asset: Address
  authorization: PaymentAuthorization
  signature: Hex
}

export interface X402Requirements {
  x402Version: number
  accepts: {
    scheme: 'exact'
    network: string
    maxAmountRequired: string
    resource: string
    payTo: Address
    asset: Address
    description: string
  }[]
}

export interface X402Receipt {
  success: boolean
  amount: number // USD
  units: string
  asset: Address
  payTo: Address
  network: string
  from?: Address
  signature?: Hex
  verified: boolean // payment signature cryptographically verified by the server
  settled: boolean // on-chain settlement of the authorization
  settleError?: string
  endpoint: string
  timestamp: number
}

// EIP-3009 TransferWithAuthorization typed-data (USDC). USDC uses version "2".
export function transferWithAuthorizationTypedData(auth: PaymentAuthorization) {
  return {
    domain: { name: 'USD Coin', version: '2', chainId: ACTIVE_CHAIN_ID, verifyingContract: USDC_ADDRESS as Address },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization' as const,
    message: {
      from: auth.from,
      to: auth.to,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce,
    },
  }
}

function randomNonce(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return ('0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')) as Hex
}

// Build + sign a real EIP-3009 payment authorization (off-chain, gasless to create).
export async function signX402Payment(
  payerKey: Hex,
  payTo: Address,
  units: bigint,
): Promise<X402PaymentPayload> {
  const account = privateKeyToAccount(payerKey)
  const now = Math.floor(Date.now() / 1000)
  const authorization: PaymentAuthorization = {
    from: account.address,
    to: payTo,
    value: units.toString(),
    validAfter: '0',
    validBefore: String(now + 600),
    nonce: randomNonce(),
  }
  const typed = transferWithAuthorizationTypedData(authorization)
  const signature = await account.signTypedData(typed)
  return { x402Version: 1, scheme: 'exact', network: X402_NETWORK, asset: USDC_ADDRESS as Address, authorization, signature }
}

// Server-side: cryptographically verify an x402 payment payload (recovers the signer).
export async function verifyX402Payment(
  payload: X402PaymentPayload,
  payTo: Address,
  minUnits: bigint,
): Promise<{ ok: boolean; reason?: string; from?: Address }> {
  try {
    const a = payload.authorization
    if (a.to.toLowerCase() !== payTo.toLowerCase()) return { ok: false, reason: 'wrong payTo' }
    if (BigInt(a.value) < minUnits) return { ok: false, reason: 'underpaid' }
    if (Number(a.validBefore) < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'authorization expired' }
    const typed = transferWithAuthorizationTypedData(a)
    const recovered = await recoverTypedDataAddress({ ...typed, signature: payload.signature })
    if (recovered.toLowerCase() !== a.from.toLowerCase()) return { ok: false, reason: 'signature does not recover to payer' }
    return { ok: true, from: recovered }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

// The data endpoint's receiver (the "service" being paid). Configurable; falls back
// to a deterministic address so the demo is self-contained.
export function x402PayTo(): Address {
  return (process.env.X402_PAY_TO as Address) || ('0x000000000000000000000000000000000000dEaD' as Address)
}

function endpointBase(): string {
  if (process.env.X402_ENDPOINT_URL) return process.env.X402_ENDPOINT_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/x402/research`
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}/api/x402/research`
}

/**
 * Real x402 client: GET the resource → receive 402 + requirements → sign an
 * EIP-3009 payment → retry with the X-PAYMENT header → receive 200 + data.
 * Falls back to in-process payment signing + verification if the self-HTTP call
 * is unavailable (so the agent loop never hard-fails), still producing a real
 * verified payment authorization.
 */
export async function fetchWithX402(
  endpoint: string,
  query: string,
  payerKey?: Hex,
): Promise<{ data: string; payment: X402Receipt }> {
  const payTo = x402PayTo()
  const url = `${endpointBase()}?q=${encodeURIComponent(query)}`

  // Step 1: unpaid GET → expect 402 with requirements
  let requirements: X402Requirements | null = null
  try {
    const r = await fetch(url, { method: 'GET' })
    if (r.status === 402) requirements = (await r.json()) as X402Requirements
    else if (r.ok) {
      // endpoint not gated — return its data
      const j = await r.json()
      return { data: j.data ?? '', payment: receipt({ verified: false, settled: false, amount: 0, payTo, from: undefined, signature: undefined, endpoint }) }
    }
  } catch {
    /* self-fetch unavailable — fall through to in-process path */
  }

  const units = requirements ? BigInt(requirements.accepts[0].maxAmountRequired) : X402_PRICE_UNITS
  const requirePayTo = requirements ? requirements.accepts[0].payTo : payTo

  // Step 2: sign the payment authorization (real EIP-3009 signature)
  let payload: X402PaymentPayload | null = null
  let from: Address | undefined
  if (payerKey) {
    payload = await signX402Payment(payerKey, requirePayTo, units)
    from = payload.authorization.from
  }

  // Step 3: retry with X-PAYMENT, else verify in-process
  let data = ''
  let verified = false
  if (payload) {
    const header = Buffer.from(JSON.stringify(payload, bigintReplacer)).toString('base64')
    try {
      const r2 = await fetch(url, { method: 'GET', headers: { 'X-PAYMENT': header } })
      if (r2.ok) {
        const j = await r2.json()
        data = j.data ?? ''
        verified = true
      }
    } catch {
      /* fall through */
    }
    if (!verified) {
      const v = await verifyX402Payment(payload, requirePayTo, units)
      verified = v.ok
      data = await researchData(query)
    }
  } else {
    data = await researchData(query)
  }

  const amount = Number(units) / 1_000_000
  return {
    data,
    payment: receipt({ verified, settled: false, amount, payTo: requirePayTo, from, signature: payload?.signature, endpoint, units: units.toString() }),
  }
}

function bigintReplacer(_k: string, v: unknown) {
  return typeof v === 'bigint' ? v.toString() : v
}

function receipt(p: {
  verified: boolean
  settled: boolean
  amount: number
  payTo: Address
  from?: Address
  signature?: Hex
  endpoint: string
  units?: string
}): X402Receipt {
  return {
    success: p.verified,
    amount: p.amount,
    units: p.units ?? '0',
    asset: USDC_ADDRESS as Address,
    payTo: p.payTo,
    network: X402_NETWORK,
    from: p.from,
    signature: p.signature,
    verified: p.verified,
    settled: p.settled,
    endpoint: `${ACTIVE_CHAIN.name} · ${p.endpoint}`,
    timestamp: Date.now(),
  }
}
