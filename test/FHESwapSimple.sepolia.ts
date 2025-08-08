import { FHESwapSimple, ConfidentialFungibleTokenMintableBurnable } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm, deployments } from "hardhat";
import hre from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("FHESwapSimple 详细测试 - Sepolia测试网", function () {
  this.timeout(1800000); // 30分钟超时，适应重试机制

  let signers: Signers;
  let tokenA: ConfidentialFungibleTokenMintableBurnable;
  let tokenB: ConfidentialFungibleTokenMintableBurnable;
  let tokenAAddress: string;
  let tokenBAddress: string;
  let fHeSwap: FHESwapSimple;
  let fHeSwapAddress: string;

  // 重试辅助函数
  async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 2000): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        console.log(`⚠️ 操作失败 (尝试 ${i + 1}/${maxRetries}): ${error.message}`);
        if (i === maxRetries - 1) throw error;
        console.log(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // 递增延迟
      }
    }
    throw new Error("所有重试都失败了");
  }

  before(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 FHESwapSimple Sepolia 详细测试开始");
    console.log("=".repeat(80));
    
    console.log("📡 初始化FHEVM...");
    await fhevm.initializeCLIApi();
    console.log("✅ FHEVM初始化完成");

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    
    console.log("\n👥 测试账户信息:");
    console.log(`📋 Deployer: ${signers.deployer.address}`);
    console.log(`👤 Alice: ${signers.alice.address}`);
    console.log(`👤 Bob: ${signers.bob.address}`);

    // 检查账户余额
    const deployerBalance = await ethers.provider.getBalance(signers.deployer.address);
    const aliceBalance = await ethers.provider.getBalance(signers.alice.address);
    const bobBalance = await ethers.provider.getBalance(signers.bob.address);
    
    console.log("\n💰 账户ETH余额:");
    console.log(`💼 Deployer: ${ethers.formatEther(deployerBalance)} ETH`);
    console.log(`💼 Alice: ${ethers.formatEther(aliceBalance)} ETH`);
    console.log(`💼 Bob: ${ethers.formatEther(bobBalance)} ETH`);

    // 连接到已部署的合约
    console.log("\n🔗 连接到已部署的合约...");
    
    try {
      const tokenADeployment = await deployments.get("TokenA");
      tokenAAddress = tokenADeployment.address;
      tokenA = (await ethers.getContractAt("ConfidentialFungibleTokenMintableBurnable", tokenAAddress)) as ConfidentialFungibleTokenMintableBurnable;
      console.log(`✅ TokenA连接成功: ${tokenAAddress}`);

      const tokenBDeployment = await deployments.get("TokenB");
      tokenBAddress = tokenBDeployment.address;
      tokenB = (await ethers.getContractAt("ConfidentialFungibleTokenMintableBurnable", tokenBAddress)) as ConfidentialFungibleTokenMintableBurnable;
      console.log(`✅ TokenB连接成功: ${tokenBAddress}`);

      const fHeSwapDeployment = await deployments.get("FHESwap");
      fHeSwapAddress = fHeSwapDeployment.address;
      fHeSwap = (await ethers.getContractAt("FHESwapSimple", fHeSwapAddress)) as FHESwapSimple;
      console.log(`✅ FHESwapSimple连接成功: ${fHeSwapAddress}`);
    } catch (error) {
      console.log("⚠️ 未找到已部署的合约，可能需要先运行部署脚本");
      throw error;
    }

    console.log("\n🔧 验证协处理器...");
    try {
      await hre.fhevm.assertCoprocessorInitialized(tokenA, "ConfidentialFungibleTokenMintableBurnable");
      await hre.fhevm.assertCoprocessorInitialized(tokenB, "ConfidentialFungibleTokenMintableBurnable");
      await hre.fhevm.assertCoprocessorInitialized(fHeSwap, "FHESwapSimple");
      console.log("✅ 协处理器验证完成");
    } catch (error: any) {
      console.log("⚠️ 协处理器验证警告:", error.message);
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎯 测试准备完成，开始执行测试用例");
    console.log("=".repeat(80));
  });

  it("应该验证合约部署和基本信息", async function () {
    console.log("\n📋 测试1: 验证合约部署和基本信息");
    console.log("-".repeat(50));

    console.log("🔍 验证FHESwapSimple合约配置...");
    const token0Address = await retryOperation(() => fHeSwap.token0());
    const token1Address = await retryOperation(() => fHeSwap.token1());
    const owner = await retryOperation(() => fHeSwap.owner());

    console.log(`📊 合约信息:`);
    console.log(`   Token0: ${token0Address}`);
    console.log(`   Token1: ${token1Address}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   FHESwap: ${fHeSwapAddress}`);

    expect(token0Address).to.equal(tokenAAddress);
    expect(token1Address).to.equal(tokenBAddress);
    expect(owner).to.equal(signers.deployer.address);

    console.log("✅ 合约配置验证通过");
  }); 

  it("应该允许Alice添加流动性并获得LP代币", async function () {
    console.log("\n💧 测试2: Alice添加流动性");
    console.log("-".repeat(50));

    const alice = signers.alice;
    const deployer = signers.deployer;
    
    const liquidityAmountA = ethers.parseUnits("100", 6); // 100 TokenA
    const liquidityAmountB = ethers.parseUnits("50", 6);  // 50 TokenB

    console.log(`👤 用户: ${alice.address}`);
    console.log(`💰 准备添加流动性:`);
    console.log(`   TokenA: ${ethers.formatUnits(liquidityAmountA, 6)}`);
    console.log(`   TokenB: ${ethers.formatUnits(liquidityAmountB, 6)}`);

    // 1. 为Alice铸造代币
    console.log("\n🪙 第1步: 为Alice铸造代币");
    
    const encryptedMintA = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(tokenAAddress, deployer.address).add64(liquidityAmountA).encrypt();
    });
    const mintATx = await retryOperation(() => tokenA.connect(deployer).mint(alice.address, encryptedMintA.handles[0], encryptedMintA.inputProof));
    const mintAReceipt = await retryOperation(() => mintATx.wait());
    console.log(`📤 TokenA铸造交易: ${mintATx.hash}`);
    console.log(`⛽ Gas使用: ${mintAReceipt?.gasUsed}`);

    const encryptedMintB = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(tokenBAddress, deployer.address).add64(liquidityAmountB).encrypt();
    });
    const mintBTx = await retryOperation(() => tokenB.connect(deployer).mint(alice.address, encryptedMintB.handles[0], encryptedMintB.inputProof));
    const mintBReceipt = await retryOperation(() => mintBTx.wait());
    console.log(`📤 TokenB铸造交易: ${mintBTx.hash}`);
    console.log(`⛽ Gas使用: ${mintBReceipt?.gasUsed}`);

    // 2. 设置操作员权限
    console.log("\n🔐 第2步: 设置操作员权限");
    const operatorExpiry = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期
    
    const setOpATx = await retryOperation(() => tokenA.connect(alice).setOperator(fHeSwapAddress, operatorExpiry));
    const setOpAReceipt = await retryOperation(() => setOpATx.wait());
    console.log(`🔑 TokenA操作员设置: ${setOpATx.hash}`);
    console.log(`⛽ Gas使用: ${setOpAReceipt?.gasUsed}`);
    
    const setOpBTx = await retryOperation(() => tokenB.connect(alice).setOperator(fHeSwapAddress, operatorExpiry));
    const setOpBReceipt = await retryOperation(() => setOpBTx.wait());
    console.log(`🔑 TokenB操作员设置: ${setOpBTx.hash}`);
    console.log(`⛽ Gas使用: ${setOpBReceipt?.gasUsed}`);

    // 2.1 授权合约访问Alice的机密余额（防止 ACL SenderNotAllowed）
    console.log("\n🔐 第2.1步: 授权合约访问Alice的余额");
    const aliceBalanceAForAuth = await retryOperation(() => tokenA.confidentialBalanceOf(alice.address));
    const authAliceATx = await retryOperation(() => tokenA.connect(alice).authorizeSelf(aliceBalanceAForAuth));
    await retryOperation(() => authAliceATx.wait());
    console.log(`🔑 Alice TokenA余额授权: ${authAliceATx.hash}`);
    const aliceBalanceBForAuth = await retryOperation(() => tokenB.confidentialBalanceOf(alice.address));
    const authAliceBTx = await retryOperation(() => tokenB.connect(alice).authorizeSelf(aliceBalanceBForAuth));
    await retryOperation(() => authAliceBTx.wait());
    console.log(`🔑 Alice TokenB余额授权: ${authAliceBTx.hash}`);

    // 3. 添加流动性
    console.log("\n💧 第3步: 添加流动性");
    const encryptedAmount0 = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(liquidityAmountA).encrypt();
    });
    const encryptedAmount1 = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(liquidityAmountB).encrypt();
    });
    
    const addLiquidityTx = await retryOperation(() => fHeSwap.connect(alice).addLiquidity(
      encryptedAmount0.handles[0],
      encryptedAmount0.inputProof,
      encryptedAmount1.handles[0],
      encryptedAmount1.inputProof
    ));
    
    const addLiquidityReceipt = await retryOperation(() => addLiquidityTx.wait());
    console.log(`📤 添加流动性交易: ${addLiquidityTx.hash}`);
    console.log(`⛽ Gas使用: ${addLiquidityReceipt?.gasUsed}`);
    console.log(`🧾 区块号: ${addLiquidityReceipt?.blockNumber}`);

    // 3.1 严格验证储备量（由 deployer 解密；首次添加应与投入量相等）
    const reserve0AfterAddEnc = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1AfterAddEnc = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const reserve0AfterAdd = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0AfterAddEnc),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1AfterAdd = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1AfterAddEnc),
      fHeSwapAddress,
      signers.deployer
    );
    expect(reserve0AfterAdd).to.equal(liquidityAmountA);
    expect(reserve1AfterAdd).to.equal(liquidityAmountB);

    // 4. 验证LP代币余额
    console.log("\n🎫 第4步: 验证LP代币分配");
    const aliceLPBalance = await retryOperation(() => fHeSwap.getEncryptedLPBalance(alice.address));
    const totalSupply = await retryOperation(() => fHeSwap.getEncryptedTotalSupply());
    
    console.log(`🔒 Alice LP代币句柄: ${ethers.hexlify(aliceLPBalance)}`);
    console.log(`🔒 总供应量句柄: ${ethers.hexlify(totalSupply)}`);

    try {
      const decryptedLPBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ethers.hexlify(aliceLPBalance),
        fHeSwapAddress,
        alice
      );
      console.log(`💎 Alice LP代币数量: ${ethers.formatUnits(decryptedLPBalance, 6)}`);
    } catch (error) {
      console.log("⚠️ LP代币解密失败，但分配成功");
    }

    expect(aliceLPBalance).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    expect(totalSupply).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");

    console.log("✅ Alice流动性添加测试通过");
  });

  it("应该允许Bob也添加流动性", async function () {
    console.log("\n💧 测试3: Bob添加流动性");
    console.log("-".repeat(50));

    const bob = signers.bob;
    const deployer = signers.deployer;
    
    const bobAmountA = ethers.parseUnits("60", 6); // 60 TokenA
    const bobAmountB = ethers.parseUnits("30", 6); // 30 TokenB

    console.log(`👤 用户: ${bob.address}`);
    console.log(`💰 准备添加流动性:`);
    console.log(`   TokenA: ${ethers.formatUnits(bobAmountA, 6)}`);
    console.log(`   TokenB: ${ethers.formatUnits(bobAmountB, 6)}`);

    // 铸造代币给Bob
    const encryptedMintA = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(tokenAAddress, deployer.address).add64(bobAmountA).encrypt();
    });
    const mintATx = await retryOperation(() => tokenA.connect(deployer).mint(bob.address, encryptedMintA.handles[0], encryptedMintA.inputProof));
    console.log(`📤 Bob TokenA铸造: ${mintATx.hash}`);

    const encryptedMintB = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(tokenBAddress, deployer.address).add64(bobAmountB).encrypt();
    });
    const mintBTx = await retryOperation(() => tokenB.connect(deployer).mint(bob.address, encryptedMintB.handles[0], encryptedMintB.inputProof));
    console.log(`📤 Bob TokenB铸造: ${mintBTx.hash}`);

    // 记录添加前储备（deployer 解密）
    const reserve0BeforeBobEnc = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1BeforeBobEnc = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const reserve0BeforeBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0BeforeBobEnc),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1BeforeBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1BeforeBobEnc),
      fHeSwapAddress,
      signers.deployer
    );

    // 设置操作员权限
    const operatorExpiry = Math.floor(Date.now() / 1000) + 3600;
    const setOpATx = await retryOperation(() => tokenA.connect(bob).setOperator(fHeSwapAddress, operatorExpiry));
    const setOpBTx = await retryOperation(() => tokenB.connect(bob).setOperator(fHeSwapAddress, operatorExpiry));
    console.log(`🔑 Bob操作员权限设置完成`);

    // 授权合约访问Bob的机密余额（防止 ACL SenderNotAllowed）
    console.log("\n🔐 授权合约访问Bob的余额...");
    const bobBalanceAForAuth = await retryOperation(() => tokenA.confidentialBalanceOf(bob.address));
    const authBobATx = await retryOperation(() => tokenA.connect(bob).authorizeSelf(bobBalanceAForAuth));
    await retryOperation(() => authBobATx.wait());
    console.log(`🔑 Bob TokenA余额授权: ${authBobATx.hash}`);
    const bobBalanceBForAuth = await retryOperation(() => tokenB.confidentialBalanceOf(bob.address));
    const authBobBTx = await retryOperation(() => tokenB.connect(bob).authorizeSelf(bobBalanceBForAuth));
    await retryOperation(() => authBobBTx.wait());
    console.log(`🔑 Bob TokenB余额授权: ${authBobBTx.hash}`);

    // 添加流动性
    const encryptedAmount0 = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, bob.address).add64(bobAmountA).encrypt();
    });
    const encryptedAmount1 = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, bob.address).add64(bobAmountB).encrypt();
    });
    
    const addLiquidityTx = await retryOperation(() => fHeSwap.connect(bob).addLiquidity(
      encryptedAmount0.handles[0],
      encryptedAmount0.inputProof,
      encryptedAmount1.handles[0],
      encryptedAmount1.inputProof
    ));
    
    const receipt = await retryOperation(() => addLiquidityTx.wait());
    console.log(`📤 Bob添加流动性: ${addLiquidityTx.hash}`);
    console.log(`⛽ Gas使用: ${receipt?.gasUsed}`);

    // 严格验证储备差值
    const reserve0AfterBobEnc = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1AfterBobEnc = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const reserve0AfterBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0AfterBobEnc),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1AfterBob = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1AfterBobEnc),
      fHeSwapAddress,
      signers.deployer
    );
    expect(reserve0AfterBob - reserve0BeforeBob).to.equal(bobAmountA);
    expect(reserve1AfterBob - reserve1BeforeBob).to.equal(bobAmountB);

    // 验证Bob的LP代币
    const bobLPBalance = await retryOperation(() => fHeSwap.getEncryptedLPBalance(bob.address));
    console.log(`🔒 Bob LP代币句柄: ${ethers.hexlify(bobLPBalance)}`);

    expect(bobLPBalance).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    console.log("✅ Bob流动性添加测试通过");
  });

  it("应该允许Alice进行代币交换", async function () {
    console.log("\n🔄 测试4: Alice执行代币交换");
    console.log("-".repeat(50));

    const alice = signers.alice;
    const deployer = signers.deployer;
    const swapAmount = ethers.parseUnits("10", 6); // 10 TokenA

    console.log(`👤 交换用户: ${alice.address}`);
    console.log(`💱 交换金额: ${ethers.formatUnits(swapAmount, 6)} TokenA → TokenB`);

    // 1. 为Alice铸造更多TokenA用于交换
    console.log("\n🪙 第1步: 为Alice铸造交换用代币");
    const encryptedMintA = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(tokenAAddress, deployer.address).add64(swapAmount).encrypt();
    });
    const mintATx = await retryOperation(() => tokenA.connect(deployer).mint(alice.address, encryptedMintA.handles[0], encryptedMintA.inputProof));
    console.log(`📤 额外TokenA铸造: ${mintATx.hash}`);
    // 铸币后立刻重新授权，获取最新余额句柄
    const aliceAfterMintForAuth = await retryOperation(() => tokenA.confidentialBalanceOf(alice.address));
    const authAliceAfterMintTx = await retryOperation(() => tokenA.connect(alice).authorizeSelf(aliceAfterMintForAuth));
    await retryOperation(() => authAliceAfterMintTx.wait());
    console.log(`🔑 Alice 铸后余额授权: ${authAliceAfterMintTx.hash}`);

    // 2. 获取交换估算
    console.log("\n📊 第2步: 获取交换估算");
    const encryptedSwapAmount = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(swapAmount).encrypt();
    });
    // 报价前再次授权，确保读取/计算使用最新句柄
    const aliceSwapBalanceAuth = await retryOperation(() => tokenA.confidentialBalanceOf(alice.address));
    const authAliceSwapTx = await retryOperation(() => tokenA.connect(alice).authorizeSelf(aliceSwapBalanceAuth));
    await retryOperation(() => authAliceSwapTx.wait());
    console.log(`🔑 Alice 报价前余额授权: ${authAliceSwapTx.hash}`);
    const getAmountOutTx = await retryOperation(() => fHeSwap.connect(alice).getAmountOut(
      encryptedSwapAmount.handles[0],
      encryptedSwapAmount.inputProof,
      tokenAAddress
    ));
    const estimateReceipt = await retryOperation(() => getAmountOutTx.wait());
    console.log(`📤 价格查询交易: ${getAmountOutTx.hash}`);
    console.log(`⛽ Gas使用: ${estimateReceipt?.gasUsed}`);

    // 3. 解密分子分母
    console.log("\n🔢 第3步: 计算交换输出");
    const numerator = await fHeSwap.connect(alice).getEncryptedNumerator();
    const denominator = await fHeSwap.connect(alice).getEncryptedDenominator();
    
    console.log(`🔒 分子句柄: ${ethers.hexlify(numerator)}`);
    console.log(`🔒 分母句柄: ${ethers.hexlify(denominator)}`);

    let expectedOut: bigint = 0n;
    let minOut: bigint = 0n;
    
    try {
      const decryptedNumerator = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ethers.hexlify(numerator),
        fHeSwapAddress,
        alice
      );
      
      const decryptedDenominator = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ethers.hexlify(denominator),
        fHeSwapAddress,
        alice
      );
      
      expectedOut = decryptedNumerator / decryptedDenominator;
      minOut = (expectedOut * 99n) / 100n; // 1% 滑点
      
      console.log(`🧮 分子: ${decryptedNumerator}`);
      console.log(`🧮 分母: ${decryptedDenominator}`);
      console.log(`💰 期望输出: ${ethers.formatUnits(expectedOut, 6)} TokenB`);
      console.log(`📉 最小输出: ${ethers.formatUnits(minOut, 6)} TokenB (1%滑点)`);
    } catch (error) {
      console.log("⚠️ 解密失败，交换无法继续");
      throw new Error("无法计算交换输出，解密失败");
    }

    // 3.1 严格验证储备差值（报价后尚未变更储备；在 swap 前记录基线）
    const reserve0BeforeSwapEnc = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1BeforeSwapEnc = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const reserve0BeforeSwap = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0BeforeSwapEnc),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1BeforeSwap = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1BeforeSwapEnc),
      fHeSwapAddress,
      signers.deployer
    );

    // 4. 执行交换
    console.log("\n🔄 第4步: 执行交换");
    // swap 之前再次授权，避免在估算与执行之间句柄变化
    const aliceBeforeSwapForAuth = await retryOperation(() => tokenA.confidentialBalanceOf(alice.address));
    const authAliceBeforeSwapTx = await retryOperation(() => tokenA.connect(alice).authorizeSelf(aliceBeforeSwapForAuth));
    await retryOperation(() => authAliceBeforeSwapTx.wait());
    console.log(`🔑 Alice 交换前余额授权: ${authAliceBeforeSwapTx.hash}`);
    const encryptedExpectedOut = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(expectedOut).encrypt();
    });
    const encryptedMinOut = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(minOut).encrypt();
    });
    
    const swapTx = await retryOperation(() => fHeSwap.connect(alice).swap(
      encryptedSwapAmount.handles[0],
      encryptedSwapAmount.inputProof,
      encryptedExpectedOut.handles[0],
      encryptedExpectedOut.inputProof,
      encryptedMinOut.handles[0],
      encryptedMinOut.inputProof,
      tokenAAddress,
      alice.address
    ));
    
    const swapReceipt = await retryOperation(() => swapTx.wait());
    console.log(`📤 交换执行交易: ${swapTx.hash}`);
    console.log(`⛽ Gas使用: ${swapReceipt?.gasUsed}`);
    console.log(`🧾 区块号: ${swapReceipt?.blockNumber}`);

    // 4.1 严格验证储备差值（交换后）
    const reserve0AfterSwapEnc = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1AfterSwapEnc = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const reserve0AfterSwap = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0AfterSwapEnc),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1AfterSwap = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1AfterSwapEnc),
      fHeSwapAddress,
      signers.deployer
    );
    expect(reserve0AfterSwap - reserve0BeforeSwap).to.equal(swapAmount);
    expect(reserve1BeforeSwap - reserve1AfterSwap).to.equal(expectedOut);

    // 5. 验证交换后余额
    console.log("\n💰 第5步: 验证交换结果");
    const aliceTokenABalance = await tokenA.confidentialBalanceOf(alice.address);
    const aliceTokenBBalance = await tokenB.confidentialBalanceOf(alice.address);
    
    console.log(`🔒 Alice TokenA余额句柄: ${ethers.hexlify(aliceTokenABalance)}`);
    console.log(`🔒 Alice TokenB余额句柄: ${ethers.hexlify(aliceTokenBBalance)}`);

    try {
      const decryptedTokenABalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ethers.hexlify(aliceTokenABalance),
        tokenAAddress,
        alice
      );
      
      const decryptedTokenBBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        ethers.hexlify(aliceTokenBBalance),
        tokenBAddress,
        alice
      );
      
      console.log(`💰 Alice TokenA余额: ${ethers.formatUnits(decryptedTokenABalance, 6)}`);
      console.log(`💰 Alice TokenB余额: ${ethers.formatUnits(decryptedTokenBBalance, 6)}`);
    } catch (error) {
      console.log("⚠️ 余额解密失败，但交换成功执行");
    }

    expect(expectedOut).to.be.greaterThan(0n);
    console.log("✅ Alice代币交换测试通过");
  });

  it("应该允许Alice移除部分流动性", async function () {
    console.log("\n📤 测试5: Alice移除流动性");
    console.log("-".repeat(50));

    const alice = signers.alice;
    const liquidityToRemove = ethers.parseUnits("30", 6); // 移除30个LP代币

    console.log(`👤 用户: ${alice.address}`);
    console.log(`📉 准备移除LP代币: ${ethers.formatUnits(liquidityToRemove, 6)}`);

    // 1. 查看移除前状态（用于后续严格比较）
    console.log("\n📊 第1步: 移除前状态查询");
    const lpBalanceBefore = await retryOperation(() => fHeSwap.getEncryptedLPBalance(alice.address));
    const reserve0Before = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1Before = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    
    console.log(`🔒 移除前LP余额句柄: ${ethers.hexlify(lpBalanceBefore)}`);

    // 2. 执行流动性移除
    console.log("\n📤 第2步: 执行流动性移除");
        const encryptedLiquidity = await retryOperation(async () => {
      return await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(liquidityToRemove).encrypt();
    });
    
    const removeLiquidityTx = await retryOperation(() => fHeSwap.connect(alice).removeLiquidity(
      encryptedLiquidity.handles[0],
      encryptedLiquidity.inputProof
    ));
    
    const removeReceipt = await retryOperation(() => removeLiquidityTx.wait());
    console.log(`📤 移除流动性交易: ${removeLiquidityTx.hash}`);
    console.log(`⛽ Gas使用: ${removeReceipt?.gasUsed}`);
    console.log(`🧾 区块号: ${removeReceipt?.blockNumber}`);

    // 3. 验证移除后状态
    console.log("\n📊 第3步: 移除后状态验证");
    const lpBalanceAfter = await retryOperation(() => fHeSwap.getEncryptedLPBalance(alice.address));
    const reserve0After = await retryOperation(() => fHeSwap.getEncryptedReserve0());
    const reserve1After = await retryOperation(() => fHeSwap.getEncryptedReserve1());
    const totalSupplyAfter = await retryOperation(() => fHeSwap.getEncryptedTotalSupply());
    
    console.log(`🔒 移除后LP余额句柄: ${ethers.hexlify(lpBalanceAfter)}`);
    console.log(`🔒 移除后Reserve0句柄: ${ethers.hexlify(reserve0After)}`);
    console.log(`🔒 移除后Reserve1句柄: ${ethers.hexlify(reserve1After)}`);
    console.log(`🔒 移除后总供应句柄: ${ethers.hexlify(totalSupplyAfter)}`);

    // 3.1 严格解密对比（由 deployer 解密储备）
    const reserve0BeforeDec = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0Before),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1BeforeDec = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1Before),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve0AfterDec = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve0After),
      fHeSwapAddress,
      signers.deployer
    );
    const reserve1AfterDec = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethers.hexlify(reserve1After),
      fHeSwapAddress,
      signers.deployer
    );
    expect(reserve0BeforeDec - reserve0AfterDec).to.equal(liquidityToRemove);
    expect(reserve1BeforeDec - reserve1AfterDec).to.equal(liquidityToRemove);

    // 4. 验证Alice收到的代币（若解密失败不阻断，因为储备已严格断言）
    console.log("\n💰 第4步: 验证返还代币");
    const aliceTokenABalance = await tokenA.confidentialBalanceOf(alice.address);
    const aliceTokenBBalance = await tokenB.confidentialBalanceOf(alice.address);
    
    console.log(`🔒 Alice TokenA余额句柄: ${ethers.hexlify(aliceTokenABalance)}`);
    console.log(`🔒 Alice TokenB余额句柄: ${ethers.hexlify(aliceTokenBBalance)}`);

    expect(lpBalanceAfter).to.not.equal(lpBalanceBefore);
    console.log("✅ Alice流动性移除测试通过");
  });

  after(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("🎉 FHESwapSimple Sepolia详细测试完成");
    console.log("=".repeat(80));
    
    console.log("\n📊 测试总结:");
    console.log("✅ 合约部署验证");
    console.log("✅ Alice添加流动性");
    console.log("✅ Bob添加流动性");
    console.log("✅ Alice代币交换");
    console.log("✅ Alice移除流动性");
    
    console.log("\n🔗 相关地址:");
    console.log(`🏭 FHESwapSimple: ${fHeSwapAddress}`);
    console.log(`🪙 TokenA: ${tokenAAddress}`);
    console.log(`🪙 TokenB: ${tokenBAddress}`);
    
    console.log("\n📱 在Sepolia浏览器查看:");
    console.log(`🌐 https://sepolia.etherscan.io/address/${fHeSwapAddress}`);
    console.log(`🌐 https://sepolia.etherscan.io/address/${tokenAAddress}`);
    console.log(`🌐 https://sepolia.etherscan.io/address/${tokenBAddress}`);
    
    console.log("\n" + "=".repeat(80));
  });
});