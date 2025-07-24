import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfidentialToken = await deploy("ConfidentialFungibleTokenMintableBurnable", {
    from: deployer,
    args: [deployer, "ConfidentialToken", "CTK", "https://example.com/metadata"],
    log: true,
  });

  console.log(`ConfidentialFungibleTokenMintableBurnable contract: `, deployedConfidentialToken.address);
};
export default func;
func.id = "deploy_confidentialToken"; // id required to prevent reexecution
func.tags = ["ConfidentialFungibleTokenMintableBurnable"];
