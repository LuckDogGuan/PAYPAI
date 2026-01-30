import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  paths: {
    sources: "./contracts-src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    kiteTestnet: {
      url: process.env.NEXT_PUBLIC_KITE_RPC_URL || "https://rpc-testnet.gokite.ai/",
      chainId: 2368,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      kiteTestnet: process.env.KITE_EXPLORER_API_KEY || "anything-non-empty"
    },
    customChains: [
      {
        network: "kiteTestnet",
        chainId: 2368,
        urls: {
          apiURL: process.env.KITE_EXPLORER_API_URL || "https://testnet.kitescan.ai/api",
          browserURL: process.env.KITE_EXPLORER_BROWSER_URL || "https://testnet.kitescan.ai"
        }
      }
    ]
  }
};
