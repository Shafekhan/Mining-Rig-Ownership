const { expect } = require("chai");
const { ethers } = require("hardhat");

const ACC_PRECISION = 10n ** 18n;

describe("MiningRigOwnership", function () {
  let contract;
  let owner, alice, bob, carol;

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const MiningRigOwnershipFactory = await ethers.getContractFactory("MiningRigOwnership", owner);
    contract = await MiningRigOwnershipFactory.deploy("ipfs://dummy/");
    await contract.waitForDeployment();
  });

  describe("registration", function () {
    it("owner can register a rig", async function () {
      const rigId = 1;
      const totalShares = 100n;
      const price = ethers.parseEther("1");

      await expect(contract.connect(owner).registerRig(rigId, totalShares, price))
        .to.emit(contract, "RigRegistered")
        .withArgs(rigId, totalShares, price);

      expect(await contract.rigRegistered(rigId)).to.equal(true);
      expect(await contract.totalShares(rigId)).to.equal(totalShares);
      expect(await contract.sharePrice(rigId)).to.equal(price);
    });

    it("non-owner cannot register", async function () {
      await expect(contract.connect(alice).registerRig(1, 10, ethers.parseEther("1")))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("cannot register same rig twice", async function () {
      await contract.connect(owner).registerRig(2, 50, ethers.parseEther("2"));
      await expect(contract.connect(owner).registerRig(2, 50, ethers.parseEther("2")))
        .to.be.revertedWith("Rig already registered");
    });

    it("rejects zero totalShares", async function () {
      await expect(contract.connect(owner).registerRig(3, 0, ethers.parseEther("1")))
        .to.be.revertedWith("totalShares must be >0");
    });
  });

  describe("buyShares", function () {
    const rigId = 10;
    const totalShares = 100n;
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await contract.connect(owner).registerRig(rigId, totalShares, price);
    });

    it("buys shares successfully", async function () {
      const amount = 10n;
      const cost = price * amount;

      await expect(contract.connect(alice).buyShares(rigId, amount, { value: cost }))
        .to.emit(contract, "SharesBought")
        .withArgs(rigId, alice.address, amount, cost);

      expect(await contract.mintedShares(rigId)).to.equal(amount);
      expect(await contract.balanceOf(alice.address, rigId)).to.equal(amount);
    });

    it("rejects incorrect payment", async function () {
      await expect(contract.connect(alice).buyShares(rigId, 5n, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("incorrect payment");
    });

    it("rejects zero amount", async function () {
      await expect(contract.connect(alice).buyShares(rigId, 0n, { value: 0 }))
        .to.be.revertedWith("amount > 0");
    });

    it("rejects oversell", async function () {
      await contract.connect(alice).buyShares(rigId, 95n, { value: price * 95n });
      await expect(contract.connect(bob).buyShares(rigId, 10n, { value: price * 10n }))
        .to.be.revertedWith("oversell");
    });
  });

  describe("depositRewards & claimRewards", function () {
    const rigId = 20;
    const totalShares = 100n;
    const price = ethers.parseEther("1");

    beforeEach(async () => {
      await contract.connect(owner).registerRig(rigId, totalShares, price);
    });

    it("only owner can deposit", async function () {
      await expect(contract.connect(alice).depositRewards(rigId, { value: ethers.parseEther("10") }))
        .to.be.revertedWith("Ownable: caller is not the owner");
      await expect(contract.connect(owner).depositRewards(rigId, { value: 0 }))
        .to.be.revertedWith("no value");
    });

    it("deposit updates accRewardPerShare", async function () {
      const deposit = ethers.parseEther("100");
      await expect(contract.connect(owner).depositRewards(rigId, { value: deposit }))
        .to.emit(contract, "RewardsDeposited")
        .withArgs(rigId, owner.address, deposit);

      const acc = await contract.accRewardPerShare(rigId);
      const expected = (deposit * ACC_PRECISION) / totalShares;
      expect(acc).to.equal(expected);
    });

    it("claim reverts with no rewards", async function () {
      await expect(contract.connect(alice).claimRewards(rigId)).to.be.revertedWith("no rewards");
    });

    it("single buyer gets correct rewards", async function () {
      const amount = 10n;
      await contract.connect(alice).buyShares(rigId, amount, { value: price * amount });

      const deposit = ethers.parseEther("300");
      await contract.connect(owner).depositRewards(rigId, { value: deposit });

      const expectedReward = (deposit * amount) / totalShares;

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await contract.connect(alice).claimRewards(rigId);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      expect(after).to.equal(before + expectedReward - gas);

      expect(await contract.pendingRewards(rigId, alice.address)).to.equal(0n);

      const acc = await contract.accRewardPerShare(rigId);
      const expectedDebt = (amount * acc) / ACC_PRECISION;
      expect(await contract.rewardDebt(rigId, alice.address)).to.equal(expectedDebt);
    });

    it("multiple buyers & deposits distribute correctly", async function () {
      await contract.connect(alice).buyShares(rigId, 10n, { value: price * 10n });
      await contract.connect(bob).buyShares(rigId, 30n, { value: price * 30n });

      await contract.connect(owner).depositRewards(rigId, { value: ethers.parseEther("200") });

      const aliceExpected1 = ethers.parseEther("200") * 10n / 100n;
      const bobExpected1 = ethers.parseEther("200") * 30n / 100n;

      {
        const before = await ethers.provider.getBalance(alice.address);
        const tx = await contract.connect(alice).claimRewards(rigId);
        const receipt = await tx.wait();
        const gas = receipt.gasUsed * receipt.gasPrice;
        const after = await ethers.provider.getBalance(alice.address);
        expect(after).to.equal(before + aliceExpected1 - gas);
      }

      await contract.connect(owner).depositRewards(rigId, { value: ethers.parseEther("100") });

      const aliceExpected2 = ethers.parseEther("100") * 10n / 100n;
      const bobExpected2 = ethers.parseEther("100") * 30n / 100n;

      const bobBefore = await ethers.provider.getBalance(bob.address);
      const txBob = await contract.connect(bob).claimRewards(rigId);
      const receiptBob = await txBob.wait();
      const bobGas = receiptBob.gasUsed * receiptBob.gasPrice;
      const bobAfter = await ethers.provider.getBalance(bob.address);

      expect(bobAfter).to.equal(bobBefore + bobExpected1 + bobExpected2 - bobGas);
    });

    it("transfer settles rewards", async function () {
      await contract.connect(alice).buyShares(rigId, 10n, { value: price * 10n });
      const deposit = ethers.parseEther("50");
      await contract.connect(owner).depositRewards(rigId, { value: deposit });

      const acc = await contract.accRewardPerShare(rigId);

      await contract.connect(alice).safeTransferFrom(alice.address, bob.address, rigId, 5n, "0x");

      const expectedAccumulated = 10n * deposit / 100n;
      expect(await contract.pendingRewards(rigId, alice.address)).to.equal(expectedAccumulated);

      const expectedDebtAlice = (5n * acc) / ACC_PRECISION;
      expect(await contract.rewardDebt(rigId, alice.address)).to.equal(expectedDebtAlice);

      const expectedDebtBob = (5n * acc) / ACC_PRECISION;
      expect(await contract.rewardDebt(rigId, bob.address)).to.equal(expectedDebtBob);

      const aliceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await contract.connect(alice).claimRewards(rigId);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const aliceAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceAfter).to.equal(aliceBefore + expectedAccumulated - gas);
    });

    it("direct ETH send doesn’t update accounting", async function () {
      const sendAmount = ethers.parseEther("5");
      await owner.sendTransaction({ to: contract.target, value: sendAmount });

      const acc = await contract.accRewardPerShare(rigId);
      expect(acc).to.equal(0n);

      const contractBalance = await ethers.provider.getBalance(contract.target);
      expect(contractBalance).to.equal(sendAmount);
    });
  });

  describe("misc", function () {
    it("claim with no shares fails", async function () {
      const rigId = 99;
      await contract.connect(owner).registerRig(rigId, 10n, ethers.parseEther("1"));
      await expect(contract.connect(alice).claimRewards(rigId)).to.be.revertedWith("no rewards");
    });

    it("transfer more than balance fails", async function () {
      const rigId = 77;
      await contract.connect(owner).registerRig(rigId, 10n, ethers.parseEther("1"));
      await contract.connect(alice).buyShares(rigId, 3n, { value: ethers.parseEther("3") });
      await expect(contract.connect(alice).safeTransferFrom(alice.address, bob.address, rigId, 4n, "0x"))
        .to.be.reverted;
    });
  });
});