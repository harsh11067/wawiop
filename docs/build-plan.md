# Wallet with Opinions — Final Build Plan
### MetaMask Smart Accounts Kit × 1Shot API Hackathon

> **One line:** An autonomous onchain agent with rules (opinions), memory (action log), and budget (delegated allowance) — it acts for you without asking every time, using ERC-7710 redelegation to spawn sub-agents with mathematically narrower scopes, paying for intelligence via x402, executing gaslessly via 1Shot.

---

## Prize Tracks

| Track | Prize | Qualifier |
|---|---|---|
| **Best A2A Coordination** | $3,000 | Real ERC-7710 redelegation chain: Governor → Researcher → Summarizer. Child scope ⊂ parent, enforced onchain. *Primary.* |
| **Best Agent** | $3,000 | Governor is autonomous in the main flow — reasons via Venice, decides, delegates, executes. |
| **Best x402 + ERC-7710** | $3,000 | Every sub-agent data call is an x402 payment executed under a redelegated ERC-7710 scope. |
| **Best Venice AI** | $3,000 | Venice is the reasoning engine of every agent; `<think>` output surfaced in ClearSign before high-stakes actions. |
| **Best 1Shot Relayer** | $1,000 | All executions relay via 1Shot on **mainnet**; **7702** upgrade through the relayer; webhook status. |

---

## Domain: Research Procurement

**Why not DeFi (Aave + Uniswap):** Judges have seen 200 of those. This domain shows the identical architecture with zero "seen-it" fatigue.

**The flow:**
1. User sets rules: *"Research topics I approve. Max $2/week on data. Never act without my ClearSign on transactions above $50."*
2. User grants Governor a scoped delegation (budget caveats + rule caveats) via ERC-7715 + 7702.
3. User queues a research task: *"Analyse on-chain grant activity for Base ecosystem projects."*
4. Governor (Venice AI) decides: spawn Researcher + Summarizer sub-agents, redelegate narrow scopes.
5. Researcher pays x402 for a data endpoint, fetches raw data, gasless via 1Shot.
6. Researcher **redelegates an even narrower scope** (read-only, no payment) to Summarizer.
7. Summarizer synthesizes. Governor receives output.
8. If Governor wants to act (e.g., submit a grant application), ClearSign fires — shows Venice reasoning + plain-English summary before the user approves.

**Demo domain is swappable.** The redelegation chain is identical whether the task is research or yield claiming. Pick research for the pitch.

---

## Architecture

```
USER SMART ACCOUNT (7702-upgraded via 1Shot)
 │
 │  ERC-7715 grant (budget caveat + rule caveats + expiry)
 ▼
GOVERNOR AGENT SA
 │  Venice AI: parse rules → structured constraints (setup)
 │  Venice AI: decide → spawn sub-agents (runtime)
 │  ClearSign: surfaces reasoning before high-stakes actions
 │
 ├── ERC-7710 redelegate ──► RESEARCHER AGENT SA
 │    scope: [data-fetch only, max $0.05/call, this endpoint]
 │    x402 → pays data endpoint → fetches raw data
 │    1Shot → gasless execution
 │    │
 │    └── ERC-7710 redelegate ──► SUMMARIZER AGENT SA
 │         scope: [read-only, no payments, no transfers]
 │         Venice AI → synthesizes → returns to Governor
 │
 └── (stretch) ERC-7710 redelegate ──► RISK SCORER AGENT SA
      scope: [read-only price feeds, no execution]

INVARIANT: child scope ⊂ parent scope at every hop. Enforced onchain.
DEPTH: ≥ 2 hops (Governor → Researcher → Summarizer). Proves recursion.
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Account | MetaMask Gator SDK (`npm create @metamask/gator-app`) |
| Permission Grant | ERC-7715 via `wallet_grantPermissions` |
| Redelegation | ERC-7710 onchain delegation chain |
| Gas Abstraction | **1Shot JSON-RPC Relayer** (see §Critical Facts) |
| Account Upgrade | **EIP-7702** via 1Shot (mandatory for prize) |
| AI Reasoning | Venice AI API |
| Micropayments | x402 |
| Frontend | Next.js + wagmi + viem |
| Contracts | Solidity on Base mainnet |
| Visualization | react-flow (permission tree) |
| Backend | Node.js + Express |

---

## ⚠️ Critical Technical Facts

**Read this section before writing a single line of code.**

### 1Shot is JSON-RPC, not REST

```javascript
// WRONG — will 404
POST https://api.1shotapi.com/relay

// CORRECT
POST https://relayer.1shotapi.com/relayers

// Methods in order:
relayer_getCapabilities
relayer_estimate7710Transaction
relayer_send7710Transaction
relayer_getStatus   // + webhook for async
```

### 7702 is mandatory, not optional

The 1Shot prize requires EIP-7702 account upgrade through the relayer. Do it Day 6. Without it you do not qualify for the $1,000 track.

### Mainnet, not testnet

Build and test on Base Sepolia. **Move to Base mainnet by Day 6.** 1Shot prize requires mainnet execution. Demo must show mainnet tx hashes.

### Redelegation invariant

```solidity
// The only invariant that matters for A2A prize
// Enforced in your delegation caveat contracts
require(subPermission.maxAmount <= parentPermission.maxAmount);
require(subPermission.allowedContracts ⊆ parentPermission.allowedContracts);
require(subPermission.expiry <= parentPermission.expiry);
```

---

## 14-Day Plan

**Solo or 2-person.** Critical path is chain work first, AI second, UI last.

### Day 1 — Scaffold
- [ ] `npm create @metamask/gator-app` on Base Sepolia
- [ ] MetaMask Flask 13.5.0+ connected
- [ ] Governor SA address displayed in UI
- [ ] 1Shot: `relayer_getCapabilities` returns successfully
- [ ] Venice AI API key working, test call returns response

**Gate:** Repo runs. Three API keys confirmed working.

---

### Days 2–3 — User → Governor Delegation
- [ ] Build rule-input UI: freeform text + budget slider + expiry picker
- [ ] Venice AI call at setup: NL rules → structured JSON constraints
- [ ] `wallet_grantPermissions` via Gator SDK (budget caveat + rule caveats + expiry)
- [ ] Store `permissionsContext` for Governor to use

```json
{
  "permissions": [{
    "type": "erc20-token-transfer",
    "data": { "token": "USDC", "allowance": "2000000" },
    "policies": [
      { "type": "time-period", "data": { "period": 604800 } },
      { "type": "rule-caveat", "data": { "rules": "<structured_constraints>" } }
    ]
  }],
  "expiry": 1750000000
}
```

**Gate:** Delegation stored. Governor can read constraints.

---

### Days 4–5 — Redelegation Chain (Critical Path)
- [ ] Deploy Governor contract: receives 7715 permission, can create 7710 sub-delegations
- [ ] Deploy Researcher contract: only permission = call approved data endpoint + x402 spend ≤ $0.05/call
- [ ] Deploy Summarizer contract: read-only, no payments, no transfers
- [ ] Governor `delegateToResearcher()`: scope strictly narrower than received permission
- [ ] Researcher `delegateToSummarizer()`: scope strictly narrower than Researcher's

```solidity
function delegateToResearcher(
    address researcher,
    uint256 maxDataSpend,       // Must be <= parent allowance
    address allowedEndpoint     // Must be subset of parent contracts
) external onlyGovernor onlyIfPermissionValid {
    // Validate narrowing before creating sub-delegation
    require(maxDataSpend <= parentPermission.allowance, "Scope escalation");
    delegation.delegate(researcher, encodeSubPermissions(...));
}
```

- [ ] **Test:** Researcher CANNOT exceed Governor's scope (write this test explicitly)
- [ ] **Test:** Summarizer CANNOT exceed Researcher's scope
- [ ] Depth ≥ 2 hops confirmed onchain

**Gate:** Redelegation chain works on Sepolia. Child ⊂ parent tests pass. This is your A2A prize proof.

---

### Day 6 — 1Shot + 7702 + Mainnet
- [ ] 7702 account upgrade for User SA through 1Shot relayer
- [ ] Replace all direct tx sends with 1Shot JSON-RPC flow:
  - `relayer_estimate7710Transaction` → get fee quote
  - `relayer_send7710Transaction` → submit
  - `relayer_getStatus` + webhook → confirm
- [ ] Test gasless Researcher execution on Sepolia
- [ ] **Move to Base mainnet**
- [ ] Happy path on mainnet: delegation → redelegation → 1Shot execution → confirmed

**Gate:** Full happy path on mainnet. User never pays gas.

---

### Day 7 — Full Agent Loop
- [ ] Governor runtime loop: receive task → Venice AI reasoning → spawn sub-agents
- [ ] Researcher: x402 payment → fetch data → 1Shot execution → return to Governor
- [ ] Summarizer: receives raw data → Venice AI synthesis → returns summary to Governor
- [ ] Governor synthesizes final output
- [ ] Webhook Ed25519 signature verification
- [ ] Action log entry written after every agent action

**Gate:** Full A2A flow runs end-to-end on mainnet.

---

### Day 8 — ClearSign
- [ ] Before any Governor action above threshold: ClearSign panel fires
- [ ] Panel shows: Venice `<think>` output + plain-English summary + exact tx details
- [ ] User approves or rejects
- [ ] Approval → 1Shot execution. Rejection → action logged, execution skipped.

**Gate:** ClearSign fires on high-stakes action. Venice reasoning visible.

---

### Days 9–10 — Permission Tree (The Wow Moment)

This is your demo. Prioritise it.

```
[User Wallet] ──7715──► [Governor] 🟢
                              │ Venice: "Task received. Spawning Researcher."
               ┌──────────────┤
               ▼              ▼
     [Researcher] 🟢    [Summarizer] 🔵
     Scope: fetch+pay   Scope: read-only
     x402: $0.001 paid  Waiting for input
     tx: 0xabc...
```

- [ ] react-flow live permission tree
- [ ] Each node: agent name, exact scope, current status, tx hash
- [ ] Animate: scope bars shrink visually at each delegation hop
- [ ] x402 payment events inline
- [ ] **Revoke button on any node** — instantly kills that branch + all children
- [ ] Real-time updates via polling or websocket

**Gate:** Tree renders live during a run. Scope narrowing is visible. Revoke works.

---

### Day 11 — Hardening
- [ ] Test battery: expired permission, maxAmount hit, Venice says don't execute, revoked mid-run
- [ ] Error states in UI: failed tx, insufficient x402 budget, Venice timeout
- [ ] Scope-escalation attempt → rejected with clear error
- [ ] Edge cases in action log

---

### Day 12 — Mainnet Dress Rehearsal
- [ ] Full 3-minute demo run on mainnet, no mocks
- [ ] Record tx hashes for README proof
- [ ] Fix anything that breaks
- [ ] Deploy frontend to Vercel

---

### Day 13 — Submission Package
- [ ] Demo video recorded (script below)
- [ ] README: architecture diagram + verified citations + mainnet tx hashes + prize track map
- [ ] GitHub clean: no dead API keys, no hardcoded addresses
- [ ] Feedback report drafted

---

### Day 14 — Submit Early
- [ ] Submit on HackQuest
- [ ] Feedback report posted
- [ ] Build thread live

---

## Demo Script (3.5 min)

**0:00–0:20 — Hook**
> "Every DeFi automation tool today gives bots full custody. AgentVault doesn't. Using ERC-7710 delegation, sub-agents get exactly the scope they need — and the math prevents any escalation."

**0:20–1:15 — Setup**
- User types rules in plain English
- Show Venice converting them to structured constraints in real time
- User grants Governor a delegation — show the exact scope on screen
- `wallet_grantPermissions` fires, tx confirmed

**1:15–2:15 — The Core Innovation**
- User submits task: "Research Base ecosystem grant activity"
- Governor spawns Researcher and Summarizer via ERC-7710
- **ZOOM IN on permission tree** — scope bars visually shrink at each hop
- Show: Researcher scope < Governor scope < User scope

**2:15–3:00 — Execution**
- Researcher pays $0.001 x402 for data endpoint
- Summarizer synthesizes via Venice (private reasoning)
- 1Shot relayer executes both — user never touches gas
- ClearSign fires when Governor wants to act — Venice reasoning visible

**3:00–3:30 — Trust Proof**
- Attempt to make Researcher exceed its scope → rejected onchain
- Show permission expiry — auto-revokes
- Hit revoke button on Researcher live — branch killed instantly
- "The math enforces the trust. Not us."

---

## What to Mock if Pressed for Time

| Component | Mock Strategy |
|---|---|
| Venice AI | Return hardcoded JSON `{ shouldExecute: true, reasoning: "..." }` |
| x402 | Log payment events in UI, skip real endpoint |
| Summarizer agent | Inline the summarization in Researcher |
| Real data endpoint | Return static JSON |

**Never mock:** ERC-7710 redelegation, 7702, 1Shot, permission tree visualization.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Redelegation is the hardest part and is on the critical path | Start Day 4. Keep depth = 2. Write scope-narrowing tests before writing contracts. |
| 1Shot DX friction | Day 6 with buffer. Have Gator SDK 7715 browser path as fallback. |
| Demo looks simulated | Use real SA addresses with onchain delegation + explorer links. No fake wallets. |
| Scope creep | Ship Governor + Researcher + Summarizer (depth 2). Everything else is stretch. |
| "Another DeFi bot" fatigue | Research-procurement domain. Lead with the invariant, not the use case. |
| Mainnet cost | Fund agents with $5 USDC total. x402 calls are $0.001 each. |

---

## Citations (Verified arXiv IDs)

Include these in README. Every ID below resolves.

| Citation | Claim it supports |
|---|---|
| Qin & Duan (2026) *"What I Sign Is Not What I See"* — arXiv:2601.16751 | ClearSign / transaction display mismatch |
| South, Pentland et al. (2025) *Authenticated Delegation and Authorized AI Agents* — arXiv:2501.09674 | Scoped agent delegation invariant |
| Vaziry et al. (2025) *Towards Multi-Agent Economies: A2A with Ledger-Anchored Identities and x402* — arXiv:2507.19550 | A2A economy architecture |
| Li et al. (2026) *A402: Binding Payments to Service Execution* — arXiv:2603.01179 | x402 payment-delivery verification |
| (2026) *SoK: Security of Autonomous LLM Agents in Agentic Commerce* — arXiv:2604.15367 | Delegated-spend control as open problem |

**Verify each one loads before putting it in the README.**

---

## Links

- Gator SDK: https://docs.gator.metamask.io
- ERC-7715 guide: https://metamask.io/news/hacker-guide-metamask-delegation-toolkit-erc-7715-actions
- 1Shot API: https://1shotapi.com
- Venice AI: https://venice.ai
- x402: https://x402.org
- Base faucet: https://faucet.base.org
- MetaMask Flask: https://metamask.io/flask

---

## Daily Gut Check

1. Does the redelegation chain still work end-to-end?
2. What single thing would break the demo right now?
3. Am I building features or fixing core?

**Rule:** Never add features when core is broken. Fix core first.
