const hre = require("hardhat");

async function main() {
  const RubicTokenStaker = await hre.ethers.getContractFactory("contracts/Staking.sol:Staking");

  const RubicTokenStakerDeploy = await RubicTokenStaker.deploy();
  await RubicTokenStakerDeploy.deployed();

  console.log("RubicTokenStakerDeploy deployed to:", RubicTokenStakerDeploy.address);

  await new Promise(r => setTimeout(r, 10000));
  await RubicTokenStakerDeploy.setWhitelist(['0xcc513C5e4F396e68C15282cFa02D3E9c615cd714','0x186915891222aDD6E2108061A554a1F400a25cbD','0xfC2cD0F2CcfCb3221f092733842d6250D3effB3B']);

  await hre.run("verify:verify", {
    address: RubicTokenStakerDeploy.address,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
