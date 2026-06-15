// Real EIP-7702 upgrade: signs an authorization setting the User EOA's code to the
// Stateless DeleGator implementation and submits it (type-4 tx). Needs a little gas.
//   node scripts/upgrade-7702.mjs
import fs from 'fs'
import { createPublicClient, createWalletClient, http, formatEther } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'

function loadEnv(p){ if(!fs.existsSync(p)) return {}; const o={}; for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'')} return o }
const E = { ...loadEnv('/home/hash/vectis/.env'), ...loadEnv('/home/hash/vectis/app/.env.local') }
const CHAIN_ID = Number(E.ACTIVE_CHAIN_ID || 84532)
const chain = CHAIN_ID === 8453 ? base : baseSepolia
const RPC = (CHAIN_ID === 8453 ? E.BASE_MAINNET_RPC_URL : E.BASE_SEPOLIA_RPC_URL) || chain.rpcUrls.default.http[0]
const env = getSmartAccountsEnvironment(CHAIN_ID)
const impl = env.implementations.EIP7702StatelessDeleGatorImpl

const key = E.WALLET_PRIVATE_KEY.startsWith('0x') ? E.WALLET_PRIVATE_KEY : '0x'+E.WALLET_PRIVATE_KEY
const account = privateKeyToAccount(key)
const pc = createPublicClient({ chain, transport: http(RPC) })
const wc = createWalletClient({ account, chain, transport: http(RPC) })

const code = await pc.getBytecode({ address: account.address })
if (code && code !== '0x') { console.log(`✓ ${account.address} is already a smart account (code present). No upgrade needed.`); process.exit(0) }
const bal = await pc.getBalance({ address: account.address })
console.log(`Upgrading ${account.address} → DeleGator (${impl}) on ${chain.name}. Gas balance: ${formatEther(bal)} ETH`)
if (bal === 0n) { console.log('✗ 0 ETH — fund the EOA from a Base Sepolia faucet first.'); process.exit(1) }

const authorization = await account.signAuthorization({ chainId: CHAIN_ID, address: impl, nonce: await pc.getTransactionCount({ address: account.address }) })
const hash = await wc.sendTransaction({ authorizationList: [authorization], to: account.address, value: 0n })
console.log('tx:', hash)
const rcpt = await pc.waitForTransactionReceipt({ hash })
console.log('status:', rcpt.status, '· https://sepolia.basescan.org/tx/'+hash)
