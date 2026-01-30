import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying VaultFactory...\n");

  // Get deployment parameters
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const settlementToken = process.env.SETTLEMENT_TOKEN || "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

  // Deploy implementation contract first
  console.log("\n1. Deploying ClientAgentVault implementation...");
  const Vault = await hre.ethers.getContractFactory("ClientAgentVault");
  const implementation = await Vault.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("Implementation deployed to:", implementationAddress);

  // Deploy factory
  console.log("\n2. Deploying VaultFactory...");
  const Factory = await hre.ethers.getContractFactory("VaultFactory");
  const factory = await Factory.deploy(implementationAddress, settlementToken);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Example: Calculate vault address for a user
  console.log("\n3. Example vault address calculation:");
  const exampleAdmin = "0x" + "1".repeat(40); // Example EOA
  const exampleAAWallet = "0x" + "2".repeat(40); // Example AA wallet (spending account)
  const salt = hre.ethers.keccak256(
    hre.ethers.solidityPacked(["string", "address"], ["PAYPAI_VAULT_V1", exampleAdmin])
  );
  const predictedAddress = await factory.getVaultAddress(exampleAdmin, exampleAAWallet, salt);
  console.log("Example Admin (EOA):", exampleAdmin);
  console.log("Example AA Wallet:", exampleAAWallet);
  console.log("Predicted Vault Address:", predictedAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "kite-testnet",
    implementation: implementationAddress,
    factory: factoryAddress,
    settlementToken,
    deploymentDate: new Date().toISOString(),
    deployer: deployer.address
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment complete!");
  console.log("\nDeployment info saved to deployments.json");
  console.log("\nTo use in your app, add to .env.local:");
  console.log(`NEXT_PUBLIC_VAULT_FACTORY=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_IMPLEMENTATION=${implementationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
