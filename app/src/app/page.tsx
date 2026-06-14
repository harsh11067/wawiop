'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RuleInput from '@/components/RuleInput'
import { THEME } from '@/lib/constants'
import type { ParsedRules } from '@/lib/types'
import type { Address } from 'viem'

// Demo addresses for the agent accounts
// In production, these would be generated or connected via MetaMask
const DEMO_ADDRESSES = {
  user: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28' as Address,
  governor: '0x8ba1f109551bD432803012645Ac136c22C3B9Fd2' as Address,
  researcher: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0' as Address,
  summarizer: '0xaB5409b0E5a66AcC9D63f668414539A60a5917C1' as Address,
}

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<'connect' | 'rules' | 'signing'>('connect')
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<Address | null>(null)
  const [parsedRules, setParsedRules] = useState<ParsedRules | null>(null)
  const [isSigning, setIsSigning] = useState(false)

  const handleConnect = async () => {
    // In production: MetaMask Flask connection via wagmi
    // For demo: use the demo address
    setWalletAddress(DEMO_ADDRESSES.user)
    setIsConnected(true)
    setStep('rules')

    // Initialize agents on the backend
    await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'initialize',
        addresses: DEMO_ADDRESSES,
      }),
    })
  }

  const handleRulesParsed = (rules: ParsedRules, rawRules: string) => {
    setParsedRules(rules)
    setStep('signing')
  }

  const handleSignDelegation = async () => {
    setIsSigning(true)

    // Save state for the command center
    localStorage.setItem('vectis-state', JSON.stringify({
      walletAddress: walletAddress,
      rules: parsedRules,
      addresses: DEMO_ADDRESSES,
    }))

    // Simulate the 7702 upgrade + delegation signing
    // In production: wallet_grantPermissions via MetaMask Flask
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSigning(false)
    router.push('/command-center')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: THEME.bg }}
    >
      <div className="w-full max-w-lg">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl mb-2"
            style={{
              color: THEME.text,
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}
          >
            Wallet with Opinions
          </h1>
          <p className="text-sm" style={{ color: THEME.textMuted }}>
            Give your wallet rules. It acts for you — with agents that hold less power at every hop.
          </p>
          <div className="flex justify-center gap-2 mt-3">
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: THEME.cyan }}>
              ERC-7710
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: THEME.amber }}>
              Venice AI
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: THEME.green }}>
              1Shot
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Connect', 'Rules', 'Sign'].map((label, i) => {
            const stepIndex = ['connect', 'rules', 'signing'].indexOf(step)
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: isDone ? THEME.green : isActive ? THEME.amber : THEME.border,
                    color: isDone || isActive ? THEME.bg : THEME.textMuted,
                  }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="text-xs" style={{ color: isActive ? THEME.text : THEME.textMuted }}>
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className="w-8 h-px"
                    style={{ backgroundColor: isDone ? THEME.green : THEME.border }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Content card */}
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: THEME.bgCard, borderColor: THEME.border }}
        >
          {/* Step 1: Connect */}
          {step === 'connect' && (
            <div className="text-center">
              <div className="text-3xl mb-4">🦊</div>
              <h2 className="text-lg font-medium mb-2" style={{ color: THEME.text }}>
                Connect Your Wallet
              </h2>
              <p className="text-sm mb-6" style={{ color: THEME.textMuted }}>
                Connect MetaMask Flask to begin. Your account will be upgraded to a smart account via EIP-7702.
              </p>
              <button
                onClick={handleConnect}
                className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: THEME.amber, color: THEME.bg }}
              >
                Connect MetaMask Flask
              </button>
            </div>
          )}

          {/* Step 2: Rules */}
          {step === 'rules' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📝</span>
                <h2 className="text-lg font-medium" style={{ color: THEME.text }}>
                  Set Your Rules
                </h2>
              </div>
              <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
                Write rules in plain English. Venice AI will parse them into on-chain caveats (hard limits) and reasoning guidance (soft preferences).
              </p>
              <RuleInput onRulesParsed={handleRulesParsed} />
            </div>
          )}

          {/* Step 3: Sign */}
          {step === 'signing' && (
            <div className="text-center">
              <div className="text-3xl mb-4">🔐</div>
              <h2 className="text-lg font-medium mb-2" style={{ color: THEME.text }}>
                Sign Delegation
              </h2>
              <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
                This will upgrade your account via EIP-7702 and grant the Governor agent a scoped delegation with the rules you defined.
              </p>

              {/* Summary of what will be signed */}
              <div
                className="rounded-lg p-4 mb-6 text-left"
                style={{ backgroundColor: THEME.bg }}
              >
                <div className="text-xs font-medium mb-2" style={{ color: THEME.amber }}>
                  Delegation Summary
                </div>
                <div className="space-y-1 text-xs">
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>From:</span> {walletAddress?.slice(0, 10)}...
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>To:</span> Governor Agent
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>Budget:</span> $10/week (USDC)
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>Expiry:</span> 7 days
                  </div>
                  <div style={{ color: THEME.green }}>
                    <span style={{ color: THEME.textMuted }}>Hard rules:</span>{' '}
                    {parsedRules?.hardConstraints.length || 0} on-chain caveats
                  </div>
                  <div style={{ color: THEME.textMuted }}>
                    Soft preferences: {parsedRules?.softPreferences.length || 0} reasoning rules
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignDelegation}
                disabled={isSigning}
                className="w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: isSigning ? THEME.bgCard : THEME.green,
                  color: THEME.bg,
                }}
              >
                {isSigning ? 'Signing EIP-7702 + Delegation...' : 'Sign & Enter Command Center'}
              </button>
            </div>
          )}
        </div>

        {/* Architecture note */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            User → Governor → Researcher → Summarizer
          </p>
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            Every child holds strictly less power than its parent. Enforced on-chain.
          </p>
        </div>
      </div>
    </div>
  )
}
