import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-etherscan";

// npx hardhat run --network bscMain scripts/deploy.js

module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
    },
    bscTest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      gasPrice: 10000000000,
      accounts: ['']
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/",
      chainId: 3,
      gasPrice: 10000000000,
      accounts: ['']
    },
    bscMain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 5000000000,
      accounts: ['']
    }
  },
  solidity: {
  version: "0.8.9",
  settings: {
    optimizer: {
      enabled: true,
      runs: 999,
    }
   }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
  etherscan: {
    apiKey: '',
    /*{
      ropsten: "",
      testnet: "",
    }*/
  },
};
