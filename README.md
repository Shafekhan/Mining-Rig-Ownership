# MiningRigOwnership — Fractional Mining-Rig Ownership (ERC-1155)

## 📌 Overview

**MiningRigOwnership** is an ERC-1155–based Solidity contract enabling fractional ownership of mining rigs.

- Rig owners can tokenize rigs into fractional shares.  
- Users can buy shares (ERC-1155 tokens).  
- Owners can deposit ETH rewards.  
- Shareholders can claim pro-rata rewards.  
- The project leverages **OpenZeppelin** primitives (`ERC1155`, `Ownable`, `ReentrancyGuard`) and includes reentrancy protection.  
- Includes scripts and tests for deployment, interaction, and security validation.

---

## ✨ Features

- **Register rigs** with a fixed total of fractional shares (`registerRig`)  
- **Buy shares** via `buyShares` (enforced cap: cannot exceed total supply)  
- **Deposit ETH rewards** for a rig (`depositRewards`)  
- **Claim rewards** proportionally to owned shares (`claimRewards`)  
- **ERC-1155 transfers supported** (`safeTransferFrom`) for secondary share transfers  
- **Reentrancy protection** with negative tests (`ReentrantMock.sol`)  

---

## 📂 Repository Structure

```txt
contracts/
 ├─ MiningRigOwnership.sol
 └─ ReentrantMock.sol
scripts/
 ├─ buy-shares.js
 ├─ check-signers.js
 ├─ claim-rewards.js
 ├─ deploy.js
 ├─ deposit-rewards.js
 ├─ register-example.js
 └─ transfer-shares.js
test/
 ├─ miningRigOwnership.test.js
 └─ reentrantMock.test.js
screenshots/
 ├─ arbiscan_transactions.PNG
 ├─ deployment_1.PNG
 ├─ deployment_2.PNG
 ├─ tests_1.PNG
 └─ tests_2.PNG
.gitignore
README.md
hardhat.config.js
package.json
package-lock.json


## ⚙️ Prerequisites

- **Node.js** 20.x LTS (recommended)  
- **npm** >= 9  
- **Hardhat**  
- **ethers.js v6**

---

## 🔑 Environment Setup

Create a `.env` file in the repo root (**⚠️ never commit secrets**).

Example:

```ini
# RPC URL for Arbitrum Sepolia
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>

# Owner / deployer private key (DO NOT COMMIT)
DEPLOYER_PRIVATE_KEY=0x<your_deployer_private_key>

# Optional: multiple comma-separated private keys for testing
PRIVATE_KEYS=0x<key1>,0x<key2>

# Contract address (fill after deployment)
MINING_ADDRESS=
➡️ A safe template is provided in .env.example.

🛠️ Hardhat Config Notes
Multiple signers are supported via PRIVATE_KEYS in .env.

js
Copy code
const privStr = process.env.PRIVATE_KEYS || "";
const accounts = privStr.length
  ? privStr.split(",").map(k => k.trim()).filter(Boolean).map(k => k.startsWith("0x") ? k : `0x${k}`)
  : (process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : []);

module.exports = {
  solidity: "0.8.20",
  networks: {
    "arbitrum-sepolia": {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
      accounts,
    },
  },
};
🚀 Install & Compile
bash
Copy code
# install dependencies
npm ci

# compile contracts
npx hardhat compile
📤 Deploy
Localhost:

bash
Copy code
npx hardhat run scripts/deploy.js --network localhost
Arbitrum Sepolia:

bash
Copy code
npx hardhat run --network arbitrum-sepolia scripts/deploy.js
✅ Example deployed contract:

ini
Copy code
MINING_ADDRESS=0x8178e1452199134Cee79d06C1691B9d5fd088508
📜 Scripts — Interact with Contract
All scripts require MINING_ADDRESS set in .env.

Register a Rig

bash
Copy code
npx hardhat run scripts/register-example.js --network arbitrum-sepolia
Buy Shares

powershell
Copy code
$env:BUYER_INDEX="1"; $env:RIG_ID="1"; $env:AMOUNT="2"
npx hardhat run --network localhost scripts/buy-shares.js
Deposit Rewards

powershell
Copy code
$env:OWNER_INDEX="0"; $env:RIG_ID="1"; $env:AMOUNT="0.5"
npx hardhat run --network localhost scripts/deposit-rewards.js
Claim Rewards

powershell
Copy code
$env:CLAIMER_INDEX="1"; $env:RIG_ID="1"
npx hardhat run --network localhost scripts/claim-rewards.js
Transfer Shares

powershell
Copy code
$env:FROM_INDEX="1"; $env:TO_INDEX="0"; $env:RIG_ID="1"; $env:AMOUNT="1"
npx hardhat run --network localhost scripts/transfer-shares.js
Check Signers

bash
Copy code
npx hardhat run --network arbitrum-sepolia scripts/check-signers.js
🧪 Tests
Run tests on a local Hardhat network:

bash
Copy code
npx hardhat test
Check coverage:

bash
Copy code
npx hardhat coverage
Tests include:
Rig registration

Buying shares & oversell protection

Deposit & claim logic

Reentrancy attack prevention (ReentrantMock)

📸 Screenshots of results are available in /screenshots.

📸 Screenshots
✅ Localhost deployment

✅ Test results

✅ Arbiscan transaction history

(See /screenshots folder in repo.)