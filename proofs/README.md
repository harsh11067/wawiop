# On-chain proofs

Every core technical claim in Vectis is verifiable against the **live Base Sepolia**
chain — no mocks, no hidden failures. Reproduce all of it in ~5 seconds (no gas spent):

```bash
cd app && node scripts/prove-all.mjs
```

`PROOFS.txt` in this folder is the captured output. Summary:

| # | Claim | Evidence | How |
|---|---|---|---|
| 1 | **Linked ERC-7710 chain** — not independent root delegations | `root.authority == ROOT`; `Researcher.authority == keccak(root)`; `Summarizer.authority == keccak(Researcher)`; every hop ECDSA-signed | `hashDelegation()` |
| 2 | **The chain redeems on-chain** (the reviewer's "this will revert" — it does *not*) | `eth_call redeemDelegations(0.10 USDC)` against `DelegationManager 0xdb9B…7dB3` **succeeds** | live `eth_call` |
| 3 | **Caveats are cryptographically enforced** (the A2A invariant) | redeeming **11 > 10 USDC reverts** with `ERC20TransferAmountEnforcer:allowance-exceeded` | live `eth_call` |
| 4 | **Real x402 payment** | Researcher signs an **EIP-3009 `TransferWithAuthorization`**; the signature recovers to the Researcher address | `recoverTypedDataAddress` |
| 5 | **Venice AI** | API key valid; surfaced honestly (live vs. no-credits → deterministic fallback) | live API call |

The app itself runs proofs 2–4 on every task / demo-beat and surfaces the **real**
result in the Memory log — "SIMULATED VALID ✓" or the real revert reason. The fake
`demoTxHash` success-masking that a reviewer flagged has been removed.

### Other tools (`app/scripts/`)
- `onchain-status.mjs` — chain, DelegationManager, account deployment + ETH/USDC balances, Venice status
- `verify-chain.mjs` — sign the full chain and prove every linkage
- `redeem-demo.mjs [--send]` — simulate (default) or actually submit a redemption
- `upgrade-7702.mjs` — real EIP-7702 upgrade of the User EOA → DeleGator smart account

See [`app/scripts/README.md`](../app/scripts/README.md) for the funded end-to-end run.
