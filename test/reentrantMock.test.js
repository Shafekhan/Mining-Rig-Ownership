// test/reentrantMock.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReentrantMock vs MiningRigOwnership (reentrancy test)", function () {
  it("should NOT allow a reentrant drain — nonReentrant blocks inner call, outer claim succeeds once", async function () {
    const [owner, buyer, attacker] = await ethers.getSigners();

    // Deploy MiningRigOwnership
    const Mining = await ethers.getContractFactory("MiningRigOwnership");
    const mining = await Mining.deploy("https://example.test/{id}.json");
    const miningAddress = await mining.getAddress();

    const RIG_ID = 1;
    const TOTAL_SHARES = 100;
    const SHARE_PRICE = ethers.parseEther("1");

    // Register rig as owner
    await mining.connect(owner).registerRig(RIG_ID, TOTAL_SHARES, SHARE_PRICE);

    // Buyer buys 10 shares
    const BUY_AMOUNT = 10;
    const buyCost = SHARE_PRICE * BigInt(BUY_AMOUNT);
    const buyerAddress = await buyer.getAddress();
    await mining.connect(buyer).buyShares(RIG_ID, BUY_AMOUNT, { value: buyCost });

    // Deploy ReentrantMock with the mining contract address
    const Reentrant = await ethers.getContractFactory("ReentrantMock");
    const reentrant = await Reentrant.deploy(miningAddress, RIG_ID);
    const reentrantAddress = await reentrant.getAddress();

    // --- Cover onERC1155Received ---
    await mining.connect(buyer).safeTransferFrom(
      buyerAddress,
      reentrantAddress,
      RIG_ID,
      BUY_AMOUNT,
      "0x"
    );

    // --- Cover onERC1155BatchReceived ---
    await mining.connect(owner).buyShares(RIG_ID, 5, { value: SHARE_PRICE * 5n });
    await mining.connect(owner).safeBatchTransferFrom(
      await owner.getAddress(),
      reentrantAddress,
      [RIG_ID],
      [5],
      "0x"
    );

    // --- Cover supportsInterface ---
    expect(await reentrant.supportsInterface("0x4e2312e0")).to.equal(true);
    expect(await reentrant.supportsInterface("0xdeadbeef")).to.equal(false);

    // --- Continue original flow ---
    const deposit = ethers.parseEther("1");
    const beforeDepositBalance = await ethers.provider.getBalance(miningAddress);
    await mining.connect(owner).depositRewards(RIG_ID, { value: deposit });

    const expectedPayout = deposit * BigInt(BUY_AMOUNT + 5) / BigInt(TOTAL_SHARES);

    await expect(reentrant.connect(attacker).attack()).to.not.be.reverted;

    const reentrantBal = await ethers.provider.getBalance(reentrantAddress);
    expect(reentrantBal).to.equal(expectedPayout);

    const afterClaimBalance = await ethers.provider.getBalance(miningAddress);
    const afterDepositSnapshot = beforeDepositBalance + deposit;
    expect(afterDepositSnapshot - afterClaimBalance).to.equal(expectedPayout);

    await expect(reentrant.connect(attacker).attack()).to.be.revertedWith("no rewards");
  });
});