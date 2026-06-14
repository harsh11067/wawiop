import { baseSepolia, base } from 'viem/chains'

// Chain configuration
export const TESTNET_CHAIN = baseSepolia
export const MAINNET_CHAIN = base

// Use mainnet for submission (1Shot only supports Base mainnet)
export const ACTIVE_CHAIN = base

// RPC URLs (from env, with public fallbacks)
export const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
export const BASE_MAINNET_RPC = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'
export const ACTIVE_RPC = BASE_MAINNET_RPC

// Venice AI
export const VENICE_API_URL = 'https://api.venice.ai/api/v1'
export const VENICE_MODEL = 'llama-3.3-70b'

// 1Shot Relayer
export const ONESHOT_ENDPOINT = process.env.ONESHOT_RELAYER_URL || 'https://relayer.1shotapi.com/relayers'

// 1Shot relayer target address (required as outer delegate for 7710 transactions)
export const ONESHOT_RELAYER_TARGET = '0x26a529124f0bbf9af9d8f9f84a43efe47cf1199a' as const

// USDC on Base Sepolia (test) and Base Mainnet
export const USDC_ADDRESS_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
export const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const USDC_ADDRESS = USDC_ADDRESS_MAINNET
export const USDC_DECIMALS = 6

// Default budget and delegation settings
export const DEFAULT_WEEKLY_BUDGET = 10_000_000n // 10 USDC (6 decimals)
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

// Theme colors matching the mockup
export const THEME = {
  bg: '#0B0708',
  bgCard: '#1A1517',
  bgCardHover: '#231E20',
  red: '#F0584A',
  cyan: '#62D9E8',
  amber: '#F2B544',
  green: '#4ADE80',
  text: '#F5F0EB',
  textMuted: '#8A8185',
  border: '#2A2426',
} as const
