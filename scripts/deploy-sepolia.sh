#!/bin/bash

# FHESwap Sepolia 部署脚本
echo "🚀 开始部署 FHESwap 到 Sepolia 测试网..."

# 检查环境变量
if [ -z "$MNEMONIC" ]; then
    echo "❌ 错误: MNEMONIC 环境变量未设置"
    echo "请运行: npx hardhat vars set MNEMONIC"
    exit 1
fi

if [ -z "$INFURA_API_KEY" ]; then
    echo "❌ 错误: INFURA_API_KEY 环境变量未设置"
    echo "请运行: npx hardhat vars set INFURA_API_KEY"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 编译合约
echo "📦 编译合约..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ 合约编译失败"
    exit 1
fi

echo "✅ 合约编译成功"

# 部署到 Sepolia
echo "🌐 部署到 Sepolia 测试网..."
npx hardhat deploy --network sepolia

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo "✅ 部署成功！"

# 显示部署信息
echo "📋 部署信息:"
echo "网络: Sepolia"
echo "部署文件位置: ./deployments/sepolia/"

echo ""
echo "🎉 部署完成！现在可以运行测试："
echo "npm run test:sepolia"
echo ""
echo "或者运行特定的 Sepolia 测试："
echo "npx hardhat test test/FHESwap.sepolia.ts --network sepolia"