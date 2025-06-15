require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",  // Your contract's Solidity version
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",  // URL for your Ganache instance
      accounts: ["0xbeb6e94a5fcb5d0c96abe895feddfba63b69ca6d343fd56ee76b84b0673b7659"],  // Replace with your Ganache account's private key
    },
  },
};
