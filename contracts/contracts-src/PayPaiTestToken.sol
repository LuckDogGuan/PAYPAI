// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PayPaiTestToken
 * @notice Simple mintable ERC20 for testing.
 */
contract PayPaiTestToken is ERC20, Ownable {
    uint8 private immutable tokenDecimals;
    uint256 public faucetAmount;
    uint256 public faucetCooldown;
    mapping(address => uint256) public lastMintAt;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address initialRecipient,
        uint8 decimals_,
        uint256 faucetAmount_,
        uint256 faucetCooldown_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        tokenDecimals = decimals_;
        faucetAmount = faucetAmount_;
        faucetCooldown = faucetCooldown_;
        _mint(initialRecipient, initialSupply);
    }

    function decimals() public view override returns (uint8) {
        return tokenDecimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucetMint() external {
        require(faucetAmount > 0, "Faucet disabled");
        uint256 last = lastMintAt[msg.sender];
        require(block.timestamp >= last + faucetCooldown, "Faucet cooldown");
        lastMintAt[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
    }

    function setFaucetConfig(uint256 amount, uint256 cooldownSeconds) external onlyOwner {
        faucetAmount = amount;
        faucetCooldown = cooldownSeconds;
    }
}
