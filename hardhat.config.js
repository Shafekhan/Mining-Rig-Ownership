require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { ARBITRUM_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, PRIVATE_KEYS } = process.env;

const accounts = (PRIVATE_KEYS && PRIVATE_KEYS.length)
  ? PRIVATE_KEYS.split(",").map(k => k.trim()).filter(k => k.length).map(k => k.startsWith("0x") ? k : `0x${k}`)
  : (DEPLOYER_PRIVATE_KEY ? [ DEPLOYER_PRIVATE_KEY.startsWith("0x") ? DEPLOYER_PRIVATE_KEY : `0x${DEPLOYER_PRIVATE_KEY}` ] : []);

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      }
    ]
  },
  networks: {
    hardhat: {},
    "arbitrum-sepolia": {
      url: ARBITRUM_SEPOLIA_RPC_URL || "",
      accounts
    }
  }
};
