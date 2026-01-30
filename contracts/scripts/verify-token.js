import hre from "hardhat";
import fs from "fs";

async function main() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found. Deploy token first.");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const token = deployments.testToken;
  if (!token?.address || !token?.constructorArgs) {
    throw new Error("testToken info missing in deployments.json");
  }

  console.log("Verifying PayPaiTestToken:", token.address);
  await hre.run("verify:verify", {
    address: token.address,
    constructorArguments: token.constructorArgs
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
