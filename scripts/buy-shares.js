const hre = require("hardhat");

async function main() {
  const miningAddress = process.env.MINING_ADDRESS;
  const buyerIndex = process.env.BUYER_INDEX || "1";
  const rigId = process.env.RIG_ID || "1";
  const amount = process.env.AMOUNT || "2";

  const signers = await hre.ethers.getSigners();
  const buyer = signers[parseInt(buyerIndex)];

  const Mining = await hre.ethers.getContractAt("MiningRigOwnership", miningAddress, buyer);

  const price = await Mining.sharePrice(rigId);
  const totalCost = price * BigInt(amount);

  const tx = await Mining.buyShares(rigId, amount, { value: totalCost });
  console.log(`Buying ${amount} shares of rigId ${rigId}...`);
  await tx.wait();
  console.log("Buy confirmed:", tx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
