# FHESwap Sepolia 测试网部署指南

本指南将帮助您将 FHESwap 合约部署到 Sepolia 测试网并进行测试。

## 🔧 前提条件

1. **Node.js** (版本 >= 20)
2. **npm** (版本 >= 7.0.0)
3. **Sepolia 测试网 ETH** (至少 0.1 ETH 用于部署和测试)
4. **Infura API Key** 或其他以太坊节点服务
5. **以太坊钱包助记词** (用于部署)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

需要设置以下环境变量：

#### 设置助记词 (MNEMONIC)
```bash
npx hardhat vars set MNEMONIC
# 输入您的12或24个单词的助记词
```

#### 设置 Infura API Key
```bash
npx hardhat vars set INFURA_API_KEY
# 输入您的 Infura API Key
```

#### 设置 Etherscan API Key (可选，用于合约验证)
```bash
npx hardhat vars set ETHERSCAN_API_KEY
# 输入您的 Etherscan API Key
```

### 3. 获取 Sepolia 测试网 ETH

- 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
- 或使用 [Chainlink Faucet](https://faucets.chain.link/)
- 确保您的部署账户有足够的 ETH

### 4. 编译合约

```bash
npm run compile
```

### 5. 部署到 Sepolia

#### 方法 1: 使用部署脚本 (推荐)
```bash
npm run deploy:sepolia:script
```

#### 方法 2: 直接使用 Hardhat
```bash
npm run deploy:sepolia
```

### 6. 运行测试

#### 运行 Sepolia 专用测试
```bash
npm run test:sepolia
```

#### 运行所有测试
```bash
npm run test:sepolia:all
```

## 📋 详细步骤

### 环境变量详解

1. **MNEMONIC**: 您的钱包助记词，用于生成部署账户
   - 示例: "word1 word2 word3 ... word12"
   - 安全性: 请确保这是测试网专用的助记词

2. **INFURA_API_KEY**: Infura 项目的 API Key
   - 注册地址: https://infura.io/
   - 创建项目并获取 API Key

3. **ETHERSCAN_API_KEY**: 用于合约验证 (可选)
   - 注册地址: https://etherscan.io/apis
   - 获取免费 API Key

### 部署过程说明

部署脚本会依次部署以下合约：

1. **TokenA** - ConfidentialFungibleTokenMintableBurnable
   - 名称: "TokenA"
   - 符号: "TKA"
   - 元数据: "https://example.com/metadataA"

2. **TokenB** - ConfidentialFungibleTokenMintableBurnable
   - 名称: "TokenB" 
   - 符号: "TKB"
   - 元数据: "https://example.com/metadataB"

3. **FHESwap** - 主要的交换合约
   - 连接 TokenA 和 TokenB
   - 设置部署者为所有者

### 测试流程说明

Sepolia 测试包含以下测试用例：

1. **合约连接测试**
   - 验证合约地址和所有者
   - 检查合约代码是否正确部署

2. **流动性添加测试**
   - 铸造初始代币
   - 授权操作员权限
   - 添加流动性到交换池
   - 验证储备量

3. **代币交换测试**
   - 为用户铸造代币
   - 计算交换输出
   - 执行交换操作
   - 验证余额变化

## 🔍 故障排除

### 常见问题

1. **部署失败 - 余额不足**
   ```
   Error: insufficient funds for gas * price + value
   ```
   解决方案: 获取更多 Sepolia ETH

2. **连接失败 - API Key 错误**
   ```
   Error: could not connect to the network
   ```
   解决方案: 检查 INFURA_API_KEY 是否正确

3. **测试失败 - 合约未部署**
   ```
   Error: deployment not found
   ```
   解决方案: 先运行部署命令

4. **Gas 估算失败**
   ```
   Error: cannot estimate gas
   ```
   解决方案: 检查合约代码和参数

### 调试命令

查看部署状态:
```bash
npx hardhat deployments --network sepolia
```

查看账户信息:
```bash
npx hardhat accounts --network sepolia
```

查看网络配置:
```bash
npx hardhat config --network sepolia
```

## 📊 Gas 使用估算

基于测试，大致的 Gas 使用量：

- TokenA 部署: ~3,000,000 gas
- TokenB 部署: ~3,000,000 gas  
- FHESwap 部署: ~4,000,000 gas
- 铸造操作: ~200,000 gas
- 添加流动性: ~300,000 gas
- 代币交换: ~400,000 gas

总计约需要 0.1-0.2 ETH 用于完整的部署和测试流程。

## 🎯 下一步

部署成功后，您可以：

1. 在 Etherscan 上查看合约
2. 与合约进行交互
3. 集成到前端应用
4. 进行更多的测试场景

## 📞 支持

如果遇到问题，请检查：

1. 网络连接
2. 环境变量设置
3. 账户余额
4. Hardhat 配置

更多信息请参考 [Hardhat 文档](https://hardhat.org/docs) 和 [FHEVM 文档](https://docs.zama.ai/fhevm)。