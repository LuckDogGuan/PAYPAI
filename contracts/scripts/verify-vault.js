import hre from "hardhat";
import fs from "fs";

async function main() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found. Deploy vault first.");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const implementation = deployments.implementation;
  const factory = deployments.factory;
  const settlementToken = deployments.settlementToken;

  if (!implementation || !factory || !settlementToken) {
    throw new Error("Vault deployment info missing in deployments.json");
  }

  console.log("Verifying ClientAgentVault implementation:", implementation);
  await hre.run("verify:verify", {
    address: implementation,
    constructorArguments: []
  });

  console.log("Verifying VaultFactory:", factory);
  await hre.run("verify:verify", {
    address: factory,
    constructorArguments: [implementation, settlementToken]
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
