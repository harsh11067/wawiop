# Vectis operator scripts (Base Sepolia)

Real on-chain tooling for the agent. They read `app/.env.local` (`WALLET_PRIVATE_KEY` =
the User EOA, `ACTIVE_CHAIN_ID` = 84532 for Base Sepolia). No secrets are printed.

| Script | What it does | Spends? |
|---|---|---|
| `node scripts/onchain-status.mjs` | Chain, DelegationManager, account deployment + ETH/USDC balances, Venice credit status | No (read-only) |
| `node scripts/verify-chain.mjs` | Signs the full chain and proves `child.authority == hash(parent)` for every hop | No (signing only) |
| `node scripts/redeem-demo.mjs` | `eth_call` simulation of redeeming the real linked chain against the live DelegationManager — proves it's valid & redeemable | No (simulation) |
| `node scripts/redeem-demo.mjs --send` | Actually submits the redemption (USDC transfer from the User SA) | **Yes** (Governor gas) |
| `node scripts/upgrade-7702.mjs` | Signs + submits the EIP-7702 upgrade of the User EOA → DeleGator smart account | **Yes** (EOA gas) |

## To settle a real redemption end-to-end

1. Fund the **User EOA** with Base Sepolia ETH (https://faucet.base.org) + a little test USDC.
2. `node scripts/onchain-status.mjs` — confirm the User shows `SMART ACCOUNT ✓` and holds USDC.
3. Fund the **Governor** address (shown by the status script) with ~0.0005 ETH for gas (it is the redeemer / msg.sender).
4. `node scripts/redeem-demo.mjs` — confirm the simulation succeeds.
5. `node scripts/redeem-demo.mjs --send` — submit the real redemption; the script prints the basescan link.

The app itself (the Command Center) performs the same `eth_call` simulation on every task
and reports the real result — "SIMULATED VALID ✓" when the chain is on-chain-valid, or the
real revert reason otherwise. Nothing is faked.
