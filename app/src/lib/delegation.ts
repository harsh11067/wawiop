import {
  createDelegation,
  signDelegation,
  createExecution,
  toMetaMaskSmartAccount,
  getSmartAccountsEnvironment,
  Implementation,
  ScopeType,
  ExecutionMode,
} from '@metamask/smart-accounts-kit'
import { createCaveatBuilder } from '@metamask/smart-accounts-kit/utils'
import { DelegationManager } from '@metamask/smart-accounts-kit/contracts'
import {
  type PublicClient,
  type Address,
  type Hex,
  createPublicClient,
  http,
  encodeFunctionData,
  erc20Abi,
  keccak256,
  toBytes,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  ACTIVE_CHAIN,
  ACTIVE_RPC,
  USDC_ADDRESS,
  DEFAULT_WEEKLY_BUDGET,
  RESEARCHER_MAX_PER_CALL,
  SUMMARIZER_BUDGET,
  DEFAULT_EXPIRY_SECONDS,
  ONESHOT_RELAYER_TARGET,
} from './constants'

// Get the delegation environment for the active chain
export function getEnvironment() {
  return getSmartAccountsEnvironment(ACTIVE_CHAIN.id)
}

// Get a public client for reading chain state
export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: http(ACTIVE_RPC),
  }) as PublicClient
}

// Derive deterministic agent addresses from the user's private key
// Each agent gets a unique key by hashing the root key with a role salt
export function deriveAgentAddresses(userPrivateKey: Hex): {
  user: Address
  governor: Address
  researcher: Address
  summarizer: Address
  keys: {
    user: Hex
    governor: Hex
    researcher: Hex
    summarizer: Hex
  }
} {
  const userAccount = privateKeyToAccount(userPrivateKey)

  // Derive sub-keys deterministically from root key + role
  const governorKey = keccak256(toBytes(`${userPrivateKey}:governor`)) as Hex
  const researcherKey = keccak256(toBytes(`${userPrivateKey}:researcher`)) as Hex
  const summarizerKey = keccak256(toBytes(`${userPrivateKey}:summarizer`)) as Hex

  const governorAccount = privateKeyToAccount(governorKey)
  const researcherAccount = privateKeyToAccount(researcherKey)
  const summarizerAccount = privateKeyToAccount(summarizerKey)

  return {
    user: userAccount.address,
    governor: governorAccount.address,
    researcher: researcherAccount.address,
    summarizer: summarizerAccount.address,
    keys: {
      user: userPrivateKey,
      governor: governorKey,
      researcher: researcherKey,
      summarizer: summarizerKey,
    },
  }
}

// Create a smart account from a private key
export async function createAgentAccount(
  client: PublicClient,
  privateKey: Hex,
) {
  const account = privateKeyToAccount(privateKey)
  return toMetaMaskSmartAccount({
    client,
    implementation: Implementation.Hybrid,
    deployParams: [account.address, [], [], []],
    deploySalt: '0x',
    signer: { account },
  })
}

// Sign a delegation with a private key
export async function signDelegationWithKey(
  delegation: ReturnType<typeof createDelegation>,
  signerPrivateKey: Hex,
) {
  const environment = getEnvironment()

  const signature = await signDelegation({
    privateKey: signerPrivateKey,
    delegation,
    delegationManager: environment.DelegationManager,
    chainId: ACTIVE_CHAIN.id,
  })

  return { ...delegation, signature }
}

// Create the root delegation: User -> Governor
// Grants the Governor permission to manage USDC within a weekly budget
export function createRootDelegation(
  userAddress: Address,
  governorAddress: Address,
  budgetAmount: bigint = DEFAULT_WEEKLY_BUDGET,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
) {
  const environment = getEnvironment()
  const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds)

  // Build caveats: budget + time window
  const caveats = createCaveatBuilder(environment)
    .addCaveat('timestamp', {
      afterThreshold: 0,
      beforeThreshold: Number(expiry),
    })
    .build()

  const delegation = createDelegation({
    to: governorAddress,
    from: userAddress,
    environment,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_ADDRESS,
      maxAmount: budgetAmount,
    },
    caveats,
  })

  return delegation
}

// Create and sign root delegation in one step
export async function createSignedRootDelegation(
  userPrivateKey: Hex,
  governorAddress: Address,
  budgetAmount: bigint = DEFAULT_WEEKLY_BUDGET,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
) {
  const userAccount = privateKeyToAccount(userPrivateKey)
  const delegation = createRootDelegation(
    userAccount.address,
    governorAddress,
    budgetAmount,
    expirySeconds,
  )
  return signDelegationWithKey(delegation, userPrivateKey)
}

// Create redelegation: Governor -> Researcher
// Narrower scope: max $0.05/call, only data endpoint, time-limited
export function createResearcherDelegation(
  parentDelegation: ReturnType<typeof createDelegation>,
  governorAddress: Address,
  researcherAddress: Address,
  maxPerCall: bigint = RESEARCHER_MAX_PER_CALL,
) {
  const environment = getEnvironment()
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour expiry (narrower than parent)

  const caveats = createCaveatBuilder(environment)
    .addCaveat('timestamp', {
      afterThreshold: 0,
      beforeThreshold: Number(expiry),
    })
    .addCaveat('limitedCalls', {
      limit: 10, // max 10 calls
    })
    .build()

  const delegation = createDelegation({
    to: researcherAddress,
    from: governorAddress,
    environment,
    parentDelegation,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_ADDRESS,
      maxAmount: maxPerCall,
    },
    caveats,
  })

  return delegation
}

// Create and sign researcher redelegation
export async function createSignedResearcherDelegation(
  parentDelegation: ReturnType<typeof createDelegation>,
  governorPrivateKey: Hex,
  researcherAddress: Address,
  maxPerCall: bigint = RESEARCHER_MAX_PER_CALL,
) {
  const governorAccount = privateKeyToAccount(governorPrivateKey)
  const delegation = createResearcherDelegation(
    parentDelegation,
    governorAccount.address,
    researcherAddress,
    maxPerCall,
  )
  return signDelegationWithKey(delegation, governorPrivateKey)
}

// Create redelegation: Researcher -> Summarizer
// Even narrower: zero budget (read-only), no payments, text processing only
export function createSummarizerDelegation(
  parentDelegation: ReturnType<typeof createDelegation>,
  researcherAddress: Address,
  summarizerAddress: Address,
) {
  const environment = getEnvironment()
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 1800) // 30 min expiry (narrower than parent)

  const caveats = createCaveatBuilder(environment)
    .addCaveat('timestamp', {
      afterThreshold: 0,
      beforeThreshold: Number(expiry),
    })
    .addCaveat('limitedCalls', {
      limit: 5, // max 5 calls
    })
    .build()

  // Zero-budget delegation — Summarizer cannot spend anything
  const delegation = createDelegation({
    to: summarizerAddress,
    from: researcherAddress,
    environment,
    parentDelegation,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_ADDRESS,
      maxAmount: SUMMARIZER_BUDGET, // 0 — read-only
    },
    caveats,
  })

  return delegation
}

// Create and sign summarizer redelegation
export async function createSignedSummarizerDelegation(
  parentDelegation: ReturnType<typeof createDelegation>,
  researcherPrivateKey: Hex,
  summarizerAddress: Address,
) {
  const researcherAccount = privateKeyToAccount(researcherPrivateKey)
  const delegation = createSummarizerDelegation(
    parentDelegation,
    researcherAccount.address,
    summarizerAddress,
  )
  return signDelegationWithKey(delegation, researcherPrivateKey)
}

// Encode a delegation redemption for executing a USDC transfer
export function encodeRedemption(
  signedDelegations: Array<ReturnType<typeof createDelegation> & { signature: Hex }>,
  targetAddress: Address,
  amount: bigint,
) {
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [targetAddress, amount],
  })

  const executions = [createExecution({ target: USDC_ADDRESS, callData })]

  return DelegationManager.encode.redeemDelegations({
    delegations: [signedDelegations],
    modes: [ExecutionMode.SingleDefault],
    executions: [executions],
  })
}

// Encode a generic execution (for non-transfer actions)
export function encodeGenericExecution(
  signedDelegations: Array<ReturnType<typeof createDelegation> & { signature: Hex }>,
  target: Address,
  callData: Hex,
  value: bigint = 0n,
) {
  const executions = [createExecution({ target, callData, value })]

  return DelegationManager.encode.redeemDelegations({
    delegations: [signedDelegations],
    modes: [ExecutionMode.SingleDefault],
    executions: [executions],
  })
}

// Create a delegation wrapper for the 1Shot relayer target
// 1Shot requires the outermost delegation's delegate = relayer target address
// Chain: User -> 1Shot Relayer Target (outer) -> Governor (inner execution)
export function createRelayerDelegation(
  userAddress: Address,
  budgetAmount: bigint = DEFAULT_WEEKLY_BUDGET,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
) {
  const environment = getEnvironment()
  const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds)

  const caveats = createCaveatBuilder(environment)
    .addCaveat('timestamp', {
      afterThreshold: 0,
      beforeThreshold: Number(expiry),
    })
    .build()

  const delegation = createDelegation({
    to: ONESHOT_RELAYER_TARGET as Address,
    from: userAddress,
    environment,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_ADDRESS,
      maxAmount: budgetAmount,
    },
    caveats,
  })

  return delegation
}

// Create and sign a delegation to the 1Shot relayer target
export async function createSignedRelayerDelegation(
  userPrivateKey: Hex,
  budgetAmount: bigint = DEFAULT_WEEKLY_BUDGET,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
) {
  const userAccount = privateKeyToAccount(userPrivateKey)
  const delegation = createRelayerDelegation(
    userAccount.address,
    budgetAmount,
    expirySeconds,
  )
  return signDelegationWithKey(delegation, userPrivateKey)
}

// Get human-readable scope description for an agent
export function getScopeDescription(role: 'governor' | 'researcher' | 'summarizer'): string[] {
  switch (role) {
    case 'governor':
      return [
        'Manage USDC budget (up to $10/week)',
        'Spawn sub-agents with narrower scope',
        'Execute research tasks',
        'ClearSign required for high-stakes actions',
      ]
    case 'researcher':
      return [
        'Fetch data via x402 (max $0.05/call)',
        'Limited to 10 calls per session',
        '1-hour time window',
        'Cannot exceed Governor budget',
      ]
    case 'summarizer':
      return [
        'Read-only access (zero budget)',
        'Text processing only',
        'Limited to 5 calls per session',
        '30-minute time window',
        'Cannot spend or transfer',
      ]
  }
}
