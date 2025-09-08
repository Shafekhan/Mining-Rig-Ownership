// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MiningRigOwnership.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";

/// @notice A receiver contract that accepts ERC1155 tokens and attempts to reenter
contract ReentrantMock is ERC1155Receiver {
    MiningRigOwnership public target;
    uint256 public rigId;
    address public owner;

    constructor(address _target, uint256 _rigId) {
        target = MiningRigOwnership(payable(_target));
        rigId = _rigId;
        owner = msg.sender;
    }

    /// @notice Trigger claim on the target contract.
    function attack() external {
        target.claimRewards(rigId);
    }

    receive() external payable {
        if (address(target).balance > 0) {
            try target.claimRewards(rigId) {
            } catch {
                // expected revert due to reentrancy guard
            }
        }
    }

    // ERC1155Receiver hooks, accept all transfers
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    // support interface (inherited from ERC1155Receiver)
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Receiver) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
