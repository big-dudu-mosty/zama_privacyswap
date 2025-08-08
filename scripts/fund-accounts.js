const { ethers } = require("hardhat");

async function main() {
  console.log("💰 为测试账户充值ETH...\n");

  const [deployer, alice, bob] = await ethers.getSigners();
  
  console.log("📋 账户信息:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Alice: ${alice.address}`);
  console.log(`Bob: ${bob.address}\n`);

  // 检查当前余额
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const aliceBalance = await ethers.provider.getBalance(alice.address);
  const bobBalance = await ethers.provider.getBalance(bob.address);
  
  console.log("💼 当前余额:");
  console.log(`Deployer: ${ethers.formatEther(deployerBalance)} ETH`);
  console.log(`Alice: ${ethers.formatEther(aliceBalance)} ETH`);
  console.log(`Bob: ${ethers.formatEther(bobBalance)} ETH\n`);

  // 给Bob转账
  if (bobBalance < ethers.parseEther("0.1")) {
    console.log("💸 为Bob转账0.1 ETH...");
    const transferAmount = ethers.parseEther("0.1");
    
    const tx = await deployer.sendTransaction({
      to: bob.address,
      value: transferAmount
    });
    
    await tx.wait();
    console.log(`✅ 转账成功: ${tx.hash}`);
    
    const newBobBalance = await ethers.provider.getBalance(bob.address);
    console.log(`✅ Bob新余额: ${ethers.formatEther(newBobBalance)} ETH`);
  } else {
    console.log("✅ Bob余额充足，无需转账");
  }

  // 给Alice补充一些ETH（如果需要）
  if (aliceBalance < ethers.parseEther("0.05")) {
    console.log("💸 为Alice补充0.05 ETH...");
    const transferAmount = ethers.parseEther("0.05");
    
    const tx = await deployer.sendTransaction({
      to: alice.address,
      value: transferAmount
    });
    
    await tx.wait();
    console.log(`✅ 转账成功: ${tx.hash}`);
    
    const newAliceBalance = await ethers.provider.getBalance(alice.address);
    console.log(`✅ Alice新余额: ${ethers.formatEther(newAliceBalance)} ETH`);
  } else {
    console.log("✅ Alice余额充足，无需转账");
  }

  console.log("\n🎉 账户充值完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });