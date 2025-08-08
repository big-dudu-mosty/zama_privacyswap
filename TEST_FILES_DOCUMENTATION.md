# FHESwap 测试文件文档

## 概述
本项目包含多个测试文件，用于测试基于FHEVM的机密代币交换合约。每个测试文件针对不同的测试环境和功能进行设计。

运行命令：
npm run compile
npm run deploy:sepolia
HARDHAT_MAX_WORKERS=$(nproc) npx hardhat test --bail --no-compile test/FHESwapSimple.sepolia.step.ts --network sepolia

强制重新部署:
npx hardhat deploy --network sepolia --reset  


## 测试文件详细说明

### 1. `FHESwapSimple.test.ts` - 本地简化版测试
**用途**: 本地Hardhat环境下的基础功能测试
**特点**:
- 在本地网络运行，不依赖外部服务
- 测试 `FHESwapSimple` 合约的核心功能
- 包含完整的流动性管理测试流程
- 适合快速验证合约逻辑

**测试内容**:
- ✅ 合约部署验证
- ✅ 添加流动性并获得LP代币
- ✅ 代币交换功能
- ✅ 移除流动性功能
- ✅ 余额验证和解密

**运行命令**:
```bash
npx hardhat test test/FHESwapSimple.test.ts
```

### 2. `FHESwapSimple.sepolia.ts` - Sepolia详细测试
**用途**: Sepolia测试网上的完整功能测试
**特点**:
- 在真实的Sepolia测试网上运行
- 使用已部署的合约进行测试
- 包含详细的日志输出和错误处理
- 测试真实的网络交互

**测试内容**:
- ✅ 合约连接和基本信息验证
- ✅ Alice添加流动性测试
- ✅ Bob添加流动性测试
- ✅ Alice代币交换测试
- ✅ Alice移除流动性测试
- ✅ 详细的交易信息和余额变化

**运行命令**:
```bash
npx hardhat test test/FHESwapSimple.sepolia.ts --network sepolia
```

### 3. `FHESwapSimple.sepolia.step.ts` - Sepolia分步测试
**用途**: Sepolia测试网上的分步骤详细测试
**特点**:
- 将测试分解为独立的步骤
- 每个步骤都有详细的日志输出
- 便于调试和问题定位
- 包含详细的交换信息（滑点、实际获得代币等）

**测试步骤**:
1. **步骤1**: 验证合约基本信息
2. **步骤2**: Bob添加流动性
3. **步骤3**: Alice执行代币交换（包含详细交换信息）
4. **步骤4**: Bob移除部分流动性

**详细交换信息输出**:
- 💸 实际支付TokenA数量
- 💰 实际获得TokenB数量
- 📉 滑点计算
- 📊 滑点百分比
- 💎 剩余代币余额

**运行命令**:
```bash
npx hardhat test test/FHESwapSimple.sepolia.step.ts --network sepolia
```

### 4. `FHESwap.sepolia.ts` - 原始FHESwap Sepolia测试
**用途**: 测试原始 `FHESwap` 合约在Sepolia上的功能
**特点**:
- 测试简化版的 `FHESwap` 合约
- 不包含LP代币功能
- 专注于基本的代币交换功能
- 包含错误处理和重试机制

**测试内容**:
- ✅ 合约连接验证
- ✅ 代币铸造和授权
- ✅ 基本交换功能
- ✅ 余额验证

**运行命令**:
```bash
npx hardhat test test/FHESwap.sepolia.ts --network sepolia
```

### 5. `FHESwap.quick.ts` - 快速测试版本
**用途**: 优化的快速测试，减少超时问题
**特点**:
- 简化的测试逻辑
- 减少FHE操作复杂度
- 增加超时时间到20分钟
- 跳过协处理器检查以节省时间

**测试内容**:
- ✅ 合约验证
- ✅ 简化流动性测试
- ✅ 基本交换功能

**运行命令**:
```bash
npx hardhat test test/FHESwap.quick.ts --network sepolia
```

### 6. `ConfidentialFungibleTokenMintableBurnable.ts` - 代币合约测试
**用途**: 测试机密代币合约的基本功能
**特点**:
- 测试代币合约的部署和基本功能
- 验证FHE加密代币的铸造和销毁
- 测试代币交换功能

**测试内容**:
- ✅ 合约部署和所有者设置
- ✅ 代币名称和符号验证
- ✅ 初始余额验证
- ✅ 机密代币铸造和解密
- ✅ TokenA和TokenB之间的交换

**运行命令**:
```bash
npx hardhat test test/ConfidentialFungibleTokenMintableBurnable.ts
```

### 7. `FHESwap.ts` - 原始FHESwap本地测试（已注释）
**用途**: 原始 `FHESwap` 合约的本地测试（当前已注释）
**特点**:
- 完整的本地测试套件
- 包含所有功能的测试
- 当前被注释掉，可能用于参考

## 测试环境对比

| 测试文件 | 环境 | 网络 | 主要功能 | 复杂度 |
|---------|------|------|----------|--------|
| `FHESwapSimple.test.ts` | 本地 | Hardhat | 完整功能测试 | 中等 |
| `FHESwapSimple.sepolia.ts` | 远程 | Sepolia | 完整功能测试 | 高 |
| `FHESwapSimple.sepolia.step.ts` | 远程 | Sepolia | 分步详细测试 | 高 |
| `FHESwap.sepolia.ts` | 远程 | Sepolia | 基础交换测试 | 中等 |
| `FHESwap.quick.ts` | 远程 | Sepolia | 快速测试 | 低 |
| `ConfidentialFungibleTokenMintableBurnable.ts` | 本地 | Hardhat | 代币功能测试 | 低 |
| `FHESwap.ts` | 本地 | Hardhat | 原始合约测试 | 高（已注释） |

## 常见问题解决

### 1. Relayer服务器错误
**错误**: `Error: Relayer didn't response correctly. Bad status 520`
**解决方案**:
- 等待一段时间后重试
- 使用本地测试验证功能
- 检查网络连接

### 2. 超时问题
**解决方案**:
- 使用 `FHESwap.quick.ts` 进行快速测试
- 增加超时时间设置
- 简化测试逻辑

### 3. 余额不足
**解决方案**:
- 运行 `scripts/fund-accounts.js` 为测试账户充值
- 检查账户ETH余额

## 推荐测试流程

1. **本地验证**: 先运行 `FHESwapSimple.test.ts` 验证基本功能
2. **快速测试**: 使用 `FHESwap.quick.ts` 在Sepolia上进行快速验证
3. **详细测试**: 使用 `FHESwapSimple.sepolia.step.ts` 进行完整测试
4. **问题调试**: 根据具体问题选择相应的测试文件

## 测试输出说明

### 详细日志包含：
- 🔗 交易哈希
- ⛽ Gas使用量
- 🧾 区块号
- 💰 代币余额变化
- 📊 滑点计算
- 💎 剩余余额

### 错误处理：
- 网络连接问题
- Relayer服务器问题
- 余额不足问题
- 协处理器初始化问题 