require("@nomicfoundation/hardhat-toolbox");


module.exports = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545", // Ganache RPC
      accounts: [
        "82f3bf5c014be796722fd24fa36ee623beb7dfdcc7278b6603d0f7d395cd9337" // without 0x
      ].map(key => `0x${key}`) // make sure it's in 0x format
    }
  }
};