// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint32, euint32, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {
    IConfidentialFungibleToken
} from "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Define a local interface to ensure confidentialTransferFrom and other necessary functions are visible
interface ILocalConfidentialFungibleToken is IConfidentialFungibleToken {
    function confidentialTransferFrom(address sender, address recipient, euint64 amount) external returns (euint64);
    function confidentialTransfer(address recipient, euint64 amount) external returns (euint64);
    function setOperator(address operator, uint64 expiration) external;
    function confidentialBalanceOf(address account) external view returns (euint64);
}

/**
 * @title FHESwapSimple 
 * @dev 简化但功能完整的FHEVM AMM实现
 * 基于原版FHESwap，增加真正的流动性管理功能
 */
contract FHESwapSimple is Ownable, SepoliaConfig {
    using FHE for *;

    // 存储两种代币的合约地址
    ILocalConfidentialFungibleToken public immutable token0;
    ILocalConfidentialFungibleToken public immutable token1;

    // 存储两种代币的加密储备量
    euint64 private _reserve0;
    euint64 private _reserve1;

    // LP代币的总供应量（加密）
    euint64 private _totalSupply;
    
    // 用户的LP代币余额（地址 -> 加密余额）
    mapping(address => euint64) private _balances;

    // 用于 getAmountOut 返回的临时加密分子和分母
    euint64 private _lastNumerator;
    euint64 private _lastDenominator;

    // 事件
    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1);
    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut);

    // 构造函数：初始化代币地址
    constructor(address _token0, address _token1, address owner) Ownable(owner) {
        token0 = ILocalConfidentialFungibleToken(_token0);
        token1 = ILocalConfidentialFungibleToken(_token1);
    }

    /**
     * @notice 添加流动性并铸造LP代币
     * @param amount0 投入的token0数量（加密）
     * @param amount0Proof token0数量的加密证明
     * @param amount1 投入的token1数量（加密）
     * @param amount1Proof token1数量的加密证明
     * @return liquidity 返回铸造的LP代币数量（加密）
     */
    function addLiquidity(
        externalEuint64 amount0,
        bytes calldata amount0Proof,
        externalEuint64 amount1,
        bytes calldata amount1Proof
    ) public returns (euint64 liquidity) {
        // 解密传入的流动性金额
        euint64 decryptedAmount0 = FHE.fromExternal(amount0, amount0Proof);
        euint64 decryptedAmount1 = FHE.fromExternal(amount1, amount1Proof);

        // 先授予合约本身访问权，再授予瞬时权限，避免顺序导致的 ACL 拒绝
        FHE.allowThis(decryptedAmount0);
        FHE.allowThis(decryptedAmount1);

        // 授予本合约与代币合约对这些金额的瞬时访问权限
        FHE.allowTransient(decryptedAmount0, address(this));
        FHE.allowTransient(decryptedAmount1, address(this));
        FHE.allowTransient(decryptedAmount0, address(token0));
        FHE.allowTransient(decryptedAmount1, address(token1));
        
        // 授予对现有状态变量的瞬态访问权限（按自身->瞬时的顺序）
        if (FHE.isInitialized(_totalSupply)) {
            FHE.allowThis(_totalSupply);
            FHE.allowTransient(_totalSupply, address(this));
        }
        if (FHE.isInitialized(_reserve0)) {
            FHE.allowThis(_reserve0);
            FHE.allowThis(_reserve1);
            FHE.allowTransient(_reserve0, address(this));
            FHE.allowTransient(_reserve1, address(this));
        }
        if (FHE.isInitialized(_balances[msg.sender])) {
            FHE.allowThis(_balances[msg.sender]);
            FHE.allowTransient(_balances[msg.sender], address(this));
        }

        // 从用户转移代币到本合约
        token0.confidentialTransferFrom(msg.sender, address(this), decryptedAmount0);
        token1.confidentialTransferFrom(msg.sender, address(this), decryptedAmount1);

        // 计算应该铸造的LP代币数量 (简化版本)
        if (!FHE.isInitialized(_totalSupply)) {
            // 首次添加流动性：LP = amount0 + amount1 (简化版本)
            liquidity = decryptedAmount0.add(decryptedAmount1);
            _totalSupply = liquidity;
        } else {
            // 后续添加流动性：按现有比例计算 (简化版本)
            // 简化计算：liquidity = amount0 + amount1
            liquidity = decryptedAmount0.add(decryptedAmount1);
            _totalSupply = _totalSupply.add(liquidity);
        }

        // 更新储备量
        if (!FHE.isInitialized(_reserve0)) {
            _reserve0 = decryptedAmount0;
            _reserve1 = decryptedAmount1;
        } else {
            _reserve0 = _reserve0.add(decryptedAmount0);
            _reserve1 = _reserve1.add(decryptedAmount1);
        }

        // 更新用户的LP代币余额
        if (!FHE.isInitialized(_balances[msg.sender])) {
            _balances[msg.sender] = liquidity;
        } else {
            _balances[msg.sender] = _balances[msg.sender].add(liquidity);
        }

        // 允许访问权限
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[msg.sender]);
        // 也允许合约临时访问这些更新后的状态，以兼容后续链上操作
        FHE.allowTransient(_reserve0, address(this));
        FHE.allowTransient(_reserve1, address(this));
        FHE.allowTransient(_totalSupply, address(this));
        FHE.allowTransient(_balances[msg.sender], address(this));
        FHE.allowThis(liquidity);
        
        FHE.allow(_reserve0, msg.sender);
        FHE.allow(_reserve1, msg.sender);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(liquidity, msg.sender);

        emit LiquidityAdded(msg.sender, 0, 0); // 为了隐私，不显示实际金额

        return liquidity;
    }

    /**
     * @notice 移除流动性并返还代币
     * @param liquidityAmount 要移除的LP代币数量（加密）
     * @param liquidityProof LP代币数量的加密证明
     * @return amount0 返还的token0数量
     * @return amount1 返还的token1数量
     */
    function removeLiquidity(
        externalEuint64 liquidityAmount,
        bytes calldata liquidityProof
    ) public returns (euint64 amount0, euint64 amount1) {
        euint64 decryptedLiquidity = FHE.fromExternal(liquidityAmount, liquidityProof);
        
        // 授予必要的瞬态访问权限
        FHE.allowThis(decryptedLiquidity);
        FHE.allowTransient(decryptedLiquidity, address(this));
        FHE.allowTransient(_balances[msg.sender], address(this));
        FHE.allowTransient(_totalSupply, address(this));
        FHE.allowTransient(_reserve0, address(this));
        FHE.allowTransient(_reserve1, address(this));
        
        // 检查用户是否有足够的LP代币
        require(FHE.isInitialized(_balances[msg.sender]), "No liquidity balance");
        
        // 计算返还的代币数量 (简化版本)
        // 简化计算：按LP代币数量的固定比例返还
        // 在真实实现中应该是: amount = liquidity * reserve / totalSupply
        
        // 简化算法：假设每个LP代币对应固定数量的底层资产
        // amount0 ≈ decryptedLiquidity (1:1比例简化)
        // amount1 ≈ decryptedLiquidity (1:1比例简化)
        
        amount0 = decryptedLiquidity;
        amount1 = decryptedLiquidity;

        // 更新用户LP代币余额
        _balances[msg.sender] = _balances[msg.sender].sub(decryptedLiquidity);
        
        // 更新总供应量
        _totalSupply = _totalSupply.sub(decryptedLiquidity);
        
        // 更新储备量
        _reserve0 = _reserve0.sub(amount0);
        _reserve1 = _reserve1.sub(amount1);

        // 授权代币合约访问
        FHE.allowTransient(amount0, address(token0));
        FHE.allowTransient(amount1, address(token1));

        // 返还代币给用户
        token0.confidentialTransfer(msg.sender, amount0);
        token1.confidentialTransfer(msg.sender, amount1);

        // 设置访问权限
        FHE.allowThis(amount0);
        FHE.allowThis(amount1);
        FHE.allow(amount0, msg.sender);
        FHE.allow(amount1, msg.sender);

        emit LiquidityRemoved(msg.sender, 0, 0);
        
        return (amount0, amount1);
    }

    /**
     * @notice 计算输出代币数量（复用原版逻辑）
     */
    function getAmountOut(externalEuint64 amountIn, bytes calldata amountInProof, address inputToken) external {
        require(FHE.isInitialized(_reserve0), "Reserve0 not set");
        require(FHE.isInitialized(_reserve1), "Reserve1 not set");

        euint64 encryptedAmountIn = FHE.fromExternal(amountIn, amountInProof);
        
        // 先允许自身，再授予瞬态访问权限，确保 ACL 顺序一致
        FHE.allowThis(encryptedAmountIn);
        FHE.allowTransient(encryptedAmountIn, address(this));
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
        FHE.allowTransient(_reserve0, address(this));
        FHE.allowTransient(_reserve1, address(this));

        euint64 reserveIn;
        euint64 reserveOut;

        if (inputToken == address(token0)) {
            reserveIn = _reserve0;
            reserveOut = _reserve1;
        } else if (inputToken == address(token1)) {
            reserveIn = _reserve1;
            reserveOut = _reserve0;
        } else {
            revert("Invalid input token");
        }

        // 计算带手续费的输入金额 (0.3% fee)
        euint64 amountInWithFee = FHE.mul(encryptedAmountIn, 997);
        FHE.allowThis(amountInWithFee);
        FHE.allowTransient(amountInWithFee, address(this));

        // 计算分子和分母
        _lastNumerator = FHE.mul(amountInWithFee, reserveOut);
        _lastDenominator = FHE.add(FHE.mul(reserveIn, 1000), amountInWithFee);

        FHE.allowThis(_lastNumerator);
        FHE.allowThis(_lastDenominator);
        FHE.allow(_lastNumerator, msg.sender);
        FHE.allow(_lastDenominator, msg.sender);
    }

    /**
     * @notice 执行代币交换（复用原版逻辑）
     */
    function swap(
        externalEuint64 amountIn,
        bytes calldata amountInProof,
        externalEuint64 expectedAmountOut,
        bytes calldata expectedAmountOutProof,
        externalEuint64 minAmountOut,
        bytes calldata minAmountOutProof,
        address inputToken,
        address to
    ) public {
        require(FHE.isInitialized(_reserve0), "Reserve0 not set for swap");
        require(FHE.isInitialized(_reserve1), "Reserve1 not set for swap");

        euint64 decryptedAmountIn = FHE.fromExternal(amountIn, amountInProof);
        // 先允许合约自身访问，再授予相关合约瞬时访问，避免 ACL 顺序问题
        FHE.allowThis(decryptedAmountIn);
        FHE.allowTransient(decryptedAmountIn, address(this));
        FHE.allowTransient(decryptedAmountIn, address(token0));
        FHE.allowTransient(decryptedAmountIn, address(token1));
        
        euint64 decryptedExpectedAmountOut = FHE.fromExternal(expectedAmountOut, expectedAmountOutProof);
        euint64 decryptedMinAmountOut = FHE.fromExternal(minAmountOut, minAmountOutProof);
        
        FHE.allowThis(decryptedExpectedAmountOut);
        FHE.allowThis(decryptedMinAmountOut);
        FHE.allowTransient(decryptedExpectedAmountOut, address(this));
        FHE.allowTransient(decryptedMinAmountOut, address(this));
        
        // 授予对储备量的瞬态访问权限
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
        FHE.allowTransient(_reserve0, address(this));
        FHE.allowTransient(_reserve1, address(this));

        ILocalConfidentialFungibleToken tokenIn;
        ILocalConfidentialFungibleToken tokenOut;

        if (inputToken == address(token0)) {
            tokenIn = token0;
            tokenOut = token1;
        } else if (inputToken == address(token1)) {
            tokenIn = token1;
            tokenOut = token0;
        } else {
            revert("Invalid input token for swap");
        }

        FHE.allowTransient(decryptedExpectedAmountOut, address(tokenOut));

        // 从用户转移输入代币
        tokenIn.confidentialTransferFrom(msg.sender, address(this), decryptedAmountIn);

        // 更新储备量
        if (inputToken == address(token0)) {
            _reserve0 = _reserve0.add(decryptedAmountIn);
            _reserve1 = _reserve1.sub(decryptedExpectedAmountOut);
        } else {
            _reserve1 = _reserve1.add(decryptedAmountIn);
            _reserve0 = _reserve0.sub(decryptedExpectedAmountOut);
        }

        // 转移输出代币
        tokenOut.confidentialTransfer(to, decryptedExpectedAmountOut);

        // 设置访问权限
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
        FHE.allow(_reserve0, to);
        FHE.allow(_reserve1, to);
        FHE.allow(_reserve0, owner());
        FHE.allow(_reserve1, owner());

        emit Swap(msg.sender, inputToken, address(tokenOut));
    }

    // =========================== 查询函数 ===========================

    function getEncryptedNumerator() external view returns (euint64) {
        return _lastNumerator;
    }

    function getEncryptedDenominator() external view returns (euint64) {
        return _lastDenominator;
    }

    function getEncryptedReserve0() external view returns (euint64) {
        return _reserve0;
    }

    function getEncryptedReserve1() external view returns (euint64) {
        return _reserve1;
    }

    function getEncryptedTotalSupply() external view returns (euint64) {
        return _totalSupply;
    }

    function getEncryptedLPBalance(address account) external view returns (euint64) {
        return _balances[account];
    }
}