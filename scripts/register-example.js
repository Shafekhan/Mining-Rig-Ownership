const hre = require("hardhat");

async function main() {
  const miningAddress = process.env.MINING_ADDRESS;
  if (!miningAddress) {
    console.error("Please set MINING_ADDRESS in env or scripts");
    return;
  }
  const Mining = await hre.ethers.getContractAt("MiningRigOwnership", miningAddress);
  const tx = await Mining.registerRig(1, 100, hre.ethers.parseEther("0.01"));
  console.log("register tx:", tx);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
