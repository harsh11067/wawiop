import type { Address, Hex } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'
import { ONESHOT_ENDPOINT, ACTIVE_CHAIN, USDC_ADDRESS } from './constants'
import type { OneShotCapabilities, OneShotEstimate, OneShotTask } from './types'

// The delegation type as returned by the SDK's createDelegation + signDelegation
interface SignedDelegation {
  delegate: Address
  delegator: Address
  authority: Hex
  caveats: Array<{
    enforcer: Address
    terms: Hex
    args: Hex
  }>
  salt: Hex
  signature: Hex
}

// JSON-RPC helper for 1Shot relayer
async function rpcCall<T>(method: string, params: unknown): Promise<T> {
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

// Get relayer capabilities for chains
export async function getCapabilities(
  chainId: string = ACTIVE_CHAIN.id.toString(),
): Promise<OneShotCapabilities> {
  return rpcCall<OneShotCapabilities>('relayer_getCapabilities', [[chainId]])
}

// Get fee data for a chain/token pair
export async function getFeeData(
  chainId: string,
  tokenAddress: Address,
): Promise<{
  rate: number
  minFee: string
  expiry: number
  gasPrice: string
  context: string
}> {
  return rpcCall('relayer_getFeeData', { chainId, token: tokenAddress })
}

// Build a 7710 transaction bundle from signed delegations + execution
function build7710Bundle(
  delegationChain: SignedDelegation[],
  target: Address,
  callData: Hex,
  value: string = '0x0',
) {
  return {
    permissionContext: delegationChain.map((d) => ({
      delegate: d.delegate,
      delegator: d.delegator,
      authority: d.authority,
      caveats: d.caveats,
      salt: d.salt,
      signature: d.signature,
    })),
    executions: [
      {
        target,
        value,
        callData,
      },
    ],
  }
}

// Estimate a 7710 delegated transaction
export async function estimate7710Transaction(
  chainId: string,
  delegationChain: SignedDelegation[],
  target: Address,
  callData: Hex,
): Promise<OneShotEstimate> {
  const bundle = build7710Bundle(delegationChain, target, callData)
  return rpcCall<OneShotEstimate>('relayer_estimate7710Transaction', {
    chainId,
    transactions: [bundle],
  })
}

// Send a 7710 delegated transaction via the relayer (gasless)
export async function send7710Transaction(
  chainId: string,
  delegationChain: SignedDelegation[],
  target: Address,
  callData: Hex,
  context?: string,
): Promise<{ taskId: string }> {
  const bundle = build7710Bundle(delegationChain, target, callData)
  return rpcCall<{ taskId: string }>('relayer_send7710Transaction', {
    chainId,
    transactions: [bundle],
    ...(context ? { context } : {}),
  })
}

// Get the status of a submitted transaction
export async function getStatus(taskId: string): Promise<OneShotTask> {
  return rpcCall<OneShotTask>('relayer_getStatus', { id: taskId, logs: false })
}

// Poll for transaction confirmation
export async function waitForConfirmation(
  taskId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000,
): Promise<OneShotTask> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getStatus(taskId)
    if (
      status.status === 'Confirmed' ||
      status.status === 'Rejected' ||
      status.status === 'Reverted'
    ) {
      return status
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(
    `Transaction ${taskId} did not confirm within ${(maxAttempts * intervalMs) / 1000}s`,
  )
}

// Get the relayer's target address for a chain (required as the delegation's delegate)
export async function getRelayerTarget(
  chainId: string = '8453', // 1Shot only supports Base mainnet
): Promise<{ targetAddress: Address; feeCollector: Address; tokens: Array<{ address: Address; symbol: string }> }> {
  const caps = await getCapabilities(chainId)
  const chainCaps = (caps as unknown as Record<string, { targetAddress: Address; feeCollector: Address; tokens: Array<{ address: Address; symbol: string }> }>)[chainId]
  if (!chainCaps?.targetAddress) {
    throw new Error(`1Shot does not support chain ${chainId}`)
  }
  return chainCaps
}

// Full 1Shot 7710 lifecycle: estimate -> send -> wait
// The first delegation in the chain MUST have delegate = relayer targetAddress
export async function executeGaslessDelegation(
  delegationChain: SignedDelegation[],
  transferTo: Address,
  usdcAmount: bigint,
): Promise<OneShotTask> {
  // 1Shot only supports Base mainnet (8453)
  const chainId = '8453'

  // Encode the USDC transfer that the delegation authorizes
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [transferTo, usdcAmount],
  })

  // Step 1: Estimate
  const estimate = await estimate7710Transaction(chainId, delegationChain, USDC_ADDRESS, callData)

  if (!estimate.success) {
    throw new Error(`1Shot estimate failed: ${estimate.error || JSON.stringify(estimate)}`)
  }

  // Step 2: Send with the signed context from estimate
  const result = await send7710Transaction(
    chainId,
    delegationChain,
    USDC_ADDRESS,
    callData,
    estimate.context,
  )

  // Step 3: Wait for confirmation
  return waitForConfirmation(result.taskId)
}
