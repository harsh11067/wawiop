# Wallet with Opinions — Architecture (refined)

## 1. Actors

- **User EOA** → upgraded to a MetaMask Smart Account (7702).
- **User Smart Account (USA)** — holds the budget; issues the root delegation to the Governor with rule + budget caveats.
- **Governor Agent SA** — the executive agent. Holds a delegation from the USA. **Redelegates** narrower scopes to sub-agents. Reasons via Venice; executes via 1Shot.
- **Sub-agent SAs** (Researcher, Summarizer, [stretch: Risk-Scorer, Negotiator]) — each holds a delegation **redelegated** from its parent, strictly narrower in scope and budget. May redelegate one hop further.
- **1Shot Public Relayer** — gasless relay, USDC fee, 7702, webhooks.
- **Venice AI** — reasoning engine for every agent; also produces ClearSign explanations.
- **x402 services** — Venice endpoints / data feeds the sub-agents pay per-call.

## 2. The redelegation chain (this is the A2A prize mechanic)

```
USER SA  ──delegation(scope: budget≤$10/wk, rules, vote+spawn)──►  GOVERNOR SA
GOVERNOR SA ──redelegation(scope ⊂ parent: read+web, budget≤20% remaining)──► RESEARCHER SA
RESEARCHER SA ──redelegation(scope ⊂ parent: text-only, budget 0)──► SUMMARIZER SA
                              │
                              └ (stretch) GOVERNOR ──redelegation(read-only, ≤10%)──► RISK-SCORER SA
```

**Invariant (enforced on-chain by caveat enforcers at redemption):** every child delegation is the *intersection* of the parent's authority and the child's caveats. A child cannot:
- spend more than its budget slice,
- call targets/methods outside the parent's allowlist,
- redelegate wider than it holds.

This is the demonstrable claim. It maps to South/Pentland (2501.09674) authenticated delegation and is exactly what "Best A2A coordination: project should use redelegation" asks for.

```ts
import { toMetaMaskSmartAccount, Implementation, createDelegation } from "@metamask/smart-accounts-kit";

// Governor holds `rootDelegation` from USA. To redelegate to Researcher:
const subDelegation = createDelegation({
  from: governorSmartAccount.address,   // delegate-turned-delegator
  to: researcherAddress,
  parentDelegation: rootDelegation,      // ties the chain; child ⊂ parent
  scope: { type: "erc20TransferAmount", tokenAddress: USDC, maxAmount: budgetSlice },
  caveats: [ /* read-only target allowlist, web-search method allowlist, time window */ ],
});
const sig = await governorSmartAccount.signDelegation({ delegation: subDelegation });
// Researcher redeems the CHAIN [rootDelegation, subDelegation] via DelegationManager.redeemDelegations
```

> Follow the toolkit's **Redelegation guide** for the exact chain-encoding + `redeemDelegations` mode for multi-hop chains. Confirm enforcer names/params in the Caveats reference (toolkit 1.5.x).

## 3. Intent layer (rules → caveats)

At setup, the user writes rules in plain English. Venice parses them into structured constraints once (setup-time, not per-action). Two kinds:
- **Hard constraints → caveats** (budget cap, per-tx cap, payee/target allowlist, time window). Enforced on-chain.
- **Soft preferences → Governor system prompt** ("prefer long-term protocol health"). Enforced by reasoning, not chain.

Be explicit in the demo about which is which — judges will ask "what's actually enforced vs. just prompted." On-chain caveats are the credible part.

## 4. Governor reasoning loop

```
monitor (relevant on-chain events / a proposal / a research task)
  → Researcher (redelegated) fetches context via x402-paid Venice/web call
  → Summarizer (redelegated) compresses to structured summary
  → Governor reasons (Venice) over rules + summary → decision + reasoning trace
  → if high-stakes/novel → ClearSign (show reasoning + plain English) → else act
  → execute via 1Shot (gasless); log to memory
```

## 5. 1Shot relayer integration

JSON-RPC at `https://relayer.1shotapi.com/relayers`. Same lifecycle for every redemption (including sub-agent x402 payments):

```
relayer_getCapabilities("8453") → { acceptedTokens, feeCollector, targetAddress }  // cache; targetAddress == delegation `to`
relayer_estimate7710Transaction({ chainId, transactions }) → { success, requiredPaymentAmount, context }
relayer_send7710Transaction({ chainId, transactions, context, destinationUrl }) → { TaskId }
webhook (verify Ed25519 vs JWKS)  ||  relayer_getStatus(TaskId)  // terminal: Confirmed/Rejected/Reverted
```

- **7702 upgrade** through the relayer for both USA and agent accounts as needed (prize requirement). Browser 7715 flow handles 7702; local signers add one `authorizationList` entry on first use.
- Don't hardcode the fee token; include a stablecoin fee transfer in the bundle; fresh salt per send; hex-safe JSON; prefer webhooks (scores higher).

## 6. Venice integration

OpenAI-compatible. Roles:
- **Setup parser:** NL rules → structured constraints (run once).
- **Researcher model:** web/context retrieval (paid via x402).
- **Summarizer model:** compress to ≤500-token structured summary.
- **Governor reasoning model:** decision + reasoning trace.
- **ClearSign:** turn the decision + caveat context into plain English.

> Confirm current Venice model IDs + base URL at build time; don't hardcode a model name from memory. Zero-retention is a talking point: your governance/financial strategy isn't trained on.

## 7. ClearSign (the readability layer)

Before a high-stakes or novel action, render Venice's reasoning trace + a plain-English summary + cost + remaining budget, with [Proceed] / [Override] / [Edit rules]. Triggers: first time for an action type, risk over threshold, portfolio impact over threshold, budget under 20%, or on demand. Directly motivated by Qin & Duan (2601.16751): users misread raw caveat parameters, so show intent in language.

## 8. x402 (with optional proof-of-delivery)

Each sub-agent service call: GET → 402 → pay via (re)delegation → 200 + data. **Optional hardening** (borrow from the A402 gap): gate redemption on a deterministic check that the returned payload matches the request before settling — cheap to add and a credible answer to "what if a paid service returns junk?"

## 9. Memory

Local action log for the demo: each entry = {ts, actor, action, reasoning, x402 cost, tx hash, outcome}. Shown in the UI. On-chain attestation/IPFS is stretch, not needed to win.

## 10. Threat model (mini)

| Threat | Mitigation |
|---|---|
| Sub-agent exceeds its grant | Child ⊂ parent enforced on-chain; redemption reverts |
| Compromised Governor drains budget | Budget + per-tx + payee caveats on the root delegation |
| Paid service returns junk | Optional proof-of-delivery gate (§8) |
| Replay | Fresh salt + time window |
| User can't read the delegation | ClearSign plain-English layer |

## 11. Repo layout

```
/app
  /src
    /app               # Next.js pages and API endpoints (api/agent, api/events)
    /components        # Frontend components (DelegationTree, ActivityFeed, ClearSign)
    /lib
      /agents          # Governor agent logic and memory state
      delegation.ts    # Cryptographic ERC-7710/7715 signing & validation
      oneshot.ts       # 1Shot JSON-RPC gasless relayer client
      venice.ts        # Venice AI API wrapper for reasoning and rule parsing
      x402.ts          # Micropayment handling (client and endpoints)
/docs                  # Refined plans, specifications, and showcases
/dashboard             # Static mockups and screenshots
```
