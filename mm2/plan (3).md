# Wallet with Opinions — Project Plan (refined)

> A living, thinking onchain agent: **opinions** (rules), **memory** (action log), and **budget** (delegated allowance) that let it act for you without asking every time.
> **Targets:** Best A2A coordination (primary) · Best Agent · x402+7710 · Venice · 1Shot.
> **Chain:** Base mainnet. **Team:** 2–3.

This is your idea, kept intact in spirit, with four substantive fixes from the review. Read §2 before building — two of these were win-or-lose.

## 1. The idea (unchanged core)

Three concentric rings: **Ring 1** the Wallet with Opinions (your rules/memory/budget) → **Ring 2** the agent economy (sub-agents, x402, delegation) → **Ring 3** the world (DAOs, protocols, services). You set Ring 1 once; Rings 2–3 run themselves. The Governor agent monitors, reasons (Venice), spawns scoped sub-agents, pays for intelligence via x402, and executes gaslessly via 1Shot.

## 2. The four fixes (do not skip)

**Fix 1 — A2A means redelegation, and that's now the centerpiece (not a side feature).**
The "Best A2A coordination" track has exactly one hard requirement: *"The project should use redelegation."* Your original A2A feature was *voting-bloc negotiation via x402 messaging between 14 wallets* — that is **not redelegation**, and demoing it needs 14 simulated wallets, which judges of *that* track will discount. **Replace it.** The A2A story is the **sub-agent tree as a real ERC-7710 redelegation chain**: Governor holds a delegation from the user, then **redelegates** a strictly narrower, budget-capped delegation to each sub-agent, which may redelegate one hop further. Child scope ⊂ parent, enforced on-chain. That *is* A2A coordination by the track's definition, it's demoable with 2–3 real agent accounts, and the invariant ("a child can never exceed its parent") is your differentiator. Keep at most a *light* coordination flavor (e.g., a Negotiator sub-agent acting under a redelegated, message-only scope), but the prize-qualifying mechanic is the redelegation chain.

**Fix 2 — 1Shot is JSON-RPC, and 7702 is mandatory.**
Your tech map had `POST api.1shotapi.com/v1/relay {userOp}`. The real relayer is **JSON-RPC** at `https://relayer.1shotapi.com/relayers` (`relayer_getCapabilities` → `relayer_estimate7710Transaction` → `relayer_send7710Transaction` → `relayer_getStatus` + webhooks). The 1Shot prize **requires** 7702 account upgrade through the relayer and 7710 relay on **mainnet**; treat 7702 as required, not "optional." See architecture.md §5.

**Fix 3 — Citations: keep one, verify or replace three.**
*Verified real and a perfect match:* Qin & Duan, *"What I Sign Is Not What I See"* (arXiv:2601.16751) — keep it for ClearSign. The other three IDs in your doc (the "Five Attacks on x402," "Agent Economy," "SoK A2A Payments") did **not** resolve in searches. Don't assume they're fake, but **verify each arXiv ID loads before putting it in a README** — one dead link in front of MetaMask judges reads as fabrication. Verified replacements that fit your claims are in §7.

**Fix 4 — Scope, and pick your demo domain honestly.**
Governance voting is the most saturated idea in this exact ecosystem. You can still use it as the demo domain, but know you're in the crowded lane and win on the *redelegation correctness*, not the concept. **Cheaper alternative domain that shows the same architecture with less "seen-it" fatigue:** an agent that *procures research/data* on your behalf (Governor → Researcher → Summarizer, paying per-call), which sidesteps "another DAO bot." Either way, cut to a demoable core (§4) and mark the rest as stretch.

## 3. Track mapping (after fixes)

| Track | Prize | How it qualifies |
|---|---|---|
| **Best A2A coordination** | $3,000 | Real ERC-7710 **redelegation chain** Governor → sub-agents, child ⊂ parent, on-chain. *Primary.* |
| **Best Agent** | $3,000 | Governor is an autonomous agent in the main flow. |
| **Best x402 + ERC-7710** | $3,000 | Every sub-agent service call is an x402 payment via an ERC-7710 (re)delegation. |
| **Best use of Venice AI** | $3,000 | Venice is the reasoning engine of every agent; `<think>`/reasoning surfaced in ClearSign. |
| **Best 1Shot Relayer** | $1,000 | All redemptions relay via 1Shot **mainnet**; **7702** upgrade; webhook status. |
| Social / Feedback | 5×$100 each | Build thread + feedback report. |

## 4. Scope

**In scope (demo must show on mainnet):**
- User SA + 7702 upgrade via 1Shot.
- Governor SA with a delegation from the user (rules + budget caveats).
- Governor **redelegates** narrower scopes to ≥2 sub-agents (Researcher, Summarizer); at least one further hop to prove recursion (depth ≥ 2).
- One x402 service call paid by a sub-agent (Venice or a data endpoint), gasless via 1Shot.
- Venice reasoning surfaced; ClearSign panel before a high-stakes action.
- Action log (memory) shown in the UI.

**Stretch (only if core is green):**
- Risk-Scorer sub-agent; Negotiator/Coordinator under a message-only redelegated scope; on-chain memory attestations; rule editing via ClearSign.

**Cut:** the 14-wallet voting bloc, IPFS memory, depth-3 unless trivial.

## 5. 14-day plan (2–3 people)

**Roles:** **A = Chain** (SAs, delegation, **redelegation chain**, caveats, 1Shot, 7702). **B = Agent** (Governor + sub-agent loops, Venice, x402, rule parsing). **C (if present) = App** (frontend, ClearSign, demo).

| Day | A | B | C / gate |
|---|---|---|---|
| 1 | Scaffold; Governor SA on Base Sepolia; install 1Shot skill | Venice client; Governor loop skeleton; install Venice skill | Repo runs |
| 2–3 | User→Governor delegation w/ budget + rule caveats | NL rules → structured constraints (Venice, setup-time) | Constraints stored & read |
| 4–5 | **Redelegation: Governor→Researcher (narrower), Researcher→Summarizer (narrower).** Tests: child can't exceed parent | x402 client; sub-agent buys from a paid endpoint | **Redelegation chain works (tested)** |
| 6 | 1Shot lifecycle end-to-end; **7702** upgrade; move to mainnet | Sub-agent x402 call gasless via 1Shot | Happy path on mainnet |
| 7 | Webhook + Ed25519 verify; fresh salts | Governor synthesizes sub-agent outputs → decision | Full A2A flow on mainnet |
| 8 | Harden redelegation edge cases | ClearSign: Venice reasoning + plain-English summary before high-stakes action | ClearSign fires |
| 9–10 | Record tx hashes | Action-log/memory view | Dashboard demo-ready |
| 11 | Redelegation test battery (test.md) | Edge cases, copy | Tests pass |
| 12 | Mainnet dress rehearsal | Fix | Clean 3-min run |
| 13 | Backup evidence | Record video; README + real cites; social | Video + README done |
| 14 (Jun 15) | Submit early; feedback report | — | **Submitted** |

## 6. Risk register

| Risk | Mitigation |
|---|---|
| Recursive redelegation is the hardest part and it's on the critical path | Start Day 4; use the toolkit's redelegation guide; keep to depth 2 for the demo; tests prove child ⊂ parent |
| Governance domain reads as "another DAO bot" | Lean on redelegation correctness in the pitch; consider the research-procurement domain (§2 Fix 4) |
| Demo looks simulated | Use 2–3 **real** agent smart accounts with on-chain delegations + explorer links; no fake wallets |
| 1Shot/7702 DX | Day 6 with buffer; browser 7715 path handles 7702 |
| Scope creep (4 sub-agents) | Ship 2 + one extra hop; rest is stretch |

## 7. Citations

Keep: **Qin & Duan (2026)** *"What I Sign Is Not What I See"* arXiv:2601.16751 (verified) → ClearSign.
Add (verified this cycle):
- **South, Pentland, et al. (2025)** *Authenticated Delegation and Authorized AI Agents.* arXiv:2501.09674 → foundational for scoped agent delegation (your redelegation invariant).
- **Vaziry, Rodriguez Garzon, Küpper (2025)** *Towards Multi-Agent Economies: Enhancing A2A with Ledger-Anchored Identities and x402 Micropayments.* arXiv:2507.19550 → the A2A-economy blueprint.
- **Li et al. (2026)** *A402: Binding Payments to Service Execution.* arXiv:2603.01179 → x402 payment-delivery gap (motivates verifying sub-agent deliverables).
- **(2026)** *SoK: Security of Autonomous LLM Agents in Agentic Commerce.* arXiv:2604.15367 → delegated-spend control as an open problem.
**Verify, then keep or drop:** the three unresolved IDs from your original doc.
