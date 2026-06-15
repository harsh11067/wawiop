# Vectis — Documentation

Technical documentation, design decisions, and guides for the Vectis project.

| Document | Description |
|---|---|
| [architecture.md](./architecture.md) | System actors, the ERC-7710 redelegation chain, 1Shot relayer integration, Venice reasoning loop, threat model, and repo layout |
| [project-plan.md](./project-plan.md) | Multi-day build plan, track mapping (A2A, Best Agent, x402+7710, Venice, 1Shot), and scope decisions |
| [build-plan.md](./build-plan.md) | Final technical constraints, daily milestones, and demo setup checklist |
| [frontend-design.md](./frontend-design.md) | Component architecture for `<DelegationTree>`, `<ClearSign>`, `<ActivityFeed>`, and `<MemoryLog>` |
| [dao-voting-showcase.md](./dao-voting-showcase.md) | How to make the governance demo real and legible — avoiding the ERC20Votes vs ERC-7710 confusion |
| [demonstration-script.md](./demonstration-script.md) | 3-minute pitch script, shot-by-shot breakdown, and judge map |
| [test-plan.md](./test-plan.md) | Assertion matrix for the core invariant: child scope ⊂ parent, enforced on-chain |

---

The single most important claim in this project: **a redelegated child cannot exceed its parent's authority.** [`test-plan.md`](./test-plan.md) proves it; [`architecture.md`](./architecture.md) explains why it's cryptographic, not policy.
