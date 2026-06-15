# Developer Experience Feedback: MetaMask Smart Accounts Kit × 1Shot × Venice AI

This feedback comes from building **Vectis** — an autonomous on-chain wallet agent using ERC-7710 redelegation chains, EIP-7702 smart-account upgrades, Venice AI reasoning, x402 micropayments, and the 1Shot relayer on Base mainnet.

Every point below is specific, reproducible, and includes a concrete suggestion.

---

## 1. MetaMask Smart Accounts Kit (ERC-7710 / ERC-7715 / EIP-7702)

### What worked well

- The redelegation model is genuinely powerful. Linking a `parentDelegation` directly into `createDelegation` made chaining `User → Governor → Researcher → Summarizer` achievable in a few lines of TypeScript.
- `createCaveatBuilder` is intuitive — encoding `erc20TransferAmount`, `timestamp`, and `limitedCalls` enforcers was clean and readable.
- Viem-based APIs fit naturally into modern TypeScript stacks with no friction.

### What was difficult

**1. Caveat revert messages are opaque and block debugging**

The single biggest time sink in this project was figuring out *why* a delegation redemption failed. When the `DelegationManager` reverts, it throws a generic error with no indication of which caveat failed, which parameter was violated, or which delegation in the chain triggered the rejection.

For a project whose entire security claim rests on caveat enforcement, this is the most urgent gap.

What we needed:

```json
{
  "failedCaveat": "erc20TransferAmount",
  "delegation": "0xf0EB...",
  "expected": "≤50000",
  "received": "75000",
  "unit": "USDC (6 decimals)"
}
```

What we got: `execution reverted`

A structured diagnostic object at the SDK level would cut debugging time by hours per developer.

**2. No guide for server-side signing with frontend-delegated permissions**

The docs cover browser-based signing (MetaMask extension) and local signer creation independently. There is no guide explaining how to securely move a delegation signed in the browser to a backend agent that redeems it server-side. This architecture is the most natural one for autonomous agent systems, but we had to reverse-engineer the alignment between `requestExecutionPermissions` contexts and local `Hex` private keys manually.

A single worked example — "user signs delegation in browser, server-side agent redeems it" — would unblock most agent builders immediately.

**3. Delegation visibility for users**

During demo preparation it became clear that users understand balances and transactions intuitively, but have no mental model for active delegations. There is no built-in way to inspect what delegations are currently live, what caveats they carry, or how to revoke them from a UI.

A delegation inspector — even read-only — would significantly improve user trust and security for any production app on this stack.

---

## 2. 1Shot Relayer (JSON-RPC)

### What worked well

- The JSON-RPC lifecycle (`getCapabilities → estimate → send → getStatus`) is clean and consistent. Once understood, integration is fast.
- `relayer_getCapabilities` eliminates hardcoded assumptions about fee tokens and target addresses — good API design.
- Settlement on Base mainnet was fast. Relayed execution meaningfully improves UX for agent-driven systems.

### What was difficult

**1. No offline testing path**

The entire integration requires live RPC calls. There is no mock relayer, no sandbox mode, and no local simulation package. This means every bug costs a real network round-trip, testing edge cases (estimate failures, webhook misfires, reverted bundles) requires live mainnet setup, and CI pipelines cannot test relayer integration without external network access.

A lightweight mock relayer npm package — simulating capabilities, estimates, status updates, and signed webhooks — would be the highest-leverage improvement for developer experience.

**2. Webhook verification has no working code example**

The docs describe Ed25519 verification against the JWKS endpoint but provide no runnable implementation. We had to derive the verification logic manually from the description. A copy-paste snippet in Node.js (or a utility in the SDK) would save every integrating team from doing this from scratch.

A Stripe CLI-style local webhook forwarder would also help considerably during development.

**3. USDC fee breakdown is underdocumented**

The relationship between `gasUsed`, `requiredPaymentAmount`, and the USDC transfer that must be bundled into the submission is not clearly documented. The first failed submission is almost always a fee miscalculation. A documented formula with a worked example including decimal handling would prevent this.

---

## 3. Venice AI

### What worked well

- OpenAI-compatible API meant integration took minutes, not days.
- Latency was suitable for interactive agent reasoning loops — the Governor's decision cycle ran within acceptable time for a UI-driven demo.
- Using Venice for both rule parsing at setup and live reasoning per-action worked cleanly as a two-role architecture.
- Zero-retention is a genuine differentiator for financial agent use cases and should be more prominent in the documentation.

### What was difficult

**1. JSON output is unreliable without enforced schema**

`llama-3.3-70b` occasionally wraps JSON responses in markdown code blocks, adds conversational prefixes, or omits closing braces. For agent systems that parse every response programmatically, this causes silent failures.

We ended up writing a multi-pass extraction function (strip fences → try parse → regex fallback → error) to defensively handle Venice responses. This should not be necessary.

A strict JSON-output mode — enforced at the API level, not just prompted — would eliminate this class of bug entirely.

**2. No examples for verification and policy-validation use cases**

All documentation examples focus on chat generation. Venice's zero-retention and reasoning capabilities make it well-suited for agent auditing, policy validation, anomaly detection, and decision verification — but none of these patterns appear in the docs. Teams building agent systems discover these use cases late, if at all.

More examples showing Venice as a *verifier* rather than a *generator* would unlock significantly more sophisticated integrations.

**3. No hackathon credit allocation**

API credits become a practical constraint for hackathon teams within the first day of serious testing. A small allocation for verified participants would reduce friction and encourage deeper integrations. Several teams likely built shallow Venice integrations specifically to avoid burning credits during development.

---

## Summary

The most valuable insight from building Vectis was that AI agents become meaningfully trustworthy only when **authorization**, **execution**, and **reasoning** are separated into independent, verifiable layers.

MetaMask provided the authorization layer — cryptographic, composable, on-chain.
1Shot provided the execution layer — gasless, mainnet, auditable.
Venice provided the reasoning layer — private, zero-retention, inspectable.

The combination enables a class of applications — genuinely autonomous, genuinely accountable agents — that none of the three could support alone. The DX gaps above are friction on the path to it, not problems with the direction.
