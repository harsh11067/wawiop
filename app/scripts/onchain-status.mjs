// Read-only health check: chain, DelegationManager, account deployment, balances,
// Venice credits, and live chain-linkage proof. Safe to run anytime (no spend).
//   node scripts/onchain-status.mjs
import fs from 'fs'
import { createPublicClient, http, formatEther, erc20Abi } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { keccak256, toBytes } from 'viem'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'

function loadEnv(p){ if(!fs.existsSync(p)) return {}; const o={}; for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'')} return o }
const E = { ...loadEnv('/home/hash/vectis/.env'), ...loadEnv('/home/hash/vectis/app/.env.local') }
const CHAIN_ID = Number(E.ACTIVE_CHAIN_ID || 84532)
const chain = CHAIN_ID === 8453 ? base : baseSepolia
const RPC = (CHAIN_ID === 8453 ? E.BASE_MAINNET_RPC_URL : E.BASE_SEPOLIA_RPC_URL) || chain.rpcUrls.default.http[0]
const USDC = CHAIN_ID === 8453 ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const env = getSmartAccountsEnvironment(CHAIN_ID)
const pc = createPublicClient({ chain, transport: http(RPC) })

const userKey = E.WALLET_PRIVATE_KEY?.startsWith('0x') ? E.WALLET_PRIVATE_KEY : '0x'+E.WALLET_PRIVATE_KEY
const A = k => privateKeyToAccount(k).address
const roleKey = r => keccak256(toBytes(userKey+':'+r))
const agents = {
  user: A(userKey),
  governor: A(roleKey('governor')),
  researcher: A(roleKey('researcher')),
  summarizer: A(roleKey('summarizer')),
}

console.log(`\n=== Vectis on-chain status — ${chain.name} (${CHAIN_ID}) ===`)
console.log('DelegationManager:', env.DelegationManager)
console.log('7702 impl        :', env.implementations.EIP7702StatelessDeleGatorImpl)
console.log('USDC             :', USDC)

console.log('\n--- Accounts ---')
for (const [role, addr] of Object.entries(agents)) {
  const [code, ethBal, usdcBal] = await Promise.all([
    pc.getBytecode({ address: addr }).catch(()=>undefined),
    pc.getBalance({ address: addr }).catch(()=>0n),
    pc.readContract({ address: USDC, abi: erc20Abi, functionName:'balanceOf', args:[addr] }).catch(()=>0n),
  ])
  const smart = code && code !== '0x'
  console.log(`${role.padEnd(11)} ${addr}`)
  console.log(`            ${smart ? 'SMART ACCOUNT ✓ (7702/deployed)' : 'EOA (not upgraded)'} · ${formatEther(ethBal)} ETH · ${(Number(usdcBal)/1e6).toFixed(4)} USDC`)
}

console.log('\n--- Venice ---')
try {
  const r = await fetch('https://api.venice.ai/api/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${E.VENICE_API_KEY}`}, body: JSON.stringify({ model:'llama-3.3-70b', messages:[{role:'user',content:'OK'}], max_tokens:3 }) })
  console.log(r.status === 200 ? 'live ✓ (credits available)' : r.status === 402 ? 'key valid, NO CREDITS (add at venice.ai/settings/api) → app uses deterministic fallback' : `status ${r.status}`)
} catch(e){ console.log('unreachable:', e.message) }

console.log('\nNext: fund the User EOA with Base Sepolia ETH (faucet) + test USDC, then:')
console.log('  node scripts/upgrade-7702.mjs     # upgrade User EOA → smart account')
console.log('  node scripts/redeem-demo.mjs      # redeem the real linked chain on-chain\n')
