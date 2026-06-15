# Wallet with Opinions

**A living, thinking onchain agent.** Give your wallet three things — **opinions** (rules), **memory** (an action log), and **budget** (a delegated allowance) — and it stops being a vault and starts acting for you.

When the agent needs help, it doesn't trust other agents — it **redelegates strictly narrower authority** down a chain, enforced on-chain. A child agent can never spend more, reach further, or delegate wider than its parent. That's agent-to-agent coordination as cryptography, not policy.

Built on **MetaMask Smart Accounts Kit** (ERC-7710 / 7715), reasoning by **Venice AI**, gasless settlement via the **1Shot** mainnet relayer (USDC, EIP-7702). Runs on **Base mainnet**.

## What it does

- You write rules in plain English once. Venice splits them into **on-chain caveats** (hard limits) and **reasoning guidance** (soft preferences).
- A **Governor** agent monitors, reasons, and acts within those limits.
- For sub-tasks it **redelegates** narrower, budget-capped scopes to specialist sub-agents (Researcher, Summarizer) — a real ERC-7710 redelegation chain, child ⊂ parent.
- Sub-agents pay for intelligence via **x402** micro-payments, gaslessly relayed by 1Shot.
- Before high-stakes or novel actions, **ClearSign** shows Venice's reasoning + a plain-English summary so you understand what you're authorizing.

## Why it matters

Users misread raw delegation parameters (Qin & Duan, *"What I Sign Is Not What I See,"* arXiv:2601.16751) — ClearSign answers that. And authenticated, scoped delegation to AI agents is the foundation for safe agent economies (South & Pentland et al., arXiv:2501.09674; Vaziry et al., arXiv:2507.19550). The redelegation invariant is our concrete, on-chain version of those ideas.

## Tracks

Best A2A coordination (real redelegation) · Best Agent · Best x402 + ERC-7710 · Best use of Venice AI · Best 1Shot Permissionless Relayer.

## Run it

```bash
pnpm i
# configure: Base RPC, agent keys, Venice key, 1Shot relayer endpoint
pnpm agents   # governor + sub-agents
pnpm app      # the Command Center
```

Confirm chain + fee token via `relayer_getCapabilities` before mainnet; nothing hardcoded. Use a fresh delegation salt per send.

## Tech

MetaMask Smart Accounts Kit (Hybrid) · ERC-7710 redelegation chains · ERC-7715 · x402 · EIP-7702 · 1Shot Public Relayer (JSON-RPC + webhooks) · Venice AI (OpenAI-compatible, zero-retention) · Viem · Next.js · Base mainnet.

## References

- Qin & Duan (2026). *"What I Sign Is Not What I See."* arXiv:2601.16751.
- South, Pentland, et al. (2025). *Authenticated Delegation and Authorized AI Agents.* arXiv:2501.09674.
- Vaziry, Rodriguez Garzon, Küpper (2025). *Towards Multi-Agent Economies (A2A + x402).* arXiv:2507.19550.
- Li et al. (2026). *A402: Binding Payments to Service Execution.* arXiv:2603.01179.

*Built for the MetaMask Smart Accounts Kit × 1Shot API × Venice AI Dev Cook-Off, 2026. The wallet that has something to say.*
