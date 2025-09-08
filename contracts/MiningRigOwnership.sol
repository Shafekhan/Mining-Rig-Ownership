// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title MiningRigOwnership
/// @notice ERC-1155 contract implementing fractional ownership and pro-rata ETH reward distribution per rigId.
/// @dev Uses cumulative accRewardPerShare accounting. Scales rewardPerShare by 1e18.
contract MiningRigOwnership is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {
    uint256 private constant ACC_PRECISION = 1e18;

    mapping(uint256 => uint256) public totalShares;
    mapping(uint256 => uint256) public mintedShares;
    mapping(uint256 => uint256) public sharePrice;
    mapping(uint256 => uint256) public accRewardPerShare;
    mapping(uint256 => mapping(address => uint256)) public rewardDebt;
    mapping(uint256 => mapping(address => uint256)) public pendingRewards;
    mapping(uint256 => bool) public rigRegistered;

    event RigRegistered(uint256 indexed rigId, uint256 totalShares_, uint256 sharePrice_);
    event SharesBought(uint256 indexed rigId, address indexed buyer, uint256 amount, uint256 paid);
    event RewardsDeposited(uint256 indexed rigId, address indexed payer, uint256 amount);
    event RewardsClaimed(uint256 indexed rigId, address indexed claimer, uint256 amount);

    constructor(string memory uri_) ERC1155(uri_) {
    }

    /// @notice Register a new rig with a total shares and share price
    /// @dev Only owner
    function registerRig(uint256 rigId, uint256 _totalShares, uint256 _sharePrice) external onlyOwner {
        require(!rigRegistered[rigId], "Rig already registered");
        require(_totalShares > 0, "totalShares must be >0");
        rigRegistered[rigId] = true;
        totalShares[rigId] = _totalShares;
        sharePrice[rigId] = _sharePrice;
        emit RigRegistered(rigId, _totalShares, _sharePrice);
    }

    /// @notice Buy shares for a registered rig. Payment must equal amount * sharePrice[rigId]
    function buyShares(uint256 rigId, uint256 amount) external payable nonReentrant {
        require(rigRegistered[rigId], "rig not registered");
        require(amount > 0, "amount > 0");
        require(mintedShares[rigId] + amount <= totalShares[rigId], "oversell");
        uint256 cost = amount * sharePrice[rigId];
        require(msg.value == cost, "incorrect payment");
        _settleAndUpdateOnBalanceChange(rigId, msg.sender, int256(amount));
        _mint(msg.sender, rigId, amount, "");
        mintedShares[rigId] += amount;

        emit SharesBought(rigId, msg.sender, amount, msg.value);
    }

    /// @notice Deposit ETH as rewards for a given rigId. Owner only.
    function depositRewards(uint256 rigId) external payable onlyOwner {
        require(rigRegistered[rigId], "rig not registered");
        require(totalShares[rigId] > 0, "no total shares");
        uint256 amount = msg.value;
        require(amount > 0, "no value");
        accRewardPerShare[rigId] += (amount * ACC_PRECISION) / totalShares[rigId];
        emit RewardsDeposited(rigId, msg.sender, amount);
    }

    /// @notice Claim accumulated rewards for a rigId
    function claimRewards(uint256 rigId) external nonReentrant {
        uint256 bal = balanceOf(msg.sender, rigId);
        uint256 acc = accRewardPerShare[rigId];
        uint256 accumulated = (bal * acc) / ACC_PRECISION;
        uint256 debt = rewardDebt[rigId][msg.sender];
        uint256 pending = pendingRewards[rigId][msg.sender];
        if (accumulated > debt) {
            pending += accumulated - debt;
        }
        require(pending > 0, "no rewards");

        // reset pending and update debt
        pendingRewards[rigId][msg.sender] = 0;
        rewardDebt[rigId][msg.sender] = (bal * acc) / ACC_PRECISION;

        (bool ok, ) = msg.sender.call{value: pending}("");
        require(ok, "transfer failed");

        emit RewardsClaimed(rigId, msg.sender, pending);
    }

    /// @dev Internal helper to settle pending rewards for an account and update rewardDebt on balance changes.
    function _settleAndUpdateOnBalanceChange(uint256 rigId, address account, int256 delta) internal {
        uint256 preBal = balanceOf(account, rigId);
        uint256 acc = accRewardPerShare[rigId];
        if (preBal > 0) {
            uint256 accumulated = (preBal * acc) / ACC_PRECISION;
            uint256 debt = rewardDebt[rigId][account];
            if (accumulated > debt) {
                pendingRewards[rigId][account] += accumulated - debt;
            }
        }

        uint256 postBal;
        if (delta >= 0) {
            postBal = preBal + uint256(delta);
        } else {
            uint256 d = uint256(-delta);
            require(preBal >= d, "insufficient balance for change");
            postBal = preBal - d;
        }

        rewardDebt[rigId][account] = (postBal * acc) / ACC_PRECISION;
    }

    /// @dev Override _beforeTokenTransfer to keep reward accounting consistent across transfers, mints, burns
    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amt = amounts[i];
            if (from != address(0)) {
                _settleAndUpdateOnBalanceChange(id, from, -int256(amt));
            }
            if (to != address(0)) {
                _settleAndUpdateOnBalanceChange(id, to, int256(amt));
            }
        }
    }

    /// @dev required override for Solidity
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
