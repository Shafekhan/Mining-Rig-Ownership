# MiningRigOwnership

ERC-1155 based fractional ownership for mining rigs with pro-rata ETH reward distribution.

## Quickstart

1. `cp .env.example .env` and fill values
2. `npm ci`
3. `npx hardhat compile`
4. `npx hardhat test`

## Design
- One `tokenId` per rig.
- `registerRig(rigId, totalShares, sharePrice)` owner-only.
- `buyShares(rigId, amount)` payable mints shares to buyer.
- `depositRewards(rigId)` owner-only payable to add ETH rewards.
- `claimRewards(rigId)` users withdraw their pro-rata share.
- Accounting implemented with `accRewardPerShare` scaled by 1e18 and per-user `rewardDebt` + `pendingRewards`.

## Security
- Uses OpenZeppelin, `ReentrancyGuard`, checks-effects-interactions, and `Ownable` for admin functions.

## Deployment (Arbitrum Sepolia)
Set `ARBITRUM_SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `.env`, then:

```bash
npx hardhat run --network arbitrum-sepolia scripts/deploy.js
```
