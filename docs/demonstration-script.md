# Wallet with Opinions — Demonstration (refined)

Lead with the human line ("a wallet that acts while you sleep"), but make the **redelegation tree** the visual proof, because that's what qualifies you for the $3k A2A track. Target 3:00.

## 1. Spine

> Your wallet has been passive since the day you made it. Give it three things — opinions, memory, a budget — and it becomes an agent that acts for you. And when it needs help, it doesn't trust other agents blindly: it hands them *strictly less* power than it has, enforced by the chain. Watch.

## 2. Shot list (3:00)

**[0:00–0:25] Hook.** Over the Command Center: *"This wallet has opinions. I gave it rules once. Now it acts — and it coordinates other agents without ever trusting them with more than they need."*

**[0:25–0:55] Setup (once).** Type rules: *"Never vote yes on fee increases. Weekly budget $2."* Venice parses → show **hard rules → on-chain caveats** vs **soft preferences → reasoning**. Sign the **7702 upgrade** + root delegation. Line: *"What's enforced by the chain is in green. What's guidance is in grey. No hand-waving."*

**[0:55–1:45] The A2A moment (the prize).** A task arrives (proposal #142 / a research request). Watch the **DelegationTree** build live:
- Governor **redelegates** to Researcher — *narrower* scope, capped budget (show the hash → explorer).
- Researcher pays a **Venice x402** call for context — gasless via 1Shot (show the tx).
- Researcher **redelegates** to Summarizer — *zero* budget, text-only.
Line: *"Every child has provably less power than its parent. Summarizer literally cannot spend a cent. That's not a setting — the chain reverts anything wider. This is what 'agent-to-agent coordination' should mean."*

**[1:45–2:30] It decides, transparently (ClearSign + Venice).** Governor reasons over the summary + rules. ClearSign shows the `<think>` trace → *"fee increase; rule says never; risk 23/100 → NO,"* cost $0.006, budget left. Click **Proceed** → vote executes gasless. Line: *"It reasoned in the open, against the rules I set, and acted — for $0.006, while I did nothing."*

**[2:30–3:00] Close.** Show the memory log of past actions with tx hashes. *"Opinions. Memory. Budget. The first wallet with something to say — and the discipline to coordinate other agents without trusting them."*

## 3. Lines that work

- *"Less power than its parent — enforced by the chain, not a setting."*
- *"Summarizer literally cannot spend a cent."*
- *"It reasoned in the open and acted for $0.006 while I did nothing."*

## 4. Judge map

| Need | Moment |
|---|---|
| **Redelegation** (A2A) | 0:55–1:45 (tree builds, hashes, subset) |
| Smart Accounts main flow | 0:25–0:55, 1:45–2:30 |
| x402 via 7710 | 1:10 (Researcher pays Venice) |
| Venice meaningful | parsing 0:25; ClearSign 1:45 |
| 1Shot mainnet + 7702 + webhook | 0:25 (7702), 1:10 (gasless tx), status badge |

## 5. Recording + backup

- Capture redelegation hashes + the gasless tx early; narrate over them if mainnet stalls at record time.
- Keep explorer tabs pre-loaded showing the chain of delegations.
- Subtitle the key lines.
- Backup: Base Sepolia cut, but lead mainnet (1Shot prize needs mainnet).

## 6. Social cut

30–45s of the DelegationTree building + "Summarizer can't spend a cent," captioned *"My wallet coordinates AI agents without trusting any of them,"* tagging **@MetaMaskDev**.
