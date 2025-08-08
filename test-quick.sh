#!/bin/bash

# FHESwapSimple 快速测试脚本
# 使用方法: ./test-quick.sh [test-type]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo
    echo "================================"
    print_message $BOLD "$1"
    echo "================================"
}

# 检查依赖
check_prerequisites() {
    print_header "🔍 环境检查"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_message $RED "❌ Node.js 未安装"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_message $RED "❌ npm 未安装"
        exit 1
    fi
    
    # 检查Hardhat
    if ! npx hardhat --version &> /dev/null; then
        print_message $RED "❌ Hardhat 未安装或配置错误"
        exit 1
    fi
    
    print_message $GREEN "✅ 环境检查通过"
}

# 显示帮助
show_help() {
    print_header "📋 FHESwapSimple 快速测试"
    
    echo "使用方法:"
    echo "  ./test-quick.sh [test-type]"
    echo
    echo "测试类型:"
    echo "  optimized    - 🌟 优化测试套件 (推荐)"
    echo "  quick        - 🚀 本地快速测试"
    echo "  step         - 📋 分步骤测试"
    echo "  full         - 📚 完整测试套件"
    echo
    echo "选项:"
    echo "  --help, -h   - 显示此帮助信息"
    echo
    echo "示例:"
    echo "  ./test-quick.sh optimized"
    echo "  ./test-quick.sh quick"
}

# 运行测试
run_test() {
    local test_type=$1
    
    case $test_type in
        "optimized")
            print_header "🌟 运行优化测试套件"
            print_message $BLUE "文件: test/FHESwapSimple.sepolia.optimized.ts"
            print_message $BLUE "网络: sepolia"
            print_message $YELLOW "⚠️  请确保账户有足够的ETH余额"
            echo
            npx hardhat test test/FHESwapSimple.sepolia.optimized.ts --network sepolia
            ;;
        "quick")
            print_header "🚀 运行快速测试"
            print_message $BLUE "文件: test/FHESwapSimple.test.ts"
            print_message $BLUE "网络: localfhevm"
            echo
            npx hardhat test test/FHESwapSimple.test.ts
            ;;
        "step")
            print_header "📋 运行分步测试"
            print_message $BLUE "文件: test/FHESwapSimple.sepolia.step.ts"
            print_message $BLUE "网络: sepolia"
            print_message $YELLOW "⚠️  请确保账户有足够的ETH余额"
            echo
            npx hardhat test test/FHESwapSimple.sepolia.step.ts --network sepolia
            ;;
        "full")
            print_header "📚 运行完整测试"
            print_message $BLUE "文件: test/FHESwapSimple.sepolia.ts"
            print_message $BLUE "网络: sepolia"
            print_message $YELLOW "⚠️  请确保账户有足够的ETH余额"
            echo
            npx hardhat test test/FHESwapSimple.sepolia.ts --network sepolia
            ;;
        *)
            print_message $RED "❌ 未知的测试类型: $test_type"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 主程序
main() {
    # 检查参数
    if [[ $# -eq 0 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    local test_type=$1
    
    # 检查环境
    check_prerequisites
    
    # 显示开始信息
    print_header "🚀 开始测试"
    print_message $BLUE "测试类型: $test_type"
    print_message $BLUE "开始时间: $(date)"
    
    # 记录开始时间
    local start_time=$(date +%s)
    
    # 运行测试
    if run_test $test_type; then
        # 计算耗时
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        print_header "🎉 测试完成"
        print_message $GREEN "✅ 测试成功"
        print_message $BLUE "总耗时: ${duration}秒"
        print_message $BLUE "结束时间: $(date)"
    else
        # 计算耗时
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        print_header "💥 测试失败"
        print_message $RED "❌ 测试失败"
        print_message $BLUE "耗时: ${duration}秒"
        print_message $YELLOW "建议:"
        echo "  1. 检查网络连接"
        echo "  2. 确认账户余额充足"
        echo "  3. 验证合约已正确部署"
        echo "  4. 查看详细错误信息"
        exit 1
    fi
}

# 捕获中断信号
trap 'print_message $YELLOW "\n⚠️  测试被中断"; exit 130' INT

# 运行主程序
main "$@"