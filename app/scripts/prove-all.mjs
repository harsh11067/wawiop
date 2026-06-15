// Master proof: runs every real-backend claim against the LIVE Base Sepolia chain
// and prints the evidence. No gas spent (signing + eth_call simulation only).
//   node scripts/prove-all.mjs
import fs from 'fs'
import { createPublicClient, http, encodeFunctionData, erc20Abi, keccak256, toBytes, recoverTypedDataAddress } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createDelegation, signDelegation, createExecution, getSmartAccountsEnvironment, ScopeType, ExecutionMode } from '@metamask/smart-accounts-kit'
import { createCaveatBuilder, hashDelegation } from '@metamask/smart-accounts-kit/utils'
import { DelegationManager } from '@metamask/smart-accounts-kit/contracts'

function loadEnv(p){ if(!fs.existsSync(p)) return {}; const o={}; for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'')} return o }
const E = { ...loadEnv('/home/hash/vectis/.env'), ...loadEnv('/home/hash/vectis/app/.env.local') }
const CHAIN_ID = Number(E.ACTIVE_CHAIN_ID || 84532)
const chain = CHAIN_ID === 8453 ? base : baseSepolia
const RPC = (CHAIN_ID === 8453 ? E.BASE_MAINNET_RPC_URL : E.BASE_SEPOLIA_RPC_URL) || chain.rpcUrls.default.http[0]
const USDC = CHAIN_ID === 8453 ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const env = getSmartAccountsEnvironment(CHAIN_ID)
const pc = createPublicClient({ chain, transport: http(RPC) })
const ROOT = '0x' + 'f'.repeat(64)

const uk = E.WALLET_PRIVATE_KEY.startsWith('0x') ? E.WALLET_PRIVATE_KEY : '0x' + E.WALLET_PRIVATE_KEY
const user = privateKeyToAccount(uk)
const gov = privateKeyToAccount(keccak256(toBytes(uk + ':governor')))
const res = privateKeyToAccount(keccak256(toBytes(uk + ':researcher')))
const sum = privateKeyToAccount(keccak256(toBytes(uk + ':summarizer')))
const now = Math.floor(Date.now() / 1000)
const ts = (exp) => createCaveatBuilder(env).addCaveat('timestamp', { afterThreshold: 0, beforeThreshold: now + exp }).build()
const sign = async (d, k) => ({ ...d, signature: await signDelegation({ privateKey: k, delegation: d, delegationManager: env.DelegationManager, chainId: CHAIN_ID }) })

let pass = 0, total = 0
const ok = (b, msg) => { total++; if (b) pass++; console.log(`  ${b ? '✅' : '❌'} ${msg}`) }

console.log(`\n=== VECTIS — REAL BACKEND PROOFS · ${chain.name} (${CHAIN_ID}) ===`)
console.log(`DelegationManager: ${env.DelegationManager}`)
console.log(`User SA: ${user.address}   USDC: ${USDC}\n`)

// ── 1. Linked ERC-7710 chain (signature + child.authority == hash(parent)) ──
console.log('1) LINKED ERC-7710 CHAIN (signed + cryptographically linked)')
const root = await sign(createDelegation({ from: user.address, to: gov.address, environment: env, scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: 10_000_000n }, caveats: ts(7 * 24 * 3600) }), uk)
const rDel = await sign(createDelegation({ from: gov.address, to: res.address, environment: env, parentDelegation: root, scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: 50_000n }, caveats: ts(3600) }), keccak256(toBytes(uk + ':governor')))
const sDel = await sign(createDelegation({ from: res.address, to: sum.address, environment: env, parentDelegation: rDel, scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: 1n }, caveats: ts(1800) }), keccak256(toBytes(uk + ':researcher')))
ok(root.authority === ROOT, `root authority == ROOT (${root.authority.slice(0, 12)}…)`)
ok(hashDelegation(root).toLowerCase() === rDel.authority.toLowerCase(), `Researcher.authority == hash(root)  ${rDel.authority.slice(0, 12)}…`)
ok(hashDelegation(rDel).toLowerCase() === sDel.authority.toLowerCase(), `Summarizer.authority == hash(Researcher)  ${sDel.authority.slice(0, 12)}…`)
ok([root, rDel, sDel].every(d => d.signature.length === 132), 'every hop carries a 65-byte ECDSA signature')

// ── 2. Valid redemption simulates on the live DelegationManager ──
console.log('\n2) VALID REDEMPTION — eth_call against the live DelegationManager')
const tx = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [user.address, 100_000n] })
const dataOk = DelegationManager.encode.redeemDelegations({ delegations: [[root]], modes: [ExecutionMode.SingleDefault], executions: [[createExecution({ target: USDC, callData: tx })]] })
try { await pc.call({ account: gov.address, to: env.DelegationManager, data: dataOk }); ok(true, 'redeem 0.10 USDC SIMULATION SUCCEEDED — chain is valid & redeemable on-chain') }
catch (e) { ok(false, 'simulation reverted: ' + (e.shortMessage || e.message)) }

// ── 3. Over-budget reverts (real caveat enforcement) ──
console.log('\n3) CAVEAT ENFORCEMENT — over-budget redemption REVERTS on-chain')
const txBad = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [user.address, 11_000_000n] })
const dataBad = DelegationManager.encode.redeemDelegations({ delegations: [[root]], modes: [ExecutionMode.SingleDefault], executions: [[createExecution({ target: USDC, callData: txBad })]] })
try { await pc.call({ account: gov.address, to: env.DelegationManager, data: dataBad }); ok(false, '11 USDC did NOT revert (unexpected)') }
catch (e) { const m = (e.shortMessage || e.message || '').split('\n').find(l => /enforcer|exceed/i.test(l)) || ''; ok(/allowance-exceeded|enforcer/i.test(m), 'reverted: ' + m.trim().slice(0, 80)) }

// ── 4. x402 EIP-3009 payment signed & verified ──
console.log('\n4) x402 PAYMENT — EIP-3009 signed by Researcher, signature verified')
const payTo = '0x000000000000000000000000000000000000dEaD'
const auth = { from: res.address, to: payTo, value: '1000', validAfter: 0n, validBefore: BigInt(now + 600), nonce: ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')) }
const typed = { domain: { name: 'USD Coin', version: '2', chainId: CHAIN_ID, verifyingContract: USDC }, types: { TransferWithAuthorization: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }] }, primaryType: 'TransferWithAuthorization', message: { ...auth, value: 1000n } }
const psig = await res.signTypedData(typed)
const recovered = await recoverTypedDataAddress({ ...typed, signature: psig })
ok(recovered.toLowerCase() === res.address.toLowerCase(), `payment signature recovers to Researcher ${recovered.slice(0, 12)}…`)

// ── 5. Venice status ──
console.log('\n5) VENICE AI')
try { const r = await fetch('https://api.venice.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${E.VENICE_API_KEY}` }, body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'user', content: 'OK' }], max_tokens: 3 }) }); console.log(`  ${r.status === 200 ? '✅ live (credits available)' : r.status === 402 ? 'ℹ️  key valid · NO CREDITS → app falls back deterministically (add credits to go live)' : 'status ' + r.status}`) } catch (e) { console.log('  unreachable:', e.message) }

console.log(`\n=== ${pass}/${total} cryptographic/on-chain checks passed ===\n`)
process.exit(pass === total ? 0 : 1)
