# Wallet with Opinions — Frontend (refined)

The frontend must make two things legible: (1) the **redelegation tree** (the A2A prize mechanic) as a live, visual chain where each child is provably narrower than its parent, and (2) the **ClearSign** moment where the agent shows its reasoning before acting.

## 1. Stack

Next.js + TypeScript + Tailwind, wagmi/viem, MetaMask connect. Live updates via SSE/WebSocket from the agent process. No browser storage APIs.

## 2. Screens

1. **Onboarding** — connect → "Give your wallet opinions": type rules in plain English → Venice parses → show which became **on-chain caveats** vs **soft preferences** → sign 7702 upgrade + root delegation.
2. **Command Center** — the demo screen: delegation tree + activity feed + ClearSign + memory.
3. *(stretch)* **Rules editor.**

## 3. Command Center layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  WALLET WITH OPINIONS                ● Base mainnet   budget $8.40/$10 │
├───────────────────────────────┬──────────────────────────────────────┤
│  DELEGATION TREE (live)       │  ACTIVITY FEED                        │
│  USER  $10 · vote,spawn       │  14:01 Governor: new proposal #142    │
│   └ GOVERNOR  $10 · vote,spawn│  14:01 → redelegated to Researcher    │
│      ├ RESEARCHER ≤$2 · read  │  14:01 Researcher x402 → Venice $0.001 │
│      │   └ SUMMARIZER $0·text │  14:02 Summarizer compressed context  │
│      └ RISK-SCORER ≤$1 · read │  14:02 Governor decision: NO          │
│  (each node shows scope ⊂     │  14:02 ⚠ ClearSign required           │
│   parent; redelegation hash)  │  14:03 ✅ Voted · gasless · 0x9f…      │
├───────────────────────────────┴──────────────────────────────────────┤
│  CLEARSIGN                         │  MEMORY (action log)              │
│  About to: vote NO on #142         │  #141 voted NO  $0.006  0x7a…     │
│  Venice reasoning:                 │  #139 voted YES $0.006  0x3c…     │
│  <think> fee increase; rule says   │  research run   $0.002  0x5d…     │
│  never yes on fees; risk 23/100 →  │                                   │
│  NO </think>                       │                                   │
│  Cost $0.006 · budget left $8.40   │                                   │
│  [Proceed] [Override] [Edit rules] │                                   │
└────────────────────────────────────┴───────────────────────────────────┘
```

## 4. Components

- **`<DelegationTree>`** — the star. Renders the live chain; each node shows its scope + budget + the **redelegation tx hash** (link to explorer). Visually encode that each child's scope is a subset of its parent (e.g., greyed-out capabilities the child *lacks*). This is the A2A proof, on screen.
- **`<ActivityFeed>`** — streamed events across all agents; show redelegation events and x402 payments explicitly.
- **`<ClearSign>`** — reasoning trace (typewriter), plain-English summary, cost, remaining budget, action buttons. Fires on the trigger conditions.
- **`<MemoryLog>`** — past actions with cost + tx hash.
- **`<RuleSplit>`** (onboarding) — shows hard→caveat vs soft→prompt; sets expectations about what's enforced.

## 5. Demo-critical details

- **Make the subset relationship obvious.** A judge should *see* that Researcher can't spend what Governor can, and Summarizer can't spend at all. That visual is the A2A win.
- **Redelegation hashes link to real txs.** No fake nodes. Use 2–3 real agent SAs.
- **ClearSign is the Venice showcase** — give the reasoning room; stream it.
- Real-time feed; amber pending states; no blank spinners.

## 6. Build order

Day 8: ClearSign + ActivityFeed. Day 9: DelegationTree (the centerpiece) reading real chain data. Day 10: MemoryLog + RuleSplit + polish. Prioritize DelegationTree — it's the prize-qualifying visual.
