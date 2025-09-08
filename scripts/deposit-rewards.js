const hre = require("hardhat");

async function main() {
  const miningAddress = process.env.MINING_ADDRESS;
  const ownerIndex = parseInt(process.env.OWNER_INDEX ?? "0");
  const rigId = parseInt(process.env.RIG_ID ?? "1");
  const amountEth = process.env.AMOUNT ?? "0.5";

  if (!miningAddress) throw new Error("Missing MINING_ADDRESS env var");
  if (!Number.isInteger(ownerIndex) || ownerIndex < 0) throw new Error("Invalid OWNER_INDEX");
  if (!Number.isInteger(rigId) || rigId < 0) throw new Error("Invalid RIG_ID");
  if (!amountEth || isNaN(Number(amountEth))) throw new Error("Invalid AMOUNT");

  const signers = await hre.ethers.getSigners();
  if (ownerIndex >= signers.length) throw new Error(`OWNER_INDEX ${ownerIndex} out of range (have ${signers.length} signers)`);

  const owner = signers[ownerIndex];
  const Mining = await hre.ethers.getContractAt("MiningRigOwnership", miningAddress);

  const value = hre.ethers.parseEther(amountEth);

  console.log(`Owner: ${owner.address}`);
  console.log(`Depositing ${amountEth} ETH (${value.toString()} wei) to rigId ${rigId}`);

  const tx = await Mining.connect(owner).depositRewards(rigId, { value });
  console.log("tx submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("tx mined:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
