import { ConfidentialFungibleTokenMintableBurnable, ConfidentialFungibleTokenMintableBurnable__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import hre from "hardhat";
import { ethers as ethersjs } from "ethers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture(deployerAddress: string) {
  const factory = (await ethers.getContractFactory("ConfidentialFungibleTokenMintableBurnable")) as ConfidentialFungibleTokenMintableBurnable__factory;
  const contract = (await factory.deploy(
    deployerAddress, // owner address
    "ConfidentialToken",
    "CTK",
    "https://example.com/metadata"
  )) as ConfidentialFungibleTokenMintableBurnable;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("ConfidentialFungibleTokenMintableBurnable", function () {
  let signers: Signers;
  let contract: ConfidentialFungibleTokenMintableBurnable;
  let contractAddress: string;

  before(async function () {
    await fhevm.initializeCLIApi();
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    ({ contract, contractAddress } = await deployFixture(await signers.deployer.getAddress()));
    // Full node 本地模式下，确保 FHEVM 预编译初始化
    await hre.fhevm.assertCoprocessorInitialized(contract, "ConfidentialFungibleTokenMintableBurnable");
  });

  // 测试合约能否成功部署并设置正确的 owner
  it("should deploy successfully and set correct owner", async function () {
    const owner = await contract.owner();
    expect(owner).to.equal(await signers.deployer.getAddress());
  });

  // 测试合约的 name 和 symbol 是否正确
  it("should have correct name and symbol", async function () {
    const name = await contract.name();
    expect(name).to.equal("ConfidentialToken");
    const symbol = await contract.symbol();
    expect(symbol).to.equal("CTK");
  });

  // 测试 deployer 初始余额为 0（密文）
  it("should have zero initial balance", async function () {
    const initialBalance = await contract.confidentialBalanceOf(signers.deployer.address);
    const initialBalanceHex = ethersjs.hexlify(initialBalance);
    expect(initialBalanceHex).to.equal(ethers.ZeroHash);
  });
   
  //owner有销毁和铸币权限
  //alice进行swap


  // 测试 owner 能加密输入并 mint 给 Alice，Alice 能解密余额
  it("should allow minting of confidential tokens by owner and allow user to decrypt", async function () {
    const clearAmount = 1000;
    const owner = signers.deployer;
    const user = signers.alice;
    // 用 owner（deployer）生成 proof
    const encryptedAmount = await fhevm.createEncryptedInput(contractAddress, owner.address).add32(clearAmount).encrypt();
    // 由 owner 调用 mint，授权给 user
    const tx = await contract
      .connect(owner)
      .mint(user.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();
    // user 查询并解密余额
    const encryptedBalance = await contract.confidentialBalanceOf(user.address);
    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint32, ethersjs.hexlify(encryptedBalance), contractAddress, user);
    expect(clearBalance).to.equal(clearAmount);
  });

  console.log("===================start swap TokenA for TokenB")
  // 测试 Alice 能用 swapConfidentialForConfidential 方法将 TokenA 兑换为 TokenB
  it("should swap TokenA for TokenB using swapConfidentialForConfidential", async function () {
    const owner = signers.deployer;
    const alice = signers.alice;
    const mintAmount = 1000;
    const swapAmount = 300;
    console.log("===========Alice address:",alice.address);
    console.log("===========Owner address:",owner.address);
    // 1. 部署 TokenA 和 TokenB
    const factory = (await ethers.getContractFactory("ConfidentialFungibleTokenMintableBurnable")) as ConfidentialFungibleTokenMintableBurnable__factory;
    const tokenA = (await factory.deploy(owner.address, "TokenA", "TKA", "https://example.com/metadataA")) as ConfidentialFungibleTokenMintableBurnable;
    const tokenB = (await factory.deploy(owner.address, "TokenB", "TKB", "https://example.com/metadataB")) as ConfidentialFungibleTokenMintableBurnable;
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    await hre.fhevm.assertCoprocessorInitialized(tokenA, "ConfidentialFungibleTokenMintableBurnable");
    await hre.fhevm.assertCoprocessorInitialized(tokenB, "ConfidentialFungibleTokenMintableBurnable");
    console.log("[SWAP] TokenA address:", tokenAAddress);
    console.log("[SWAP] TokenB address:", tokenBAddress);

    // 2. owner 分别 mint 给 Alice 各 1000
    const encryptedMintA = await fhevm.createEncryptedInput(tokenAAddress, owner.address).add64(mintAmount).encrypt();
    await tokenA.connect(owner).mint(alice.address, encryptedMintA.handles[0], encryptedMintA.inputProof);
    const handleHex1 = ethersjs.hexlify(encryptedMintA.handles[0]);
    const proofHex1 = ethersjs.hexlify(encryptedMintA.inputProof);
    console.log("Mint 给 Alice1000TokenA 的 handleHex:", handleHex1);
    console.log("Mint 给 Alice1000TokenA 的 proofHex:", proofHex1);

    const encryptedMintB = await fhevm.createEncryptedInput(tokenBAddress, owner.address).add64(mintAmount).encrypt();
    await tokenB.connect(owner).mint(alice.address, encryptedMintB.handles[0], encryptedMintB.inputProof);
    const handleHex2 = ethersjs.hexlify(encryptedMintB.handles[0]);
    const proofHex2 = ethersjs.hexlify(encryptedMintB.inputProof);
    console.log("Mint 给 Alice1000TokenB 的 handleHex:", handleHex2);
    console.log("Mint 给 Alice1000TokenB 的 proofHex:", proofHex2);

    // 3. owner 给 TokenA 合约地址 mint 足够的 TokenB（用于 swap）
    const encryptedMintBForContract = await fhevm.createEncryptedInput(tokenBAddress, owner.address).add64(swapAmount).encrypt();
    await tokenB.connect(owner).mint(tokenAAddress, encryptedMintBForContract.handles[0], encryptedMintBForContract.inputProof);
    console.log("===========mint 给TokenA 合约地址 300 TokenB",encryptedMintBForContract.handles[0], encryptedMintBForContract.inputProof)
    const handleHex3 = ethersjs.hexlify(encryptedMintBForContract.handles[0]);
    const proofHex3 = ethersjs.hexlify(encryptedMintBForContract.inputProof);
    console.log("Mint 给TokenA合约地址 300TokenB 的 handleHex:", handleHex3);
    console.log("Mint 给TokenA合约地址 300TokenB 的 proofHex:", proofHex3);

    // 4. Alice 授权 TokenA 为 operator
    const operatorExpiry = Math.floor(Date.now() / 1000) + 3600;
    await tokenA.connect(alice).setOperator(tokenAAddress, operatorExpiry);
    console.log("===========Alice setOperator TokenA 为 operator",operatorExpiry)
    // 5. Alice swap TokenA -> TokenB
    const encryptedSwap = await fhevm.createEncryptedInput(tokenAAddress, alice.address).add64(swapAmount).encrypt();
    await tokenA.connect(alice).swapConfidentialForConfidential(
      tokenAAddress,
      tokenBAddress,
      encryptedSwap.handles[0],
      encryptedSwap.inputProof
    );
    console.log("=========== Alice swap TokenA -> TokenB",encryptedSwap.handles[0], encryptedSwap.inputProof)
    // 6. 检查余额并打印
    const encryptedBalanceA = await tokenA.confidentialBalanceOf(alice.address);
    console.log("=========== Alice TokenA balance:", encryptedBalanceA)
    const clearBalanceA = await fhevm.userDecryptEuint(FhevmType.euint32, ethersjs.hexlify(encryptedBalanceA), tokenAAddress, alice);
    console.log("=========== Alice TokenA clearBalanceA:", clearBalanceA)
    const encryptedBalanceB = await tokenB.confidentialBalanceOf(alice.address);

    console.log("=========== Alice TokenB encryptedBalanceB:", encryptedBalanceB)
    const clearBalanceB = await fhevm.userDecryptEuint(FhevmType.euint32, ethersjs.hexlify(encryptedBalanceB), tokenBAddress, alice);
    console.log("=========== Alice TokenB clearBalanceB:", clearBalanceB)
    expect(clearBalanceA).to.equal(mintAmount - swapAmount);
    expect(clearBalanceB).to.equal(mintAmount + swapAmount);
  });
});