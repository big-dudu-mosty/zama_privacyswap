const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查 Sepolia 账户余额...\n");
  
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`📋 网络信息:`);
  console.log(`网络名称: ${hre.network.name}`);
  console.log(`Chain ID: ${hre.network.config.chainId}`);
  console.log(`URL: ${hre.network.config.url}\n`);
  
  console.log(`👤 部署者账户信息:`);
  console.log(`地址: ${deployer.address}`);
  
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log(`余额: ${balanceInEth} ETH`);
    
    if (parseFloat(balanceInEth) < 0.01) {
      console.log("⚠️  警告: 余额可能不足以进行部署和测试");
      console.log("请从测试网水龙头获取更多 ETH:");
      console.log("- https://sepoliafaucet.com/");
      console.log("- https://faucets.chain.link/");
    } else if (parseFloat(balanceInEth) < 0.05) {
      console.log("⚠️  警告: 余额可能仅够基本部署，建议获取更多 ETH");
    } else {
      console.log("✅ 余额充足，可以进行部署和测试");
    }
    
  } catch (error) {
    console.error("❌ 获取余额失败:", error.message);
    console.log("请检查网络连接和配置");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });