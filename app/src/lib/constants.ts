import { baseSepolia, base } from 'viem/chains'

// Chain configuration
export const TESTNET_CHAIN = baseSepolia
export const MAINNET_CHAIN = base

// RPC URLs (from env, with public fallbacks)
export const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
export const BASE_MAINNET_RPC = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'

// Active chain is selectable via ACTIVE_CHAIN_ID. Default = Base Sepolia (84532)
// for real on-chain redemption while funds are limited. Set to 8453 to use Base
// mainnet + the 1Shot gasless relayer (mainnet-only).
export const ACTIVE_CHAIN_ID = Number(process.env.ACTIVE_CHAIN_ID || process.env.NEXT_PUBLIC_ACTIVE_CHAIN_ID || 84532)
export const IS_MAINNET = ACTIVE_CHAIN_ID === 8453
export const ACTIVE_CHAIN = IS_MAINNET ? base : baseSepolia
export const ACTIVE_RPC = IS_MAINNET ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC

// Venice AI
export const VENICE_API_URL = 'https://api.venice.ai/api/v1'
export const VENICE_MODEL = 'llama-3.3-70b'

// 1Shot Relayer
export const ONESHOT_ENDPOINT = process.env.ONESHOT_RELAYER_URL || 'https://relayer.1shotapi.com/relayers'

// 1Shot relayer target address (required as outer delegate for 7710 transactions)
export const ONESHOT_RELAYER_TARGET = '0x26a529124f0bbf9af9d8f9f84a43efe47cf1199a' as const

// Base block explorer (tx links in the memory log / activity feed)
export const BASE_EXPLORER = IS_MAINNET ? 'https://basescan.org' : 'https://sepolia.basescan.org'
export const BASE_EXPLORER_TX = `${BASE_EXPLORER}/tx/`

// USDC on Base Sepolia (test) and Base Mainnet
export const USDC_ADDRESS_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
export const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const USDC_ADDRESS = IS_MAINNET ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_SEPOLIA
export const USDC_DECIMALS = 6

// Default budget and delegation settings
export const DEFAULT_WEEKLY_BUDGET = 10_000_000n // 10 USDC (6 decimals)
export const PER_ACTION_CAP = 5_000_000n          // $5 per single action (spendLimit caveat)
export const PER_ACTION_CAP_USD = 5
export const RESEARCHER_MAX_PER_CALL = 50_000n   // $0.05 per call
export const SUMMARIZER_BUDGET = 1n               // 1 wei USDC (~$0.000001) — effectively read-only
export const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days

// Agent names for display
export const AGENT_NAMES = {
  user: 'User Wallet',
  governor: 'Governor',
  researcher: 'Researcher',
  summarizer: 'Summarizer',
} as const

// Theme colors matching the dashboard design language (dashboard/*.dc.html)
export const THEME = {
  bg: '#0B0708',
  bgNode: '#120C0D',
  bgCard: 'rgba(13,16,23,0.72)',
  bgCardHover: 'rgba(20,24,32,0.85)',
  // Role / accent palette
  red: '#F0584A',      // Governor
  cyan: '#62D9E8',     // Researcher / live
  amber: '#F2B544',    // Summarizer / budget
  green: '#4ADE80',    // success
  venice: '#93D8C6',   // Venice reasoning trace
  baseBlue: '#5B8DEF', // Base network dot
  user: '#EAE7DE',     // User SA
  // Text ramp
  text: '#EAE7DE',
  textSoft: '#C9C4B6',
  textMuted: '#9A9588',
  textFaint: '#6E6A60',
  textGhost: '#46433D',
  // Lines
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const

// Role accent lookup
export const ROLE_COLOR: Record<string, string> = {
  user: THEME.user,
  governor: THEME.red,
  researcher: THEME.cyan,
  summarizer: THEME.amber,
}
