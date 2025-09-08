const hre = require("hardhat");
async function main(){
  console.log("Network:", hre.network.name);
  const signers = await hre.ethers.getSigners();
  console.log("signers count:", signers.length);
  for (let i=0;i<signers.length;i++){
    const a = await signers[i].getAddress();
    console.log(`signer[${i}]: ${a}`);
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
