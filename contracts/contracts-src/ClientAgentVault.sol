// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ClientAgentVault
 * @notice Vault for managing AI agent spending rules
 */
contract ClientAgentVault is Initializable, OwnableUpgradeable {
    IERC20 public settlementToken;
    address public spendingAccount;
    mapping(address => bool) private executors;

    // Spending rule structure
    struct SpendingRule {
        address token;
        uint256 timeWindow;
        uint256 budget;
        uint256 initialWindowStartTime;
        address[] whitelist;
        address[] blacklist;
    }

    SpendingRule[] public spendingRules;
    uint256 public currentBudget;
    uint256 public currentWindowStart;
    uint256 public currentWindowDuration;

    event SpendingRulesConfigured(SpendingRule[] rules);
    event Withdrawal(address token, uint256 amount, address recipient);
    event ExecutorUpdated(address indexed executor, bool allowed);
    event SpendExecuted(address indexed executor, address indexed recipient, uint256 amount);

    function initialize(address _settlementToken, address _admin, address _spendingAccount) external initializer {
        __Ownable_init(_admin);
        settlementToken = IERC20(_settlementToken);
        spendingAccount = _spendingAccount;
    }

    modifier onlyOwnerOrExecutor() {
        require(owner() == msg.sender || executors[msg.sender], "Not authorized");
        _;
    }

    function setExecutor(address executor, bool allowed) external onlyOwner {
        executors[executor] = allowed;
        emit ExecutorUpdated(executor, allowed);
    }

    function isExecutor(address executor) external view returns (bool) {
        return executors[executor];
    }

    /**
     * @notice Configure spending rules for the vault
     */
    function configureSpendingRules(SpendingRule[] calldata rules) external onlyOwner {
        delete spendingRules;
        for (uint256 i = 0; i < rules.length; i++) {
            require(rules[i].token != address(0), "Invalid token");
            spendingRules.push(rules[i]);
        }

        // Set current budget from first rule
        if (rules.length > 0) {
            settlementToken = IERC20(rules[0].token);
            currentBudget = rules[0].budget;
            currentWindowStart = rules[0].initialWindowStartTime;
            currentWindowDuration = rules[0].timeWindow;
        }

        emit SpendingRulesConfigured(rules);
    }

    /**
     * @notice Get all spending rules
     */
    function getSpendingRules() external view returns (SpendingRule[] memory) {
        return spendingRules;
    }

    /**
     * @notice Check if a spend is allowed
     */
    function checkSpendAllowed(uint256 amount, address provider) external view returns (bool) {
        // Check time window
        if (currentWindowDuration == 0 || block.timestamp >= currentWindowStart + currentWindowDuration) {
            return false;
        }

        // Check budget
        if (amount > currentBudget) {
            return false;
        }

        // Check allowance/balance from spending account
        if (spendingAccount == address(0)) {
            return false;
        }
        if (settlementToken.balanceOf(spendingAccount) < amount) {
            return false;
        }
        if (settlementToken.allowance(spendingAccount, address(this)) < amount) {
            return false;
        }

        return _isAllowedProvider(provider);
    }

    /**
     * @notice Withdraw tokens from vault
     */
    function withdraw(address token, uint256 amount, address recipient) external onlyOwner {
        IERC20(token).transfer(recipient, amount);
        emit Withdrawal(token, amount, recipient);
    }

    /**
     * @notice Execute spend (called by approved spenders)
     */
    function executeSpend(uint256 amount, address recipient) external onlyOwnerOrExecutor {
        require(currentWindowDuration > 0, "Rules not configured");
        require(block.timestamp < currentWindowStart + currentWindowDuration, "Time window expired");
        require(amount <= currentBudget, "Insufficient budget");
        require(_isAllowedProvider(recipient), "Recipient not allowed");
        require(spendingAccount != address(0), "Spending account not set");
        require(settlementToken.allowance(spendingAccount, address(this)) >= amount, "Allowance too low");
        require(settlementToken.balanceOf(spendingAccount) >= amount, "Insufficient balance");

        currentBudget -= amount;
        settlementToken.transferFrom(spendingAccount, recipient, amount);
        emit SpendExecuted(msg.sender, recipient, amount);
    }

    function _isAllowedProvider(address provider) internal view returns (bool) {
        if (spendingRules.length == 0) {
            return true;
        }
        SpendingRule storage rule = spendingRules[0];

        for (uint256 i = 0; i < rule.blacklist.length; i++) {
            if (rule.blacklist[i] == provider) {
                return false;
            }
        }

        if (rule.whitelist.length == 0) {
            return true;
        }

        for (uint256 i = 0; i < rule.whitelist.length; i++) {
            if (rule.whitelist[i] == provider) {
                return true;
            }
        }

        return false;
    }
}
