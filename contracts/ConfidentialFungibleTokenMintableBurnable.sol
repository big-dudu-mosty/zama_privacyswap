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
    mapping(uint256 requestId => address) private _receivers;
    IConfidentialFungibleToken private _fromToken;
    IERC20 private _toToken;

    constructor(
        address owner,
        string memory name,
        string memory symbol,
        string memory uri
    ) ConfidentialFungibleToken(name, symbol, uri) Ownable(owner) {}

    function mint(address to, externalEuint64 amount, bytes memory inputProof) public onlyOwner {
        euint64 minted = FHE.fromExternal(amount, inputProof);
        _mint(to, minted);
        FHE.allowThis(minted);
        FHE.allow(minted, to);
    }

    function burn(address from, externalEuint64 amount, bytes memory inputProof) public onlyOwner {
        euint64 burned = FHE.fromExternal(amount, inputProof);
        _burn(from, burned);
        FHE.allowThis(burned);
        FHE.allow(burned, from);
    }

    function swapConfidentialForConfidential(
        IConfidentialFungibleToken fromToken,
        IConfidentialFungibleToken toToken,
        externalEuint64 amountInput,
        bytes calldata inputProof
    ) public virtual {
        require(fromToken.isOperator(msg.sender, address(this)));

        euint64 amount = FHE.fromExternal(amountInput, inputProof);

        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);
    }
}
