const hre = require("hardhat");

async function main() {
  const RubicTokenStaker = await hre.ethers.getContractFactory("contracts/Staking.sol:Staking");

  const RubicTokenStakerDeploy = await RubicTokenStaker.deploy(
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      '0x8E3BCC334657560253B83f08331d85267316e08a'
  );

  await RubicTokenStakerDeploy.deployed();

  console.log("RubicTokenStakerDeploy deployed to:", RubicTokenStakerDeploy.address);

  await new Promise(r => setTimeout(r, 10000));
  await RubicTokenStakerDeploy.setWhitelist([
      '0x8796e04d35bA0251Fa71d9bC89937bED766970E3',
      '0xfC2cD0F2CcfCb3221f092733842d6250D3effB3B',
      '0xcc513C5e4F396e68C15282cFa02D3E9c615cd714'
  ]);

  await hre.run("verify:verify", {
    address: RubicTokenStakerDeploy.address,
    constructorArguments: [
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      '0x8E3BCC334657560253B83f08331d85267316e08a'
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
