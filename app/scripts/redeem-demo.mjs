// Build the REAL signed linked chain and prove it redeems on-chain.
//   node scripts/redeem-demo.mjs          # eth_call simulation against the live
//                                          # DelegationManager (no gas, proves validity)
//   node scripts/redeem-demo.mjs --send    # actually submit (needs Governor gas)
import fs from 'fs'
import { createPublicClient, createWalletClient, http, encodeFunctionData, erc20Abi, keccak256, toBytes } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createDelegation, signDelegation, createExecution, getSmartAccountsEnvironment, ScopeType, ExecutionMode } from '@metamask/smart-accounts-kit'
import { createCaveatBuilder } from '@metamask/smart-accounts-kit/utils'
import { DelegationManager } from '@metamask/smart-accounts-kit/contracts'

function loadEnv(p){ if(!fs.existsSync(p)) return {}; const o={}; for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'')} return o }
const E = { ...loadEnv('/home/hash/vectis/.env'), ...loadEnv('/home/hash/vectis/app/.env.local') }
const SEND = process.argv.includes('--send')
const CHAIN_ID = Number(E.ACTIVE_CHAIN_ID || 84532)
const chain = CHAIN_ID === 8453 ? base : baseSepolia
const RPC = (CHAIN_ID === 8453 ? E.BASE_MAINNET_RPC_URL : E.BASE_SEPOLIA_RPC_URL) || chain.rpcUrls.default.http[0]
const USDC = CHAIN_ID === 8453 ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const env = getSmartAccountsEnvironment(CHAIN_ID)
const pc = createPublicClient({ chain, transport: http(RPC) })

const userKey = E.WALLET_PRIVATE_KEY.startsWith('0x') ? E.WALLET_PRIVATE_KEY : '0x'+E.WALLET_PRIVATE_KEY
const govKey = keccak256(toBytes(userKey+':governor'))
const user = privateKeyToAccount(userKey)
const gov = privateKeyToAccount(govKey)
const now = Math.floor(Date.now()/1000)

// Root delegation: User SA → Governor, budget caveat + 7-day window
const root = createDelegation({
  from: user.address, to: gov.address, environment: env,
  scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: 10_000_000n },
  caveats: createCaveatBuilder(env).addCaveat('timestamp',{afterThreshold:0,beforeThreshold:now+7*24*3600}).build(),
})
const signature = await signDelegation({ privateKey: userKey, delegation: root, delegationManager: env.DelegationManager, chainId: CHAIN_ID })
const signedRoot = { ...root, signature }

// Action: transfer 0.10 USDC from the User SA to account1 (an allowlisted spend)
const amount = 100_000n
const target = privateKeyToAccount(E.PRIVATE_KEY1?.startsWith('0x')?E.PRIVATE_KEY1:'0x'+(E.PRIVATE_KEY1||userKey)).address
const transfer = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [target, amount] })
const executions = [createExecution({ target: USDC, callData: transfer })]
const data = DelegationManager.encode.redeemDelegations({ delegations: [[signedRoot]], modes: [ExecutionMode.SingleDefault], executions: [executions] })

console.log(`\n=== Redeem linked chain on ${chain.name} ===`)
console.log('User SA  :', user.address)
console.log('Governor :', gov.address, '(delegate / redeemer)')
console.log('Action   : transfer 0.10 USDC → ', target)
console.log('DM       :', env.DelegationManager)

console.log('\n--- eth_call simulation (no gas) ---')
try {
  await pc.call({ account: gov.address, to: env.DelegationManager, data })
  console.log('✅ SIMULATION SUCCEEDED — the signed linked chain is VALID and redeemable on-chain.')
  console.log('   (DelegationManager accepted the signature, authority link, and caveats.)')
} catch (e) {
  const msg = (e.shortMessage || e.message || '').split('\n')[0]
  console.log('⛔ simulation reverted:', msg)
  console.log('   This is the REAL on-chain reason (e.g. caveat/enforcer). Not hidden.')
}

if (SEND) {
  const govBal = await pc.getBalance({ address: gov.address })
  if (govBal === 0n) { console.log('\nCannot --send: Governor has 0 ETH for gas. Fund', gov.address); process.exit(1) }
  const wc = createWalletClient({ account: gov, chain, transport: http(RPC) })
  console.log('\n--- submitting real tx ---')
  const hash = await wc.sendTransaction({ to: env.DelegationManager, data, value: 0n })
  console.log('tx:', hash)
  const rcpt = await pc.waitForTransactionReceipt({ hash })
  console.log('status:', rcpt.status, '· explorer: https://sepolia.basescan.org/tx/'+hash)
}
console.log('')
