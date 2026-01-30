// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./ClientAgentVault.sol";

/**
 * @title VaultFactory
 * @notice Factory for deploying ClientAgentVault contracts
 */
contract VaultFactory {
    address public immutable implementation;
    address public immutable settlementToken;

    event VaultDeployed(address indexed vault, address indexed admin, address spendingAccount, address settlementToken);

    constructor(address _implementation, address _settlementToken) {
        implementation = _implementation;
        settlementToken = _settlementToken;
    }

    /**
     * @notice Deploy a new ClientAgentVault
     * @param admin The EOA wallet that will control the vault
     * @param spendingAccount The AA wallet that holds funds
     * @param salt Unique salt for deterministic deployment
     */
    function deployVault(
        address admin,
        address spendingAccount,
        bytes32 salt
    ) public returns (address vault) {
        // Encode initialization data
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,address,address)",
            settlementToken,
            admin,
            spendingAccount
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy{salt: salt}(
            implementation,
            initData
        );

        vault = address(proxy);

        emit VaultDeployed(vault, admin, spendingAccount, settlementToken);
    }

    /**
     * @notice Calculate deterministic vault address
     * @param admin The EOA wallet address
     * @param spendingAccount The AA wallet address
     * @param userSalt User-specific salt (should include AA wallet address)
     */
    function getVaultAddress(address admin, address spendingAccount, bytes32 userSalt) public view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                userSalt,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            implementation,
                            abi.encodeWithSignature("initialize(address,address,address)",
                                settlementToken,
                                admin, // EOA admin
                                spendingAccount // AA wallet payer
                            )
                        )
                    )
                )
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Deploy vault with predetermined address
     * @param admin The EOA wallet that will be the vault admin
     * @param spendingAccount The AA wallet that will fund spends
     * @param userSalt User-specific salt (derived from AA wallet)
     */
    function deployDeterministic(
        address admin,
        address spendingAccount,
        bytes32 userSalt
    ) external returns (address vault) {
        return deployVault(admin, spendingAccount, userSalt);
    }
}
