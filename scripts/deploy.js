const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with", deployer.address);

  const Mining = await hre.ethers.deployContract("MiningRigOwnership", ["https://example.com/{id}.json"]);
  await Mining.waitForDeployment();

  console.log("MiningRigOwnership deployed to:", await Mining.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
