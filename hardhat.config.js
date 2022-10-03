require("hardhat-deploy");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config({});

const deployer = process.env.DEPLOYER_PRIVATE_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.6.7",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_API}`,
        // blockNumber: 11934000,
      },
      chainId: 1337,
      timeout: 100000000,
      accounts: [
        {
          privateKey: process.env.DEPLOYER_PRIVATE_KEY,
          balance: "100000000000000000000",
        },
      ],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API}`,
      accounts: [deployer],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  vyper: {
    version: "0.2.7",
  },
};
