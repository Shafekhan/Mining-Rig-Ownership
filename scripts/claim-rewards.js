const hre = require("hardhat");

async function main() {
  const miningAddress = process.env.MINING_ADDRESS;
  const claimerIndex = parseInt(process.env.CLAIMER_INDEX ?? "0");
  const rigId = parseInt(process.env.RIG_ID ?? "1");

  if (!miningAddress) throw new Error("Missing MINING_ADDRESS env var");
  if (!Number.isInteger(claimerIndex) || claimerIndex < 0) throw new Error("Invalid CLAIMER_INDEX");
  if (!Number.isInteger(rigId) || rigId < 0) throw new Error("Invalid RIG_ID");

  const signers = await hre.ethers.getSigners();
  if (claimerIndex >= signers.length) throw new Error(`CLAIMER_INDEX ${claimerIndex} out of range (have ${signers.length} signers)`);

  const claimer = signers[claimerIndex];
  const Mining = await hre.ethers.getContractAt("MiningRigOwnership", miningAddress);

  console.log(`Claimer: ${claimer.address}`);
  console.log(`Claiming rewards for rigId ${rigId}...`);

  const tx = await Mining.connect(claimer).claimRewards(rigId);
  console.log("tx submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("tx mined:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
