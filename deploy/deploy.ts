// import { ethers } from "hardhat";
// import { HardhatRuntimeEnvironment } from "hardhat/types"; // 恢复为正确的导入路径
// // import { fhevm } from "@fhevm/hardhat-plugin"; // 导入 fhevm

// const deployContracts = async function (hre: HardhatRuntimeEnvironment) {
//   const { deployments, getNamedAccounts, ethers, fhevm } = hre; // 添加 fhevm 到解构
//   const { deploy } = deployments;
//   const { deployer } = await getNamedAccounts();

//   console.log("----------------------------------------------------");
//   console.log("开始部署合约到网络:", hre.network.name);
//   console.log("部署者账户:", deployer);
//   console.log("----------------------------------------------------\n");

//   // 部署 TokenA
//   console.log("部署 TokenA (ConfidentialFungibleTokenMintableBurnable)...");
//   const tokenADeploy = await deploy("TokenA", {
//     contract: "ConfidentialFungibleTokenMintableBurnable", // 指定合约名称
//     from: deployer,
//     args: [deployer, "TokenA", "TKA", "https://example.com/metadataA"],
//     log: true,
//   });
//   console.log(`TokenA 部署地址: ${tokenADeploy.address}\n`);
//   // 显式连接 FHEVM 协处理器
//   // await (fhevm as any).connectThePrecompile(tokenADeploy.address);
//   console.log(`TokenA 协处理器已连接。\n`);

//   // 部署 TokenB
//   console.log("部署 TokenB (ConfidentialFungibleTokenMintableBurnable)...");
//   const tokenBDeploy = await deploy("TokenB", {
//     contract: "ConfidentialFungibleTokenMintableBurnable", // 指定合约名称
//     from: deployer,
//     args: [deployer, "TokenB", "TKB", "https://example.com/metadataB"],
//     log: true,
//   });
//   console.log(`TokenB 部署地址: ${tokenBDeploy.address}\n`);
//   // 显式连接 FHEVM 协处理器
//   // await (fhevm as any).connectThePrecompile(tokenBDeploy.address);
//   console.log(`TokenB 协处理器已连接。\n`);

//   // 部署 FHESwap
//   console.log("部署 FHESwap...");
//   const fHeSwapDeploy = await deploy("FHESwap", {
//     from: deployer,
//     args: [tokenADeploy.address, tokenBDeploy.address, deployer], // 传入 TokenA, TokenB 地址和部署者地址
//     log: true,
//   });
//   console.log(`FHESwap 部署地址: ${fHeSwapDeploy.address}\n`);
//   // 显式连接 FHEVM 协处理器
//   // await (fhevm as any).connectThePrecompile(fHeSwapDeploy.address);
//   console.log(`FHESwap 协处理器已连接。\n`);

//   console.log("----------------------------------------------------");
//   console.log("所有合约部署完成！");
//   console.log("----------------------------------------------------");
// };

// export default deployContracts;
// deployContracts.tags = ["ConfidentialFungibleTokenMintableBurnable", "FHESwap"];

import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployConfidentialToken = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying from account:", deployer);

  const name = "MyConfidentialToken";
  const symbol = "MCT";
  const uri = "https://example.com/metadata/";

  await deploy("ConfidentialFungibleTokenMintableBurnable", {
    from: deployer,
    args: [deployer, name, symbol, uri],
    log: true,
  });
};

export default deployConfidentialToken;
deployConfidentialToken.tags = ["ConfidentialFungibleTokenMintableBurnable"];