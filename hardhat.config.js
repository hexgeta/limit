require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    pulsechain: {
      url: process.env.PULSECHAIN_RPC || "https://rpc.pulsechain.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    pulsechainTestnet: {
      url: process.env.PULSECHAIN_TESTNET_RPC || "https://rpc-testnet.pulsechain.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      pulsechain: process.env.PULSESCAN_API_KEY || "",
      pulsechainTestnet: process.env.PULSESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "pulsechain",
        chainId: 369,
        urls: {
          apiURL: "https://scan.pulsechain.com/api",
          browserURL: "https://scan.pulsechain.com",
        },
      },
      {
        network: "pulsechainTestnet",
        chainId: 943,
        urls: {
          apiURL: "https://scan.v4.testnet.pulsechain.com/api",
          browserURL: "https://scan.v4.testnet.pulsechain.com",
        },
      },
    ],
  },
};

module.exports = config; 