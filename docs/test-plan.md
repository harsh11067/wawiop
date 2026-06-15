# Wallet with Opinions — Test Plan (refined)

The prize-qualifying claim is **"a redelegated child can never exceed its parent."** The tests must prove that on-chain. As with Aegis, distinguish *app declined* from *chain reverted* — only the latter qualifies.

## 1. Unit — redelegation invariant (the core)

Set up a chain USER → GOVERNOR → RESEARCHER → SUMMARIZER. Then attempt violations one at a time and assert an on-chain revert at redemption.

| # | Test | Assert |
|---|---|---|
| 1.1 | **Child over-spends** | Researcher redeems a transfer above its budget slice → `redeemDelegations` **reverts** |
| 1.2 | **Child calls out-of-scope target** | Researcher calls a method not in the parent allowlist → reverts |
| 1.3 | **Child redelegates wider than it holds** | Researcher tries to grant Summarizer a scope Researcher lacks → invalid chain / reverts on redeem |
| 1.4 | **Zero-budget child spends** | Summarizer (budget 0) attempts any payment → reverts |
| 1.5 | **Parent budget bounds the subtree** | Sum of children's spend cannot exceed Governor's remaining budget → over-budget redemption reverts |
| 1.6 | **Valid in-scope action** | Researcher redeems an allowed read/pay within budget+window → succeeds |
| 1.7 | **Expired delegation** | Redeem after time window → reverts |

> 1.3 is the one judges of the A2A track care about most: "narrower than parent" must be cryptographic, not policy. Submit the redemption bypassing the agent code — it must still revert.

## 2. Integration

| # | Test | Assert |
|---|---|---|
| 2.1 | Smart account + **7702** upgrade (mainnet) | Account upgraded; reads as smart account |
| 2.2 | 1Shot lifecycle | `getCapabilities→estimate→send→status` → Confirmed; USDC fee; explorer hash |
| 2.3 | Webhook | Signed event received; Ed25519 verifies vs JWKS |
| 2.4 | x402 sub-agent call | 402 parsed → paid via redelegation → 200 data → gasless via 1Shot |
| 2.5 | Full A2A flow | Governor redelegates → Researcher pays+fetches → Summarizer compresses → Governor decides → executes; all on mainnet |
| 2.6 | Rule parsing | NL rules → structured constraints; hard ones become caveats, soft ones become prompt |
| 2.7 | ClearSign trigger | Fires on novel/high-stakes action; not on routine repeats |
| 2.8 | (optional) Proof-of-delivery | Junk payload → no redemption |

## 3. Adversarial

| # | Attack | Expected |
|---|---|---|
| 3.1 | Compromise a sub-agent, try to exceed scope | On-chain revert (caveats) |
| 3.2 | Prompt-inject Governor to overspend | Budget/per-tx caveats revert |
| 3.3 | Replay a redemption | Fresh salt + window reject |
| 3.4 | Forge a wider redelegation off-chain | Invalid chain; redeem reverts |

## 4. Mainnet dress rehearsal (Day 12)

- [ ] 7702 upgrade confirmed (hash saved).
- [ ] Redelegation chain established on-chain; each hop's hash saved.
- [ ] Sub-agent x402 payment Confirmed; gasless; hash saved.
- [ ] Full Governor→sub-agents→decision→execute run < 3 min.
- [ ] ClearSign renders Venice reasoning.
- [ ] DelegationTree shows real hashes; subset relationship visible.
- [ ] Webhook received + verified during run.

## 5. Acceptance → track requirements

| Requirement | Test |
|---|---|
| Redelegation (A2A track) | 1.1–1.5, 2.5 |
| Smart Accounts in main flow (Agent) | 2.1, 1.6 |
| x402 via 7710 | 2.4 |
| Venice meaningful in main flow | 2.6, 2.7 |
| 1Shot mainnet relay + 7702 + webhook | 2.2, 2.1, 2.3 |
