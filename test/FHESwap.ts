import { FHESwap, FHESwap__factory, ConfidentialFungibleTokenMintableBurnable, ConfidentialFungibleTokenMintableBurnable__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import hre from "hardhat";
import { ethers as ethersjs } from "ethers";

/**
 * @dev 定义测试中使用的签名者（账户）类型。
 * deployer: 部署合约的账户，通常是测试中的"所有者"或"管理员"。
 * alice: 模拟普通用户进行交互的账户。
 * bob: 另一个模拟普通用户进行交互的账户。
 */
type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

/**
 * @dev 部署 ConfidentialFungibleTokenMintableBurnable 和 FHESwap 合约的辅助函数。
 * @param deployerAddress 合约的部署者地址，也将是代币合约和 FHESwap 合约的所有者。
 * @returns 包含部署的代币合约实例、地址以及 FHESwap 合约实例和地址的对象。
 */
async function deployTokenAndSwapFixture(deployerAddress: string) {
  console.log("\n--- 部署合约 ---");
  // 获取 ConfidentialFungibleTokenMintableBurnable 合约工厂
  const tokenFactory = (await ethers.getContractFactory("ConfidentialFungibleTokenMintableBurnable")) as ConfidentialFungibleTokenMintableBurnable__factory;
  // 部署 TokenA，设定名称为 "TokenA"，符号为 "TKA"
  const tokenA = (await tokenFactory.deploy(deployerAddress, "TokenA", "TKA", "https://example.com/metadataA")) as ConfidentialFungibleTokenMintableBurnable;
  // 部署 TokenB，设定名称为 "TokenB"，符号为 "TKB"
  const tokenB = (await tokenFactory.deploy(deployerAddress, "TokenB", "TKB", "https://example.com/metadataB")) as ConfidentialFungibleTokenMintableBurnable;

  // 获取部署的 TokenA 和 TokenB 合约地址
  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();
  console.log(`TokenA 部署地址: ${tokenAAddress}`);
  console.log(`TokenB 部署地址: ${tokenBAddress}`);

  // 获取 FHESwap 合约工厂
  const swapFactory = (await ethers.getContractFactory("FHESwap")) as FHESwap__factory;
  // 部署 FHESwap 合约，传入 TokenA 和 TokenB 的地址，以及部署者地址作为所有者
  const fHeSwap = (await swapFactory.deploy(tokenAAddress, tokenBAddress, deployerAddress)) as FHESwap;
  // 获取部署的 FHESwap 合约地址
  const fHeSwapAddress = await fHeSwap.getAddress();
  console.log(`FHESwap 部署地址: ${fHeSwapAddress}`);
  console.log("--- 合约部署完成 ---\n");

  // 返回所有部署的合约实例和地址
  return { tokenA, tokenB, tokenAAddress, tokenBAddress, fHeSwap, fHeSwapAddress };
}

/**
 * @dev FHESwap 合约的测试套件。
 * 包含了部署、流动性提供和代币交换的测试用例。
 */
describe("FHESwap", function () {
  // 定义测试中使用的签名者和合约实例变量
  let signers: Signers;
  let tokenA: ConfidentialFungibleTokenMintableBurnable;
  let tokenB: ConfidentialFungibleTokenMintableBurnable;
  let tokenAAddress: string;
  let tokenBAddress: string;
  let fHeSwap: FHESwap;
  let fHeSwapAddress: string;

  // 在所有测试用例执行前执行一次的钩子函数
  before(async function () {
    console.log("--- 测试初始化 ---");
    // 初始化 FHEVM CLI API，这是与 FHEVM 交互所必需的
    await fhevm.initializeCLIApi();
    // 获取 Hardhat 提供的以太坊签名者（账户）
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    // 将签名者分配给具名变量以便后续使用
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    console.log(`Deployer 地址: ${signers.deployer.address}`);
    console.log(`Alice 地址: ${signers.alice.address}`);
    console.log(`Bob 地址: ${signers.bob.address}`);

    // 调用辅助函数部署所有合约，并解构赋值到对应的变量
    ({ tokenA, tokenB, tokenAAddress, tokenBAddress, fHeSwap, fHeSwapAddress } = await deployTokenAndSwapFixture(await signers.deployer.getAddress()));

    // 断言 FHEVM 协处理器已初始化。这对于确保 FHE 操作正常工作至关重要。
    await hre.fhevm.assertCoprocessorInitialized(tokenA, "ConfidentialFungibleTokenMintableBurnable");
    await hre.fhevm.assertCoprocessorInitialized(tokenB, "ConfidentialFungibleTokenMintableBurnable");
    await hre.fhevm.assertCoprocessorInitialized(fHeSwap, "FHESwap");
    console.log("--- FHEVM 协处理器初始化完成 ---\n");
  });

  /**
   * @dev 测试 FHESwap 合约是否成功部署，并检查其初始状态（如 token0, token1, owner 地址）。
   */
  it("should deploy FHESwap successfully and set correct token addresses", async function () {
    console.log("--- 测试: 部署 FHESwap 并设置正确地址 ---");

    // 验证 FHESwap 合约中记录的 token0 地址是否与实际部署的 TokenA 地址一致
    expect(await fHeSwap.token0()).to.equal(tokenAAddress);
    console.log(`FHESwap.token0: ${await fHeSwap.token0()} (预期: ${tokenAAddress})`);

    // 验证 FHESwap 合约中记录的 token1 地址是否与实际部署的 TokenB 地址一致
    expect(await fHeSwap.token1()).to.equal(tokenBAddress);
    console.log(`FHESwap.token1: ${await fHeSwap.token1()} (预期: ${tokenBAddress})`);
    
    // 验证 FHESwap 合约的所有者是否是部署者
    expect(await fHeSwap.owner()).to.equal(signers.deployer.address);
    console.log(`FHESwap.owner: ${await fHeSwap.owner()} (预期: ${signers.deployer.address})`);
    console.log("--- 部署测试通过 ---\n");
  });

  /**
   * @dev 测试所有者（deployer）是否能够成功铸造初始流动性到 FHESwap 合约。
   * 这包括铸造代币给自己，授权 FHESwap 合约作为操作员，然后调用 FHESwap 的 mint 函数。
   * 最后验证 FHESwap 合约内部的加密储备量是否正确更新。
   */
  it("should allow owner to mint initial liquidity", async function () {
    console.log("--- 测试: 所有者铸造初始流动性 ---");
    const owner = signers.deployer; // 定义所有者为 deployer 账户
    const initialReserveAmount = 1000; // 初始流动性金额
    console.log(`初始储备金额: ${initialReserveAmount}`);

    // 1. 所有者首先铸造 TokenA 和 TokenB 给自己 (用于提供流动性)
    console.log("1. Owner mints tokens to themselves:");
    // 创建加密输入，目标合约为 TokenA，发起人为 owner，值为 initialReserveAmount (euint64 类型)
    const encryptedMintA = await fhevm.createEncryptedInput(tokenAAddress, owner.address).add64(initialReserveAmount).encrypt();
    console.log(`创建加密输入 (TokenA): Handle=${ethersjs.hexlify(encryptedMintA.handles[0])}, Proof=${ethersjs.hexlify(encryptedMintA.inputProof)}`);
    // owner 调用 TokenA 合约的 mint 函数，将加密的 TokenA 铸造给 owner 自己
    await tokenA.connect(owner).mint(owner.address, encryptedMintA.handles[0], encryptedMintA.inputProof);
    console.log(`Owner 铸造 ${initialReserveAmount} TokenA 给自己.`);

    // 获取 owner 在 TokenA 中的加密余额句柄
    const ownerTokenAEncryptedBalance = await tokenA.confidentialBalanceOf(owner.address);
    console.log(`Owner 在 TokenA 中的加密余额句柄: ${ethersjs.hexlify(ownerTokenAEncryptedBalance)}`);
    // 授权 TokenA 合约操作 owner 在 TokenA 中的加密余额
    await tokenA.connect(owner).authorizeSelf(ownerTokenAEncryptedBalance);
    console.log(`Owner 授权 TokenA 合约操作其 TokenA 加密余额 (handle: ${ethersjs.hexlify(ownerTokenAEncryptedBalance)}, 授权给: ${tokenAAddress}).`);

    // 解密 owner 在 TokenA 中的余额，进行诊断性打印
    const decryptedOwnerTokenA = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(ownerTokenAEncryptedBalance),
      tokenAAddress,
      owner
    );
    console.log(`诊断: Owner 的 TokenA 余额 (解密后): ${decryptedOwnerTokenA}`);

    // 创建加密输入，目标合约为 TokenB，发起人为 owner，值为 initialReserveAmount (euint64 类型)
    const encryptedMintB = await fhevm.createEncryptedInput(tokenBAddress, owner.address).add64(initialReserveAmount).encrypt();
    console.log(`创建加密输入 (TokenB): Handle=${ethersjs.hexlify(encryptedMintB.handles[0])}, Proof=${ethersjs.hexlify(encryptedMintB.inputProof)}`);
    // owner 调用 TokenB 合约的 mint 函数，将加密的 TokenB 铸造给 owner 自己
    await tokenB.connect(owner).mint(owner.address, encryptedMintB.handles[0], encryptedMintB.inputProof);
    console.log(`Owner 铸造 ${initialReserveAmount} TokenB 给自己.`);

    // 获取 owner 在 TokenB 中的加密余额句柄
    const ownerTokenBEncryptedBalance = await tokenB.confidentialBalanceOf(owner.address);
    console.log(`Owner 在 TokenB 中的加密余额句柄: ${ethersjs.hexlify(ownerTokenBEncryptedBalance)}`);
    // 授权 TokenB 合约操作 owner 在 TokenB 中的加密余额
    await tokenB.connect(owner).authorizeSelf(ownerTokenBEncryptedBalance);
    console.log(`Owner 授权 TokenB 合约操作其 TokenB 加密余额 (handle: ${ethersjs.hexlify(ownerTokenBEncryptedBalance)}, 授权给: ${tokenBAddress}).`);

    // 2. 所有者授权 FHESwap 合约作为 TokenA 和 TokenB 的操作员
    console.log("2. Owner approves FHESwap as operator for TokenA and TokenB:");
    // operatorExpiry 定义了操作员授权的过期时间（当前时间 + 1 小时）
    const operatorExpiry = Math.floor(Date.now() / 1000) + 3600;
    // owner 调用 TokenA 合约的 setOperator，授权 FHESwap 合约可以操作 owner 的 TokenA
    await tokenA.connect(owner).setOperator(fHeSwapAddress, operatorExpiry);
    console.log(`Owner 授权 FHESwap 为 TokenA 操作员 (FHESwap 地址: ${fHeSwapAddress}, 过期时间: ${operatorExpiry}).`);
    // owner 调用 TokenB 合约的 setOperator，授权 FHESwap 合约可以操作 owner 的 TokenB
    await tokenB.connect(owner).setOperator(fHeSwapAddress, operatorExpiry);
    console.log(`Owner 授权 FHESwap 为 TokenB 操作员 (FHESwap 地址: ${fHeSwapAddress}, 过期时间: ${operatorExpiry}).`);

    // 3. 所有者向 FHESwap 合约提供流动性
    console.log("3. Owner provides liquidity to FHESwap:");
    // 创建加密输入，目标合约为 FHESwap，发起人为 owner，值为 initialReserveAmount (euint64 类型)
    // 注意：这里的 target contract 必须是 fHeSwapAddress，因为这些加密输入是为 FHESwap 的 mint 函数准备的
    const encryptedAmount0 = await fhevm.createEncryptedInput(fHeSwapAddress, owner.address).add64(initialReserveAmount).encrypt();
    console.log(`创建加密输入 (FHESwap mint TokenA): Handle=${ethersjs.hexlify(encryptedAmount0.handles[0])}, Proof=${ethersjs.hexlify(encryptedAmount0.inputProof)}`);
    const encryptedAmount1 = await fhevm.createEncryptedInput(fHeSwapAddress, owner.address).add64(initialReserveAmount).encrypt();
    console.log(`创建加密输入 (FHESwap mint TokenB): Handle=${ethersjs.hexlify(encryptedAmount1.handles[0])}, Proof=${ethersjs.hexlify(encryptedAmount1.inputProof)}`);
    console.log(`准备向 FHESwap 注入 TokenA: ${initialReserveAmount}, TokenB: ${initialReserveAmount} (加密).`);

    // owner 调用 FHESwap 合约的 mint 函数，提供加密的 TokenA 和 TokenB 作为流动性
    await fHeSwap.connect(owner).mint(
      encryptedAmount0.handles[0],
      encryptedAmount0.inputProof,
      encryptedAmount1.handles[0],
      encryptedAmount1.inputProof
    );
    console.log("FHESwap.mint 调用完成，流动性已注入。");

    // 验证 FHESwap 合约内部的储备量 (加密状态下)
    console.log("验证 FHESwap 储备量:");
    // 获取 FHESwap 合约的加密 reserve0
    const encryptedReserve0 = await fHeSwap.getEncryptedReserve0();
    // 解密 reserve0，用于链下验证。需要提供 FHE 类型、加密值、关联的合约地址和解密者。
    const decryptedReserve0 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(encryptedReserve0),
      fHeSwapAddress,
      owner // 这里是 owner，因为 reserve0 允许 owner 访问
    );
    console.log(`解密后 FHESwap reserve0: ${decryptedReserve0} (预期: ${initialReserveAmount})`);
    // 断言解密后的 reserve0 等于初始设定的流动性金额
    expect(decryptedReserve0).to.equal(initialReserveAmount);

    // 获取 FHESwap 合约的加密 reserve1
    const encryptedReserve1 = await fHeSwap.getEncryptedReserve1();
    // 解密 reserve1
    const decryptedReserve1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(encryptedReserve1),
      fHeSwapAddress,
      owner
    );
    console.log(`解密后 FHESwap reserve1: ${decryptedReserve1} (预期: ${initialReserveAmount})`);
    // 断言解密后的 reserve1 等于初始设定的流动性金额
    expect(decryptedReserve1).to.equal(initialReserveAmount);
    console.log("--- 初始流动性注入测试通过 ---\n");
  });

  /**
   * @dev 测试用户 (Alice) 是否能够成功将 TokenA 交换为 TokenB，并包含手续费计算。
   * 这个测试模拟了 FHEVM 中链下计算和链上验证的流程。
   */
  it("should allow a user to swap TokenA for TokenB with fees", async function () {
    console.log("--- 测试: 用户交换 TokenA 为 TokenB ---");
    const owner = signers.deployer; // 部署者账户
    const alice = signers.alice;   // 模拟用户账户
    const swapAmount = 100;        // 交换的 TokenA 数量
    const initialReserve = 1000;   // 从上一个测试用例继承的初始储备量
    console.log(`交换金额: ${swapAmount}, 初始储备: ${initialReserve}`);

    // 确保 Alice 有足够的 TokenA 进行交换
    console.log("Alice 获取 TokenA:");
    // owner 铸造 swapAmount 的 TokenA 给 Alice
    const encryptedAliceMintA = await fhevm.createEncryptedInput(tokenAAddress, owner.address).add64(swapAmount).encrypt();
    console.log(`创建加密输入 (Alice Mint TokenA): Handle=${ethersjs.hexlify(encryptedAliceMintA.handles[0])}, Proof=${ethersjs.hexlify(encryptedAliceMintA.inputProof)}`);
    await tokenA.connect(owner).mint(alice.address, encryptedAliceMintA.handles[0], encryptedAliceMintA.inputProof);
    console.log(`Owner 铸造 ${swapAmount} TokenA 给 Alice.`);

    // 获取 Alice 在 TokenA 中的加密余额句柄
    const aliceTokenAEncryptedBalanceAtMint = await tokenA.confidentialBalanceOf(alice.address);
    console.log(`Alice 在 TokenA 中的加密余额句柄: ${ethersjs.hexlify(aliceTokenAEncryptedBalanceAtMint)}`);
    // 授权 TokenA 合约操作 Alice 在 TokenA 中的加密余额
    await tokenA.connect(alice).authorizeSelf(aliceTokenAEncryptedBalanceAtMint);
    console.log(`Alice 授权 TokenA 合约操作其 TokenA 加密余额 (handle: ${ethersjs.hexlify(aliceTokenAEncryptedBalanceAtMint)}, 授权给: ${tokenAAddress}).`);

    console.log(`Alice 授权 TokenA 合约操作其 TokenA 加密余额.`);

    // 解密 Alice 在 TokenA 中的余额，进行诊断性打印
    const decryptedAliceTokenA = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(aliceTokenAEncryptedBalanceAtMint),
      tokenAAddress,
      alice
    );
    console.log(`诊断: Alice 的 TokenA 余额 (解密后): ${decryptedAliceTokenA}`);

    // Alice 授权 FHESwap 合约作为 TokenA 的操作员
    console.log("Alice 授权 FHESwap 为 TokenA 操作员:");
    // 授权 FHESwap 合约可以从 Alice 的地址转移 TokenA
    const operatorExpiry = Math.floor(Date.now() / 1000) + 3600;
    await tokenA.connect(alice).setOperator(fHeSwapAddress, operatorExpiry);
    console.log(`Alice 授权 FHESwap 为 TokenA 操作员 (FHESwap 地址: ${fHeSwapAddress}, 过期时间: ${operatorExpiry}).`);

    // 1. Alice 调用 FHESwap 的 getAmountOut 函数获取分子和分母 (链上加密计算)
    console.log("1. Alice 调用 getAmountOut 获取分子分母 (链上加密计算):");
    // 创建加密输入，目标合约为 FHESwap，发起人为 alice，值为 swapAmount (euint64 类型)
    const encryptedSwapAmountIn = await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(swapAmount).encrypt();
    console.log(`创建加密输入 (Swap AmountIn): Handle=${ethersjs.hexlify(encryptedSwapAmountIn.handles[0])}, Proof=${ethersjs.hexlify(encryptedSwapAmountIn.inputProof)}`);
    // Alice 调用 getAmountOut，传入加密的输入金额和输入代币地址
    await fHeSwap.connect(alice).getAmountOut(
      encryptedSwapAmountIn.handles[0],
      encryptedSwapAmountIn.inputProof,
      tokenAAddress // 指定输入代币是 TokenA
    );
    console.log("getAmountOut 调用完成。");

    // 获取链上计算得到的加密分子和加密分母
    const encryptedNumerator = await fHeSwap.connect(alice).getEncryptedNumerator();
    console.log(`获取到加密分子: ${ethersjs.hexlify(encryptedNumerator)}`);
    const encryptedDenominator = await fHeSwap.connect(alice).getEncryptedDenominator();
    console.log(`获取到加密分母: ${ethersjs.hexlify(encryptedDenominator)}`);

    // 2. Alice 在链下解密分子和分母
    console.log("2. Alice 在链下解密分子分母:");
    // 解密分子
    const decryptedNumerator = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(encryptedNumerator),
      fHeSwapAddress,
      alice
    );
    console.log(`解密后分子: ${decryptedNumerator}`);
    // 解密分母
    const decryptedDenominator = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(encryptedDenominator),
      fHeSwapAddress,
      alice
    );
    console.log(`解密后分母: ${decryptedDenominator}`);

    // 3. Alice 在链下计算期望的输出金额 (明文除法)
    console.log("3. Alice 在链下计算期望输出金额:");
    // 注意：FHEVM 不支持加密除法，因此这一步必须在链下进行
    const expectedClearAmountOut = Number(decryptedNumerator / decryptedDenominator); // 使用 Math.floor 进行整数除法
    console.log(`链下计算的期望输出金额 (expectedClearAmountOut): ${expectedClearAmountOut}`);

    // 4. Alice 在链下根据滑点计算最小期望输出金额
    console.log("4. Alice 在链下计算最小期望输出金额 (带滑点):");
    const slippageTolerance = 0.01; // 1% 滑点容忍度
    const minClearAmountOut = Math.floor(expectedClearAmountOut * (1 - slippageTolerance));
    console.log(`滑点容忍度: ${slippageTolerance * 100}%, 最小期望输出金额 (minClearAmountOut): ${minClearAmountOut}`);

    // 5. Alice 重新加密期望输出金额和最小期望输出金额，准备发送到链上
    console.log("5. Alice 重新加密期望输出金额和最小期望输出金额:");
    // 再次强调：目标合约是 fHeSwapAddress
    const encryptedExpectedAmountOut = await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(expectedClearAmountOut).encrypt();
    console.log(`重新加密期望输出金额: Handle=${ethersjs.hexlify(encryptedExpectedAmountOut.handles[0])}, Proof=${ethersjs.hexlify(encryptedExpectedAmountOut.inputProof)}`);
    const encryptedMinAmountOut = await fhevm.createEncryptedInput(fHeSwapAddress, alice.address).add64(minClearAmountOut).encrypt();
    console.log(`重新加密最小期望输出金额: Handle=${ethersjs.hexlify(encryptedMinAmountOut.handles[0])}, Proof=${ethersjs.hexlify(encryptedMinAmountOut.inputProof)}`);
    console.log("重新加密完成。");

    // 6. Alice 执行交换 (链上事务)
    console.log("6. Alice 执行交换 (链上事务):");
    console.log(`调用 fHeSwap.swap 参数：\n  encryptedSwapAmountIn.handles[0]: ${ethersjs.hexlify(encryptedSwapAmountIn.handles[0])}\n  encryptedSwapAmountIn.inputProof: ${ethersjs.hexlify(encryptedSwapAmountIn.inputProof)}\n  encryptedExpectedAmountOut.handles[0]: ${ethersjs.hexlify(encryptedExpectedAmountOut.handles[0])}\n  encryptedExpectedAmountOut.inputProof: ${ethersjs.hexlify(encryptedExpectedAmountOut.inputProof)}\n  encryptedMinAmountOut.handles[0]: ${ethersjs.hexlify(encryptedMinAmountOut.handles[0])}\n  encryptedMinAmountOut.inputProof: ${ethersjs.hexlify(encryptedMinAmountOut.inputProof)}\n  tokenAAddress: ${tokenAAddress}\n  alice.address: ${alice.address}`);

    await fHeSwap.connect(alice).swap(
      encryptedSwapAmountIn.handles[0],    // 传入的加密金额句柄
      encryptedSwapAmountIn.inputProof,    // 传入金额的加密证明
      encryptedExpectedAmountOut.handles[0], // 链下计算并重新加密的期望输出量句柄
      encryptedExpectedAmountOut.inputProof, // 期望输出量的加密证明
      encryptedMinAmountOut.handles[0],    // 链下计算并重新加密的最小期望输出量句柄
      encryptedMinAmountOut.inputProof,    // 最小期望输出量的加密证明
      tokenAAddress,                       // 输入代币是 TokenA
      alice.address                        // 输出代币接收方是 Alice
    );
    console.log("FHESwap.swap 调用完成。");

    // 交换完成后，验证 Alice 的余额
    console.log("验证 Alice 余额:");

    // 获取 Alice 的 TokenA 加密余额
    const aliceTokenAEncryptedBalance = await tokenA.confidentialBalanceOf(alice.address);
    
    // 解密 Alice 的 TokenA 余额
    const aliceTokenADecryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(aliceTokenAEncryptedBalance),
      tokenAAddress,
      alice
    );
    console.log(`Alice 的 TokenA 余额 (解密): ${aliceTokenADecryptedBalance}`);

    // 获取 Alice 的 TokenB 加密余额
    const aliceTokenBEncryptedBalance = await tokenB.confidentialBalanceOf(alice.address);
    
    // 解密 Alice 的 TokenB 余额
    const aliceTokenBDecryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(aliceTokenBEncryptedBalance),
      tokenBAddress,
      alice
    );
    console.log(`Alice 的 TokenB 余额 (解密): ${aliceTokenBDecryptedBalance}`);

    // 计算 Alice 期望的最终余额
    const expectedAliceTokenA = 0; // Alice 交换了所有她最初的 TokenA
    // Alice 的 TokenB 余额 = 期望获得的 TokenB 数量 (因为 Alice 初始没有 TokenB)
    const expectedAliceTokenB = expectedClearAmountOut;

    // 断言 Alice 的 TokenA 余额为 0
    expect(aliceTokenADecryptedBalance).to.equal(expectedAliceTokenA);
    
    // 断言 Alice 的 TokenB 余额符合预期
    expect(aliceTokenBDecryptedBalance).to.equal(expectedAliceTokenB);
    console.log("Alice 余额验证通过。");

    // 验证 FHESwap 合约的储备量在交换后是否正确更新
    console.log("验证 FHESwap 储备量更新:");
    
    // 获取 FHESwap 的加密 reserve0
    const fHeSwapReserve0Encrypted = await fHeSwap.getEncryptedReserve0();
    
    // 解密 FHESwap 的 reserve0
    const fHeSwapReserve0Decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(fHeSwapReserve0Encrypted),
      fHeSwapAddress,
      owner // owner 可以解密储备量
    );
    console.log(`FHESwap reserve0 (解密): ${fHeSwapReserve0Decrypted}`);

    // 获取 FHESwap 的加密 reserve1
    const fHeSwapReserve1Encrypted = await fHeSwap.getEncryptedReserve1();
    
    // 解密 FHESwap 的 reserve1
    const fHeSwapReserve1Decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      ethersjs.hexlify(fHeSwapReserve1Encrypted),
      fHeSwapAddress,
      owner
    );
    console.log(`FHESwap reserve1 (解密): ${fHeSwapReserve1Decrypted}`);

    // 计算 FHESwap 期望的最终储备量
    // FHESwap 的 reserve0 = 初始储备量 + 交换进来的 TokenA 数量
    const expectedFHeSwapReserve0 = initialReserve + swapAmount;
   
    // FHESwap 的 reserve1 = 初始储备量 - 交换出去的 TokenB 数量
    const expectedFHeSwapReserve1 = initialReserve - expectedClearAmountOut;

    // 断言 FHESwap 的 reserve0 符合预期
    expect(fHeSwapReserve0Decrypted).to.equal(expectedFHeSwapReserve0);
   
    // 断言 FHESwap 的 reserve1 符合预期
    expect(fHeSwapReserve1Decrypted).to.equal(expectedFHeSwapReserve1);
    console.log("FHESwap 储备量验证通过。");
    console.log("--- 交换测试通过 ---\n");
  });
});