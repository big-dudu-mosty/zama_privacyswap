// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";
import {
    IConfidentialFungibleToken
} from "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleToken.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ConfidentialFungibleTokenMintableBurnable is ConfidentialFungibleToken, Ownable, SepoliaConfig {
    using FHE for *;
    // 映射：用于存储请求ID与接收者地址的对应关系
    mapping(uint256 requestId => address) private _receivers;
    // fromToken：用户想要从中交换的机密代币合约实例
    IConfidentialFungibleToken private _fromToken;
    // toToken：用户想要交换到的ERC20代币合约实例（注意：此合约中实际未使用）
    IERC20 private _toToken;

    constructor(
        address owner,
        string memory name,
        string memory symbol,
        string memory uri
    ) ConfidentialFungibleToken(name, symbol, uri) Ownable(owner) {}

    function mint(address to, externalEuint64 amount, bytes memory inputProof) public onlyOwner {
        // 解密外部加密的amount，得到要铸造的实际数量
        euint64 minted = FHE.fromExternal(amount, inputProof);
        // 确保合约有权限操作这个铸造的加密值
        FHE.allowThis(minted);
        // 铸造指定数量的代币并发送给目标地址
        _mint(to, minted);
        // 允许目标地址对铸造的代币进行FHE操作
        FHE.allow(minted, to);
    }

    function burn(address from, externalEuint64 amount, bytes memory inputProof) public onlyOwner {
        // 解密外部加密的amount，得到要销毁的实际数量
        euint64 burned = FHE.fromExternal(amount, inputProof);
        // 确保合约有权限操作这个销毁的加密值
        FHE.allowThis(burned);
        // 销毁指定数量的代币
        _burn(from, burned);
        // 允许代币来源地址对销毁的代币进行FHE操作
        FHE.allow(burned, from);
    }

    function swapConfidentialForConfidential(
        IConfidentialFungibleToken fromToken,
        IConfidentialFungibleToken toToken,
        externalEuint64 amountInput,
        bytes calldata inputProof
    ) public virtual {
        // 要求调用者（msg.sender）已经将当前合约设置为fromToken的操作员，以允许合约代表用户操作代币
        require(fromToken.isOperator(msg.sender, address(this)));

        // 使用FHE库从外部加密的amountInput和inputProof中解密出真实的代币数量
        euint64 amount = FHE.fromExternal(amountInput, inputProof);

        // 允许加密的amount在fromToken合约中进行瞬时操作
        FHE.allowTransient(amount, address(fromToken));
        // 从调用者地址（msg.sender）机密地转移指定数量的fromToken到当前合约地址
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        // 允许已转移的加密数量amountTransferred在toToken合约中进行瞬时操作
        FHE.allowTransient(amountTransferred, address(toToken));
        // 将从fromToken接收到的机密数量amountTransferred机密地转移给调用者（msg.sender），作为toToken
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }

    /**
     * @notice 允许代币持有者授权本代币合约本身操作其加密余额。
     * @dev 这是解决 ACLNotAllowed 错误的关键，因为 FHEVM 要求明确的链上授权。
     * @param balanceHandle 要授权的加密余额句柄。
     */
    function authorizeSelf(euint64 balanceHandle) public {
        // 这里不需要额外的验证，因为只有 balanceHandle 的所有者才能成功调用此函数并授权。
        // FHE.allow 会在链上执行 ACL 检查，确保只有拥有者才能授予权限。
        FHE.allow(balanceHandle, address(this));
    }
}
