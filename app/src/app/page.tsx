'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useConnect, useWalletClient } from 'wagmi'
import RuleInput from '@/components/RuleInput'
import { THEME, USDC_ADDRESS, ACTIVE_CHAIN } from '@/lib/constants'
import type { ParsedRules } from '@/lib/types'
import type { Address, Hex } from 'viem'

export default function Home() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect, connectors, error: connectErr } = useConnect()
  const { data: walletClient } = useWalletClient()

  const [step, setStep] = useState<'connect' | 'rules' | 'signing'>('connect')
  const [parsedRules, setParsedRules] = useState<ParsedRules | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [addresses, setAddresses] = useState<Record<string, Address>>({})
  const [error, setError] = useState<string | null>(null)

  // Initialize agents on the server once wallet is connected
  const initializeOnServer = useCallback(async (walletAddr: Address) => {
    setIsInitializing(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          addresses: {
            user: walletAddr,
            governor: walletAddr,
            researcher: walletAddr,
            summarizer: walletAddr,
          },
        }),
      })
      const data = await res.json()
      if (data.addresses) {
        setAddresses(data.addresses)
      }
      setStep('rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize agents')
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // Auto-advance if wallet is already connected (page reload)
  useEffect(() => {
    if (isConnected && address && step === 'connect') {
      initializeOnServer(address)
    }
  }, [isConnected, address, step, initializeOnServer])

  const handleConnect = () => {
    setError(null)
    // Find the MetaMask connector from our wagmi config
    const mmConnector = connectors.find(
      (c) => c.id === 'io.metamask' || c.id === 'metaMask' || c.name === 'MetaMask'
    )
    if (mmConnector) {
      connect({ connector: mmConnector })
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] })
    } else {
      setError('No wallet connector found. Install MetaMask Flask.')
    }
  }

  const handleRulesParsed = (rules: ParsedRules) => {
    setParsedRules(rules)
    setStep('signing')
  }

  const handleSignDelegation = async () => {
    setIsSigning(true)
    setError(null)

    try {
      // Request ERC-7715 Advanced Permissions via MetaMask Flask
      if (!walletClient) {
        throw new Error('Wallet client not available — reconnect MetaMask')
      }
      if (!addresses.governor) {
        throw new Error('Governor address not loaded — reinitialize agents')
      }

      const { erc7715ProviderActions } = await import(
        '@metamask/smart-accounts-kit/actions'
      )
      const extendedClient = walletClient.extend(erc7715ProviderActions())

      const result = await extendedClient.requestExecutionPermissions([
        {
          chainId: ACTIVE_CHAIN.id,
          permission: {
            type: 'erc20-token-allowance' as const,
            isAdjustmentAllowed: false,
            data: {
              allowanceAmount: 10_000_000n, // 10 USDC (6 decimals)
              tokenAddress: USDC_ADDRESS,
            },
          },
          to: addresses.governor as Hex,
          expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
        },
      ])

      // Store the permission context for later redemption
      if (result && result.length > 0) {
        localStorage.setItem(
          'vectis-permission-context',
          JSON.stringify({
            context: result[0].context,
            delegationManager: result[0].delegationManager,
          })
        )
      }

      // Save state for the command center
      localStorage.setItem(
        'vectis-state',
        JSON.stringify({
          walletAddress: address,
          rules: parsedRules,
          addresses,
        })
      )

      router.push('/command-center')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign delegation')
    } finally {
      setIsSigning(false)
    }
  }

  const displayAddress = address || addresses.user

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
            Give your wallet rules. It acts for you — with agents that hold less
            power at every hop.
          </p>
          <div className="flex justify-center gap-2 mt-3">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: THEME.border, color: THEME.cyan }}
            >
              ERC-7710
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: THEME.border, color: THEME.amber }}
            >
              Venice AI
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: THEME.border, color: THEME.green }}
            >
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
                    backgroundColor: isDone
                      ? THEME.green
                      : isActive
                        ? THEME.amber
                        : THEME.border,
                    color: isDone || isActive ? THEME.bg : THEME.textMuted,
                  }}
                >
                  {isDone ? '\u2713' : i + 1}
                </div>
                <span
                  className="text-xs"
                  style={{ color: isActive ? THEME.text : THEME.textMuted }}
                >
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className="w-8 h-px"
                    style={{
                      backgroundColor: isDone ? THEME.green : THEME.border,
                    }}
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
              <div className="text-3xl mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" className="mx-auto">
                  <rect width="40" height="40" rx="8" fill="#F6851B" />
                  <path d="M30 12l-8 6 1.5-3.5L30 12z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5" />
                  <path d="M10 12l8 6-1.5-3.5L10 12z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
                  <path d="M27 25l-2 3.5 5-1.5 1.5-3.5L27 25z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
                  <path d="M8.5 23.5L10 27l5 1.5-2-3.5-4.5-1.5z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" />
                </svg>
              </div>
              <h2
                className="text-lg font-medium mb-2"
                style={{ color: THEME.text }}
              >
                Connect MetaMask
              </h2>
              <p className="text-sm mb-6" style={{ color: THEME.textMuted }}>
                Connect your MetaMask wallet to initialize the agent hierarchy.
                Uses Smart Accounts Kit for ERC-7710 delegations.
              </p>
              <button
                onClick={handleConnect}
                disabled={isInitializing}
                className="w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: THEME.amber, color: THEME.bg }}
              >
                {isInitializing
                  ? 'Initializing agents...'
                  : 'Connect MetaMask Wallet'}
              </button>
              {(error || connectErr) && (
                <p className="text-xs mt-3" style={{ color: THEME.red }}>
                  {error || connectErr?.message}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Rules */}
          {step === 'rules' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">&#x1F4DD;</span>
                <h2
                  className="text-lg font-medium"
                  style={{ color: THEME.text }}
                >
                  Set Your Rules
                </h2>
              </div>

              {/* Connection status */}
              <div
                className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: THEME.bg }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: THEME.green }}
                />
                <span style={{ color: THEME.green }}>
                  Connected: {displayAddress?.slice(0, 6)}...
                  {displayAddress?.slice(-4)}
                </span>
                <span
                  className="ml-auto px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: THEME.border,
                    color: THEME.cyan,
                  }}
                >
                  Keys loaded
                </span>
              </div>

              <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
                Write rules in plain English. Venice AI will parse them into
                on-chain caveats (hard limits) and reasoning guidance (soft
                preferences).
              </p>
              <RuleInput onRulesParsed={handleRulesParsed} />
            </div>
          )}

          {/* Step 3: Sign */}
          {step === 'signing' && (
            <div className="text-center">
              <div className="text-3xl mb-4">&#x1F510;</div>
              <h2
                className="text-lg font-medium mb-2"
                style={{ color: THEME.text }}
              >
                Grant Delegation
              </h2>
              <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
                MetaMask will request permission to grant the Governor agent a
                scoped USDC delegation via ERC-7715 Advanced Permissions.
              </p>

              {/* Delegation summary */}
              <div
                className="rounded-lg p-4 mb-6 text-left"
                style={{ backgroundColor: THEME.bg }}
              >
                <div
                  className="text-xs font-medium mb-2"
                  style={{ color: THEME.amber }}
                >
                  Delegation Summary
                </div>
                <div className="space-y-1 text-xs">
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>From:</span>{' '}
                    {displayAddress?.slice(0, 10)}...{displayAddress?.slice(-4)}{' '}
                    <span style={{ color: THEME.cyan }}>(your wallet)</span>
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>To:</span>{' '}
                    {addresses.governor
                      ? `${addresses.governor.slice(0, 10)}...${addresses.governor.slice(-4)}`
                      : '...'}{' '}
                    <span style={{ color: THEME.amber }}>(Governor)</span>
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>Permission:</span>{' '}
                    erc20-token-allowance (USDC)
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>Budget:</span>{' '}
                    10 USDC / week
                  </div>
                  <div style={{ color: THEME.text }}>
                    <span style={{ color: THEME.textMuted }}>Expiry:</span> 7
                    days
                  </div>
                  <div style={{ color: THEME.green }}>
                    <span style={{ color: THEME.textMuted }}>Hard rules:</span>{' '}
                    {parsedRules?.hardConstraints.length || 0} on-chain caveats
                  </div>
                  <div style={{ color: THEME.textMuted }}>
                    Soft preferences:{' '}
                    {parsedRules?.softPreferences.length || 0} reasoning rules
                  </div>
                  <div style={{ color: THEME.green }}>
                    <span style={{ color: THEME.textMuted }}>Signing:</span>{' '}
                    Server-side + MetaMask ERC-7715
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
                {isSigning
                  ? 'Requesting permission from MetaMask...'
                  : 'Sign & Enter Command Center'}
              </button>

              {error && (
                <p className="text-xs mt-3" style={{ color: THEME.red }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Architecture note */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            User &rarr; Governor &rarr; Researcher &rarr; Summarizer
          </p>
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            Every child holds strictly less power than its parent. Enforced
            on-chain via ERC-7710.
          </p>
        </div>
      </div>
    </div>
  )
}
