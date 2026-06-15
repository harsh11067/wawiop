# Wallet with Opinions — DAO Voting Showcase

> How to make the governance demo *real* and legible, without faking a famous DAO and without confusing judges.

## 1. Make it real: your own Governor on Base mainnet

Deploy a **minimal OpenZeppelin `Governor` + `ERC20Votes` token** on Base mainnet and create a real proposal. The agent casts a real `castVote` tx through the redeemed ERC-7710 delegation. This is genuine on-chain governance — just your own instance.

Why not a famous DAO: voting on one needs their governance token + meeting proposal thresholds — impractical in 14 days, and *faking* a vote is worse than a real vote on your own contract. Your own real Governor beats someone else's mocked one.

Minimal contracts:
- `ERC20Votes` token (mint a little to the user's smart account so it has voting weight).
- `Governor` (OZ defaults: simple counting, short voting period for the demo).
- One proposal whose action maps to a user rule (e.g., "increase protocol fee" → triggers the rule "never YES on fees").

## 2. The trap: "delegation" means two different things

This will confuse judges if you don't pre-empt it.

| Term | Meaning | Where it lives |
|---|---|---|
| **ERC-7710 delegation** | Delegating **account authority** — the agent may act for the user, under caveats. | Your redelegation tree. |
| **ERC20Votes delegation** | Delegating **governance voting power** (`token.delegate()`) — a standard DAO mechanic. | The token contract. |

If a judge thinks your "redelegation" is just `token.delegate()`, **you lose the A2A track on a misunderstanding.** So:
- Label the tree explicitly: *"authority delegation (ERC-7710)."*
- Label the vote explicitly: *"governance vote (castVote)."*
- In the script, say it once out loud: *"This is not vote-delegation — this is the agent's authority, attenuated hop by hop, then used to cast one real vote."*

## 3. What to visualize (tie four things together)

In one view, connect:
1. **The proposal** — id, the action it would take, and **which user rule applies** to it.
2. **The authority chain** — the ERC-7710 tree that authorized the agent to vote (each hop narrower, each edge a tx).
3. **The reasoning** — ClearSign: Venice's plain-English rationale (*"fee increase; rule says never YES → NO"*).
4. **The result** — the real `castVote` tx on basescan + the updated tally.

The judge's eye should travel proposal → authority → reasoning → on-chain result, and see that every step is backed by a transaction.

## 4. Verify

- **V-DAO-1:** `castVote` is a confirmed basescan tx; voter == user's smart account, via the delegation chain.
- **V-DAO-2:** `governor.proposalVotes(proposalId)` changes by the agent's weight after the tx.
- **V-DAO-3:** ERC-7710 vs ERC20Votes are labeled distinctly; no conflation possible.

## 5. Demo line

> "A proposal arrived. My agent didn't ask me — it already knew my rule. It reasoned in the open, and cast a *real* on-chain vote, using authority I'd handed down a chain where every link holds less power than the one above it. I never touched my wallet."

## 6. Optional honesty beat (strong with these judges)

Show the **counterfactual**: a proposal the agent votes YES on (within rules) vs the fee proposal it vetoes — proving it's reasoning against rules, not hardcoded to always say NO. One extra proposal, big credibility.
