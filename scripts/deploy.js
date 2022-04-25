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
      '0x105A3BA3637A29D36F61c7F03f55Da44B4591Cd1',
      '0x60a4dae96386e8c6D8535f2463a00b4A40fae6eF'
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
