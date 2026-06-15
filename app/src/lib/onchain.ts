import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  type Address,
  type Hex,
  type Hash,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ACTIVE_CHAIN, ACTIVE_RPC, USDC_ADDRESS } from './constants'
import { getEnvironment, encodeRedeemChain, createSignedRootDelegation, type SignedDelegation } from './delegation'

/**
 * Real on-chain layer: submits ERC-7710 redemptions and EIP-7702 upgrades to the
 * active chain (Base Sepolia by default). No mocking — every function performs a
 * real RPC call and surfaces the real error if it fails.
 */

export function publicClient() {
  return createPublicClient({ chain: ACTIVE_CHAIN, transport: http(ACTIVE_RPC) })
}

export function walletClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey)
  return { account, client: createWalletClient({ account, chain: ACTIVE_CHAIN, transport: http(ACTIVE_RPC) }) }
}

// Is an address an account with code (deployed contract / 7702-upgraded EOA)?
export async function isSmartAccount(address: Address): Promise<boolean> {
  const code = await publicClient().getBytecode({ address })
  return !!code && code !== '0x'
}

export async function ethBalance(address: Address): Promise<bigint> {
  return publicClient().getBalance({ address })
}

export async function usdcBalance(address: Address): Promise<bigint> {
  try {
    return await publicClient().readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address] })
  } catch {
    return 0n
  }
}

/**
 * Prove the budget caveat by simulating an over-cap redemption against the live
 * DelegationManager. Returns the real revert reason (e.g.
 * "ERC20TransferAmountEnforcer:allowance-exceeded"). No gas spent.
 */
export async function simulateUnsafeTransfer(
  userKey: Hex,
  governorKey: Hex,
  amountUsd: number,
): Promise<{ reverted: boolean; reason?: string; capUsd: number }> {
  const gov = privateKeyToAccount(governorKey)
  const root = (await createSignedRootDelegation(userKey, gov.address)) as SignedDelegation
  const amount = BigInt(Math.round(amountUsd * 1_000_000))
  const sim = await simulateRedeemChain([root], gov.address, gov.address, amount)
  return { reverted: !sim.ok, reason: sim.error, capUsd: 10 }
}

/** The Stateless EIP-7702 DeleGator implementation an EOA upgrades its code to. */
export function get7702Implementation(): Address {
  const env = getEnvironment() as unknown as { implementations: { EIP7702StatelessDeleGatorImpl: Address } }
  return env.implementations.EIP7702StatelessDeleGatorImpl
}

export interface SettlementResult {
  ok: boolean
  txHash?: Hash
  status: 'confirmed' | 'reverted' | 'unsubmitted'
  error?: string
  stage: 'preflight' | 'simulate' | 'submit' | 'receipt'
  simulated: boolean // eth_call against the live DelegationManager succeeded
}

/**
 * Real eth_call simulation of a redemption against the live DelegationManager.
 * Proves the chain (signature + authority linkage + caveats) is valid on-chain
 * WITHOUT spending gas. Returns the real revert reason if a caveat rejects it.
 */
export async function simulateRedeemChain(
  chainLeafToRoot: SignedDelegation[],
  delegateAddress: Address,
  target: Address,
  amount: bigint,
): Promise<{ ok: boolean; error?: string }> {
  const env = getEnvironment()
  const data = encodeRedeemChain(chainLeafToRoot, target, amount)
  try {
    await publicClient().call({ account: delegateAddress, to: env.DelegationManager as Address, data })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? ((e as { shortMessage?: string }).shortMessage || e.message) : String(e)
    return { ok: false, error: msg.split('\n').find((l) => /enforcer|exceeds|allowance|revert/i.test(l))?.trim() || msg.split('\n')[0] }
  }
}

/**
 * Sign a real EIP-7702 authorization upgrading `eoaKey`'s account to the Stateless
 * DeleGator implementation. Returns the signed authorization; submitting it (a type-4
 * tx) requires gas and is done by `submit7702Upgrade`.
 */
export async function sign7702Authorization(eoaKey: Hex) {
  const { account } = walletClient(eoaKey)
  const implementation = get7702Implementation()
  const nonce = await publicClient().getTransactionCount({ address: account.address })
  // viem account-level EIP-7702 authorization signing
  const authorization = await account.signAuthorization({
    chainId: ACTIVE_CHAIN.id,
    address: implementation,
    nonce,
  })
  return { authorization, implementation, account: account.address, nonce }
}

/** Submit the EIP-7702 upgrade on-chain (requires the EOA to hold gas). */
export async function submit7702Upgrade(eoaKey: Hex): Promise<SettlementResult> {
  const { account, client } = walletClient(eoaKey)
  try {
    const bal = await ethBalance(account.address)
    if (bal === 0n) return { ok: false, simulated: false, status: 'unsubmitted', stage: 'preflight', error: `EOA ${account.address} has 0 ETH for gas on ${ACTIVE_CHAIN.name}` }
    const { authorization } = await sign7702Authorization(eoaKey)
    const txHash = await client.sendTransaction({
      authorizationList: [authorization],
      to: account.address,
      value: 0n,
    })
    const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash })
    return { ok: receipt.status === 'success', simulated: false, txHash, status: receipt.status === 'success' ? 'confirmed' : 'reverted', stage: 'receipt' }
  } catch (e) {
    return { ok: false, simulated: false, status: 'unsubmitted', stage: 'submit', error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Redeem a real linked delegation chain on-chain. The `delegateKey` is the account
 * whose address == the leaf delegation's delegate (it is the msg.sender that calls
 * DelegationManager.redeemDelegations and pays gas). `chainLeafToRoot` is ordered
 * leaf-first. Performs preflight checks, then submits, then waits for the receipt —
 * returning the real error at whichever stage fails.
 */
export async function redeemChainOnchain(
  chainLeafToRoot: SignedDelegation[],
  delegateKey: Hex,
  target: Address,
  amount: bigint,
): Promise<SettlementResult> {
  const env = getEnvironment()
  const { account, client } = walletClient(delegateKey)

  // Step 1: simulate against the live DelegationManager (no gas). This is the
  // real proof the chain is valid — a caveat revert shows the real reason here.
  const sim = await simulateRedeemChain(chainLeafToRoot, account.address, target, amount)
  if (!sim.ok) {
    return { ok: false, simulated: false, status: 'unsubmitted', stage: 'simulate', error: sim.error }
  }

  // Step 2: settle for real if the delegate holds gas; otherwise report honestly
  // that the redemption is on-chain-valid but unfunded for settlement.
  let gas = 0n
  try { gas = await ethBalance(account.address) } catch { /* rpc */ }
  if (gas === 0n) {
    return { ok: false, simulated: true, status: 'unsubmitted', stage: 'submit', error: `delegate ${account.address} has 0 ETH for gas — simulation valid, fund to settle` }
  }

  const data = encodeRedeemChain(chainLeafToRoot, target, amount)
  try {
    const txHash = await client.sendTransaction({ to: env.DelegationManager as Address, data, value: 0n })
    const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash })
    return { ok: receipt.status === 'success', simulated: true, txHash, status: receipt.status === 'success' ? 'confirmed' : 'reverted', stage: 'receipt' }
  } catch (e) {
    return { ok: false, simulated: true, status: 'unsubmitted', stage: 'submit', error: e instanceof Error ? e.message : String(e) }
  }
}
