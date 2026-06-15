'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useConnect, useWalletClient } from 'wagmi'
import RuleInput from '@/components/RuleInput'
import { THEME, USDC_ADDRESS, ACTIVE_CHAIN } from '@/lib/constants'
import { short } from '@/components/ui'
import type { ParsedRules } from '@/lib/types'
import type { Address, Hex } from 'viem'

const DEMO_RULES =
  'Maximum $10 per week budget. No single transaction above $5. Only allow research and data-fetching tasks. Prefer conservative low-cost operations. Escalate to ClearSign for anything above $0.50. Block swaps, bridges, and leverage positions.'

export default function Home() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { data: walletClient } = useWalletClient()

  const [step, setStep] = useState<'connect' | 'rules' | 'signing'>('connect')
  const [parsedRules, setParsedRules] = useState<ParsedRules | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [addresses, setAddresses] = useState<Record<string, Address>>({})
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const post = (body: object) =>
    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const zeroAddrs = {
    user: '0x0000000000000000000000000000000000000000' as Address,
    governor: '0x0000000000000000000000000000000000000000' as Address,
    researcher: '0x0000000000000000000000000000000000000000' as Address,
    summarizer: '0x0000000000000000000000000000000000000000' as Address,
  }

  const initializeOnServer = useCallback(async (walletAddr?: Address) => {
    setIsInitializing(true)
    setError(null)
    try {
      const res = await post({
        action: 'initialize',
        addresses: {
          user: walletAddr || zeroAddrs.user,
          governor: walletAddr || zeroAddrs.governor,
          researcher: walletAddr || zeroAddrs.researcher,
          summarizer: walletAddr || zeroAddrs.summarizer,
        },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.addresses) setAddresses(data.addresses)
      setStep('rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize agents')
    } finally {
      setIsInitializing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isConnected && address && step === 'connect') initializeOnServer(address)
  }, [isConnected, address, step, initializeOnServer])

  const handleConnect = () => {
    setError(null)
    if (isConnected && address) {
      initializeOnServer(address)
      return
    }
    const mm = connectors.find(
      (c) => c.id === 'io.metamask' || c.id === 'metaMask' || c.name === 'MetaMask',
    )
    if (mm) connect({ connector: mm })
    else if (connectors.length > 0) connect({ connector: connectors[0] })
    else setError('No wallet connector found. Install MetaMask.')
  }

  const handleDemoMode = async () => {
    setIsDemoMode(true)
    setError(null)
    setIsInitializing(true)
    try {
      const res = await post({ action: 'initialize', addresses: zeroAddrs })
      const data = await res.json()
      if (data.addresses) setAddresses(data.addresses)
      await post({ action: 'set-rules', rules: DEMO_RULES })
      localStorage.setItem(
        'vectis-state',
        JSON.stringify({
          walletAddress: data.addresses?.user || addresses.user,
          rules: null,
          addresses: data.addresses || addresses,
          demoMode: true,
        }),
      )
      router.push('/command-center')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start demo')
    } finally {
      setIsInitializing(false)
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
      if (isDemoMode || !walletClient) {
        localStorage.setItem(
          'vectis-state',
          JSON.stringify({ walletAddress: address || addresses.user, rules: parsedRules, addresses, demoMode: isDemoMode }),
        )
        router.push('/command-center')
        return
      }
      if (!addresses.governor) throw new Error('Governor address not loaded — reinitialize agents')

      const { erc7715ProviderActions } = await import('@metamask/smart-accounts-kit/actions')
      const extendedClient = walletClient.extend(erc7715ProviderActions())
      const result = await extendedClient.requestExecutionPermissions([
        {
          chainId: ACTIVE_CHAIN.id,
          permission: {
            type: 'erc20-token-allowance' as const,
            isAdjustmentAllowed: false,
            data: { allowanceAmount: 10_000_000n, tokenAddress: USDC_ADDRESS },
          },
          to: addresses.governor as Hex,
          expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
      ])
      if (result && result.length > 0) {
        localStorage.setItem(
          'vectis-permission-context',
          JSON.stringify({ context: result[0].context, delegationManager: result[0].delegationManager }),
        )
      }
      localStorage.setItem(
        'vectis-state',
        JSON.stringify({ walletAddress: address, rules: parsedRules, addresses }),
      )
      router.push('/command-center')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign delegation')
    } finally {
      setIsSigning(false)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(
      'vectis-state',
      JSON.stringify({ walletAddress: address || addresses.user, rules: parsedRules, addresses, demoMode: true }),
    )
    router.push('/command-center')
  }

  const displayAddress = address || addresses.user
  const steps = ['Connect', 'Rules', 'Sign'] as const
  const stepIndex = ['connect', 'rules', 'signing'].indexOf(step)

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
      <div className="w-full" style={{ maxWidth: 560 }}>
        {/* Logo / title */}
        <div className="text-center" style={{ marginBottom: 28 }}>
          <div className="flex items-center justify-center gap-3" style={{ marginBottom: 14 }}>
            <div
              className="font-display flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(240,88,74,0.55)',
                background: 'linear-gradient(140deg, rgba(240,88,74,0.2), rgba(240,88,74,0.02))',
                color: THEME.red,
                fontStyle: 'italic',
                fontSize: 28,
                paddingBottom: 8,
                boxSizing: 'border-box',
              }}
            >
              ”
            </div>
          </div>
          <h1 className="font-display" style={{ fontSize: 40, lineHeight: 1.05, color: THEME.text }}>
            The wallet that has{' '}
            <span style={{ fontStyle: 'italic', color: THEME.red }}>something to say</span>
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: THEME.textMuted, marginTop: 12, maxWidth: 460, marginInline: 'auto' }}>
            Give it opinions, memory, and a budget — authority flows down a cryptographic chain where
            every link holds <span style={{ color: THEME.text }}>less power than the one above it</span>,
            enforced on-chain.
          </p>
          <div className="flex justify-center gap-1.5" style={{ marginTop: 14 }}>
            {[
              { t: 'ERC-7710', c: THEME.cyan },
              { t: 'VENICE AI', c: THEME.amber },
              { t: '1SHOT', c: THEME.green },
              { t: 'BASE', c: THEME.baseBlue },
            ].map(({ t, c }) => (
              <span
                key={t}
                className="font-mono"
                style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${THEME.border}`, color: c }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 22 }}>
          {steps.map((label, i) => {
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center font-mono"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    fontSize: 10,
                    fontWeight: 600,
                    background: isDone ? THEME.green : isActive ? THEME.amber : 'transparent',
                    border: isDone || isActive ? 'none' : `1px solid ${THEME.borderStrong}`,
                    color: isDone || isActive ? '#0B0708' : THEME.textFaint,
                  }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="font-mono" style={{ fontSize: 10, letterSpacing: 1, color: isActive ? THEME.text : THEME.textFaint }}>
                  {label.toUpperCase()}
                </span>
                {i < steps.length - 1 && <div style={{ width: 28, height: 1, background: isDone ? THEME.green : THEME.border }} />}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div style={{ borderRadius: 16, border: `1px solid ${THEME.border}`, background: THEME.bgCard, padding: 24 }}>
          {step === 'connect' && (
            <div className="text-center">
              <div className="mono-label" style={{ color: THEME.textMuted, marginBottom: 14 }}>◆ STEP 1 — CONNECT</div>
              <h2 className="font-display" style={{ fontSize: 24, color: THEME.text, marginBottom: 8 }}>
                Connect your wallet
              </h2>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 22, lineHeight: 1.6 }}>
                Connect MetaMask to initialize the agent hierarchy via the Smart Accounts Kit
                (ERC-7710 delegations) — or launch the live demo to watch the full pipeline.
              </p>
              <button
                onClick={handleConnect}
                disabled={isInitializing}
                className="w-full font-mono"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', background: THEME.amber, color: '#0B0708', opacity: isInitializing ? 0.6 : 1 }}
              >
                {isInitializing && !isDemoMode ? 'INITIALIZING AGENTS…' : isConnected ? 'CONTINUE WITH CONNECTED WALLET' : 'CONNECT METAMASK'}
              </button>

              <div className="flex items-center gap-3" style={{ margin: '16px 0' }}>
                <div className="flex-1" style={{ height: 1, background: THEME.border }} />
                <span className="font-mono" style={{ fontSize: 9, color: THEME.textFaint }}>OR</span>
                <div className="flex-1" style={{ height: 1, background: THEME.border }} />
              </div>

              <button
                onClick={handleDemoMode}
                disabled={isInitializing}
                className="w-full font-mono"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: 13, borderRadius: 10, cursor: 'pointer', background: 'transparent', color: THEME.cyan, border: `1px solid ${THEME.cyan}` }}
              >
                {isInitializing && isDemoMode ? 'STARTING DEMO…' : '▶ LAUNCH LIVE DEMO'}
              </button>
              <p style={{ fontSize: 11, color: THEME.textFaint, marginTop: 10, lineHeight: 1.5 }}>
                Real delegation signing, Venice AI reasoning, and the 1Shot execution flow — no wallet required.
              </p>
              {error && <p style={{ fontSize: 11, color: THEME.red, marginTop: 12 }}>{error}</p>}
            </div>
          )}

          {step === 'rules' && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <div className="mono-label" style={{ color: THEME.textMuted }}>◆ STEP 2 — GIVE IT OPINIONS</div>
                <div className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9, color: THEME.green }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.green, display: 'inline-block' }} />
                  {short(displayAddress, 6, 4)}
                </div>
              </div>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                Write rules in plain English. Venice splits them into{' '}
                <span style={{ color: THEME.cyan }}>on-chain caveats</span> the chain enforces, and{' '}
                <span style={{ color: THEME.amber }}>reasoning guidance</span> the agent thinks with.
              </p>
              <RuleInput onRulesParsed={handleRulesParsed} />
            </div>
          )}

          {step === 'signing' && (
            <div className="text-center">
              <div className="mono-label" style={{ color: THEME.textMuted, marginBottom: 14 }}>◆ STEP 3 — GRANT DELEGATION</div>
              <h2 className="font-display" style={{ fontSize: 24, color: THEME.text, marginBottom: 8 }}>
                Sign the root delegation
              </h2>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
                MetaMask will grant the Governor a scoped USDC delegation via ERC-7715 advanced permissions.
              </p>

              <div style={{ borderRadius: 12, background: THEME.bgNode, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                <div className="mono-label" style={{ color: THEME.amber, marginBottom: 10 }}>DELEGATION SUMMARY</div>
                {[
                  ['FROM', `${short(displayAddress, 8, 4)} · your wallet`],
                  ['TO', `${short(addresses.governor, 8, 4)} · Governor`],
                  ['PERMISSION', 'erc20-token-allowance (USDC)'],
                  ['BUDGET', '10.00 USDC / week'],
                  ['EXPIRY', '7 days'],
                  ['HARD RULES', `${parsedRules?.hardConstraints.length || 0} on-chain caveats`],
                  ['SOFT PREFS', `${parsedRules?.softPreferences.length || 0} reasoning rules`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between font-mono" style={{ fontSize: 10, padding: '4px 0' }}>
                    <span style={{ color: THEME.textFaint }}>{k}</span>
                    <span style={{ color: THEME.textSoft }}>{v}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSignDelegation}
                disabled={isSigning}
                className="w-full font-mono"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', background: isSigning ? THEME.bgNode : THEME.green, color: isSigning ? THEME.textFaint : '#0B0708' }}
              >
                {isSigning ? 'REQUESTING PERMISSION…' : 'SIGN & ENTER COMMAND CENTER'}
              </button>
              <button
                onClick={handleSkip}
                className="w-full font-mono"
                style={{ marginTop: 10, fontSize: 10, letterSpacing: 0.5, padding: 10, borderRadius: 10, cursor: 'pointer', background: 'transparent', color: THEME.textMuted, border: `1px solid ${THEME.border}` }}
              >
                Skip signing — use server-side delegations only
              </button>
              {error && <p style={{ fontSize: 11, color: THEME.red, marginTop: 12 }}>{error}</p>}
            </div>
          )}
        </div>

        {/* chain note */}
        <div className="text-center font-mono" style={{ marginTop: 22, fontSize: 10, lineHeight: 1.8, color: THEME.textFaint }}>
          <div>USER → GOVERNOR → RESEARCHER → SUMMARIZER</div>
          <div>Every child holds strictly less power than its parent · enforced on-chain via ERC-7710</div>
        </div>
      </div>
    </div>
  )
}
