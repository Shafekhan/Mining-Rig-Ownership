const hre = require("hardhat");

async function main() {
  const miningAddress = process.env.MINING_ADDRESS;
  const fromIndex = parseInt(process.env.FROM_INDEX ?? "0");
  const toIndex = parseInt(process.env.TO_INDEX ?? "1");
  const rigId = parseInt(process.env.RIG_ID ?? "1");
  const amount = parseInt(process.env.AMOUNT ?? "1");

  if (!miningAddress) throw new Error("Missing MINING_ADDRESS env var");
  if (!Number.isInteger(fromIndex) || fromIndex < 0) throw new Error("Invalid FROM_INDEX");
  if (!Number.isInteger(toIndex) || toIndex < 0) throw new Error("Invalid TO_INDEX");
  if (!Number.isInteger(rigId) || rigId < 0) throw new Error("Invalid RIG_ID");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Invalid AMOUNT");

  const signers = await hre.ethers.getSigners();
  if (fromIndex >= signers.length) throw new Error(`FROM_INDEX ${fromIndex} out of range (have ${signers.length} signers)`);
  if (toIndex >= signers.length) throw new Error(`TO_INDEX ${toIndex} out of range (have ${signers.length} signers)`);

  const from = signers[fromIndex];
  const to = signers[toIndex];
  const Mining = await hre.ethers.getContractAt("MiningRigOwnership", miningAddress);

  console.log(`From: ${from.address}`);
  console.log(`To:   ${to.address}`);
  console.log(`Transferring ${amount} shares of rigId ${rigId}...`);

  const tx = await Mining.connect(from).safeTransferFrom(from.address, to.address, rigId, amount, "0x");
  console.log("tx submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("tx mined:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
