require('@fhevm/hardhat-plugin');

module.exports = {
  solidity: '0.8.19',  // Assuming a common version for FHEVM; adjust if needed based on your contracts
  networks: {
    hardhat: {
      fhevm: { useMock: true },  // Enable mocked mode for faster testing
    },
  },
}; 