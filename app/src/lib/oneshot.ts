import type { Address, Hex } from 'viem'
import { ONESHOT_ENDPOINT, ACTIVE_CHAIN } from './constants'
import type { OneShotCapabilities, OneShotEstimate, OneShotTask } from './types'

// JSON-RPC helper for 1Shot relayer
async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ONESHOT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ONESHOT_API_KEY
        ? { Authorization: `Bearer ${process.env.ONESHOT_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
  })

  const json = await response.json()

  if (json.error) {
    throw new Error(`1Shot RPC error: ${json.error.message || JSON.stringify(json.error)}`)
  }

  return json.result as T
}

// Get relayer capabilities for a chain
export async function getCapabilities(
  chainId: string = ACTIVE_CHAIN.id.toString(),
): Promise<OneShotCapabilities> {
  return rpcCall<OneShotCapabilities>('relayer_getCapabilities', [chainId])
}

// Estimate a 7710 transaction
export async function estimate7710Transaction(params: {
  chainId: string
  transactions: Array<{
    to: Address
    data: Hex
    value?: string
  }>
  delegations?: Hex[]
}): Promise<OneShotEstimate> {
  return rpcCall<OneShotEstimate>('relayer_estimate7710Transaction', [params])
}

// Send a 7710 transaction via the relayer (gasless)
export async function send7710Transaction(params: {
  chainId: string
  transactions: Array<{
    to: Address
    data: Hex
    value?: string
  }>
  context: string
  delegations?: Hex[]
  webhookUrl?: string
}): Promise<{ taskId: string }> {
  return rpcCall<{ taskId: string }>('relayer_send7710Transaction', [params])
}

// Get the status of a submitted transaction
export async function getStatus(taskId: string): Promise<OneShotTask> {
  return rpcCall<OneShotTask>('relayer_getStatus', [taskId])
}

// Poll for transaction confirmation
export async function waitForConfirmation(
  taskId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000,
): Promise<OneShotTask> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getStatus(taskId)
    if (status.status === 'Confirmed' || status.status === 'Rejected' || status.status === 'Reverted') {
      return status
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Transaction ${taskId} did not confirm within ${maxAttempts * intervalMs / 1000}s`)
}

// Full 1Shot lifecycle: estimate -> send -> wait for confirmation
export async function executeGasless(params: {
  to: Address
  data: Hex
  value?: string
  webhookUrl?: string
}): Promise<OneShotTask> {
  const chainId = ACTIVE_CHAIN.id.toString()

  // Step 1: Estimate
  const estimate = await estimate7710Transaction({
    chainId,
    transactions: [{ to: params.to, data: params.data, value: params.value }],
  })

  if (!estimate.success) {
    throw new Error(`1Shot estimate failed: ${JSON.stringify(estimate)}`)
  }

  // Step 2: Send
  const { taskId } = await send7710Transaction({
    chainId,
    transactions: [{ to: params.to, data: params.data, value: params.value }],
    context: estimate.context,
    webhookUrl: params.webhookUrl,
  })

  // Step 3: Wait for confirmation
  return waitForConfirmation(taskId)
}

// 7702 account upgrade via 1Shot
export async function upgrade7702(accountAddress: Address): Promise<OneShotTask> {
  const chainId = ACTIVE_CHAIN.id.toString()

  // The 7702 upgrade is performed by sending a special transaction type
  // through the relayer that upgrades an EOA to a smart account
  const estimate = await estimate7710Transaction({
    chainId,
    transactions: [{
      to: accountAddress,
      data: '0x' as Hex,
      value: '0',
    }],
  })

  if (!estimate.success) {
    throw new Error(`7702 upgrade estimate failed: ${JSON.stringify(estimate)}`)
  }

  const { taskId } = await send7710Transaction({
    chainId,
    transactions: [{
      to: accountAddress,
      data: '0x' as Hex,
      value: '0',
    }],
    context: estimate.context,
  })

  return waitForConfirmation(taskId)
}
