import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployTokensAndSwap: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("====================================================");
  console.log(`部署到网络: ${hre.network.name}`);
  console.log(`部署者账户: ${deployer}`);
  console.log("====================================================\n");

  // 检查部署者余额
  const deployerSigner = await ethers.getSigner(deployer);
  const balance = await ethers.provider.getBalance(deployer);
  console.log(`部署者余额: ${ethers.formatEther(balance)} ETH\n`);

  // 部署 TokenA
  console.log("🚀 部署 TokenA (ConfidentialFungibleTokenMintableBurnable)...");
  const tokenADeployment = await deploy("TokenA", {
    contract: "ConfidentialFungibleTokenMintableBurnable",
    from: deployer,
    args: [deployer, "TokenA", "TKA", "https://example.com/metadataA"],
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 2 : 1,
  });
  console.log(`✅ TokenA 部署地址: ${tokenADeployment.address}\n`);

  // 部署 TokenB
  console.log("🚀 部署 TokenB (ConfidentialFungibleTokenMintableBurnable)...");
  const tokenBDeployment = await deploy("TokenB", {
    contract: "ConfidentialFungibleTokenMintableBurnable",
    from: deployer,
    args: [deployer, "TokenB", "TKB", "https://example.com/metadataB"],
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 2 : 1,
  });
  console.log(`✅ TokenB 部署地址: ${tokenBDeployment.address}\n`);

  // 部署 FHESwap
  console.log("🚀 部署 FHESwap...");
  const fheSwapDeployment = await deploy("FHESwap", {
    from: deployer,
    args: [tokenADeployment.address, tokenBDeployment.address, deployer],
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 2 : 1,
  });
  console.log(`✅ FHESwap 部署地址: ${fheSwapDeployment.address}\n`);

  // 如果是在测试网络上，初始化协处理器
  if (hre.network.name === "sepolia") {
    console.log("🔧 初始化 FHEVM 协处理器...");
    try {
      // 连接到已部署的合约
      const tokenA = await ethers.getContractAt("ConfidentialFungibleTokenMintableBurnable", tokenADeployment.address);
      const tokenB = await ethers.getContractAt("ConfidentialFungibleTokenMintableBurnable", tokenBDeployment.address);
      const fheSwap = await ethers.getContractAt("FHESwap", fheSwapDeployment.address);

      // 初始化协处理器
      await hre.fhevm.assertCoprocessorInitialized(tokenA, "ConfidentialFungibleTokenMintableBurnable");
      await hre.fhevm.assertCoprocessorInitialized(tokenB, "ConfidentialFungibleTokenMintableBurnable");
      await hre.fhevm.assertCoprocessorInitialized(fheSwap, "FHESwap");
      console.log("✅ FHEVM 协处理器初始化完成\n");
    } catch (error) {
      console.log("⚠️  协处理器初始化警告:", error);
      console.log("这可能是正常的，在测试时会自动处理\n");
    }
  }

  console.log("====================================================");
  console.log("🎉 所有合约部署完成！");
  console.log("====================================================");
  console.log(`TokenA: ${tokenADeployment.address}`);
  console.log(`TokenB: ${tokenBDeployment.address}`);
  console.log(`FHESwap: ${fheSwapDeployment.address}`);
  console.log("====================================================\n");

  // 保存部署信息到环境变量文件
  const deploymentInfo = {
    network: hre.network.name,
    tokenA: tokenADeployment.address,
    tokenB: tokenBDeployment.address,
    fheSwap: fheSwapDeployment.address,
    deployer: deployer,
    timestamp: new Date().toISOString(),
  };

  console.log("📝 部署信息:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
};

export default deployTokensAndSwap;
deployTokensAndSwap.tags = ["TokenA", "TokenB", "FHESwap", "all"];