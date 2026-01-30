import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const name = process.env.TEST_TOKEN_NAME || "PayPai Test Token";
  const symbol = process.env.TEST_TOKEN_SYMBOL || "PPT";
  const decimals = Number(process.env.TEST_TOKEN_DECIMALS || 18);
  const supply = process.env.TEST_TOKEN_SUPPLY || "1000000";
  const faucetAmount = process.env.TEST_TOKEN_FAUCET_AMOUNT || "1000";
  const faucetCooldown = Number(process.env.TEST_TOKEN_FAUCET_COOLDOWN || 3600);
  const initialSupply = hre.ethers.parseUnits(supply, decimals);
  const faucetAmountUnits = hre.ethers.parseUnits(faucetAmount, decimals);

  console.log("Deploying test token with account:", deployer.address);
  console.log(`Name: ${name} | Symbol: ${symbol} | Supply: ${supply}`);
  console.log(`Faucet: ${faucetAmount} per ${faucetCooldown}s`);

  const Token = await hre.ethers.getContractFactory("PayPaiTestToken");
  const token = await Token.deploy(
    name,
    symbol,
    initialSupply,
    deployer.address,
    decimals,
    faucetAmountUnits,
    faucetCooldown
  );
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("Test token deployed to:", tokenAddress);
  console.log("Constructor args (in order):");
  const constructorArgs = [
    name,
    symbol,
    initialSupply.toString(),
    deployer.address,
    decimals,
    faucetAmountUnits.toString(),
    faucetCooldown
  ];
  console.log(JSON.stringify(constructorArgs, null, 2));

  const deploymentsPath = "./deployments.json";
  let deployments = {};
  if (fs.existsSync(deploymentsPath)) {
    try {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    } catch {
      deployments = {};
    }
  }

  deployments.testToken = {
    address: tokenAddress,
    name,
    symbol,
    decimals,
    initialSupply: initialSupply.toString(),
    faucetAmount: faucetAmountUnits.toString(),
    faucetCooldown,
    constructorArgs,
    deploymentDate: new Date().toISOString(),
    deployer: deployer.address
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("Saved test token info to deployments.json");
  console.log("\nAdd these to the app .env.local to use PPT by default:");
  console.log(`NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_SYMBOL=${symbol}`);
  console.log(`NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_DECIMALS=${decimals}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
