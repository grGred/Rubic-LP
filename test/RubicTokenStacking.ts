import { ethers, network } from 'hardhat';
import chai from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Web3 from 'web3';
import { expect } from 'chai';

const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe('RubicTokenStaking', function () {

   before(async function () {
      this.USDCToken = await ethers.getContractFactory("contracts/test/ERC20.sol:TestERC20");
      this.BRBCToken = await ethers.getContractFactory("contracts/test/ERC20.sol:TestERC20");
      this.StakingContract = await ethers.getContractFactory("contracts/Staking.sol:Staking");
   });

   beforeEach(async function () {
      this.USDC = await this.USDCToken.deploy(Web3.utils.toWei('100000000', 'ether'));
      this.BRBC = await this.BRBCToken.deploy(Web3.utils.toWei('100000000', 'ether'));
      this.Staking = await this.StakingContract.deploy(this.USDC.address, this.BRBC.address);
      this.signers = await ethers.getSigners();
      this.Alice = this.signers[1];
      this.Bob = this.signers[2];
      this.Carol = this.signers[3];
      // mint USDC
      await this.USDC.mint(this.Alice.address, Web3.utils.toWei('100000', 'ether'));
      await this.USDC.mint(this.Bob.address, Web3.utils.toWei('100000', 'ether'));
      await this.USDC.mint(this.Carol.address, Web3.utils.toWei('100000', 'ether'));
      // mint this.BRBC
      await this.BRBC.mint(this.Alice.address, Web3.utils.toWei('100000', 'ether'));
      await this.BRBC.mint(this.Bob.address, Web3.utils.toWei('100000', 'ether'));
      await this.BRBC.mint(this.Carol.address, Web3.utils.toWei('100000', 'ether'));
      // Approve
      await this.USDC.connect(this.Alice).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));
      await this.BRBC.connect(this.Alice).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));

      await this.USDC.connect(this.Bob).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));
      await this.BRBC.connect(this.Bob).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));

      await this.USDC.connect(this.Carol).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));
      await this.BRBC.connect(this.Carol).approve(this.Staking.address, Web3.utils.toWei('100000', 'ether'));

      await this.USDC.approve(this.Staking.address, Web3.utils.toWei('1000000000', 'ether'));
      await this.BRBC.approve(this.Staking.address, Web3.utils.toWei('1000000000', 'ether'));
   });

   describe('Stake tests', () => {
      it("Should create initial token", async function () {
         let initialToken = await this.Staking.tokensLP(0);

         expect(initialToken.tokenId.toString()).to.be.eq('0');
         expect(initialToken.USDCAmount.toString()).to.be.eq('0');
         expect(initialToken.BRBCAmount.toString()).to.be.eq('0');
         expect(initialToken.startTime).to.be.eq(0);
         expect(initialToken.deadline).to.be.eq(0);
         expect(initialToken.lastRewardGrowth.toString()).to.be.eq('0');
      });

      it("Should start LP", async function () {
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address, this.Bob.address]);
         await network.provider.send('evm_mine');

         await expect(this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('701', 'ether'))).to.be.revertedWith(
            'Whitelist staking period ended'
         );
         await expect(this.Staking.connect(this.Alice).stake(Web3.utils.toWei('702', 'ether'))).to.be.revertedWith(
            'Staking period has ended'
         );
         await expect(this.Staking.connect(this.Alice).startLP()).to.be.revertedWith(
            'Caller is not a manager'
         );
         await this.Staking.startLP();
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Carol).whitelistStake(Web3.utils.toWei('703', 'ether'));
         await network.provider.send('evm_mine');

         let firstToken = await this.Staking.tokensLP(1);
         await expect(firstToken.isWhitelisted.toString()).to.be.eq('true');
      });


      it("Should increase Pool USDC for whitelist", async function () {

         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address, this.Bob.address]);

         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Carol).whitelistStake(Web3.utils.toWei('800', 'ether'));

         await network.provider.send('evm_mine');
         let poolUSDC1 = await this.Staking.poolUSDC();
         await expect(poolUSDC1.toString()).to.be.eq(Web3.utils.toWei('800', 'ether'));

         await this.Staking.connect(this.Bob).whitelistStake(Web3.utils.toWei('800', 'ether'));
         await network.provider.send('evm_mine');

         let poolUSDC2 = await this.Staking.poolUSDC();
         await expect(poolUSDC2.toString()).to.be.eq(Web3.utils.toWei('1600', 'ether'));

         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('628', 'ether'));
         await network.provider.send('evm_mine');

         let poolUSDC3 = await this.Staking.poolUSDC();
         await expect(poolUSDC3.toString()).to.be.eq(Web3.utils.toWei('2228', 'ether'));

         await network.provider.send('evm_increaseTime', [
                Number(86400)
         ]);
         await network.provider.send('evm_mine');
      });

      it("Should increase Pool USDC for main stake", async function () {
         await this.Staking.startLP();
         await network.provider.send('evm_increaseTime', [
                Number(86400)
         ]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('800', 'ether'));

         await network.provider.send('evm_mine');
         let poolUSDC1 = await this.Staking.poolUSDC();
         await expect(poolUSDC1.toString()).to.be.eq(Web3.utils.toWei('800', 'ether'));

         await this.Staking.connect(this.Bob).stake(Web3.utils.toWei('800', 'ether'));
         await network.provider.send('evm_mine');

         let poolUSDC2 = await this.Staking.poolUSDC();
         await expect(poolUSDC2.toString()).to.be.eq(Web3.utils.toWei('1600', 'ether'));

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('628', 'ether'));
         await network.provider.send('evm_mine');

         let poolUSDC3 = await this.Staking.poolUSDC();
         await expect(poolUSDC3.toString()).to.be.eq(Web3.utils.toWei('2228', 'ether'));
      });

      it("Should increase Pool USDC whitelist + main stake", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address, this.Bob.address]);

         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Carol).whitelistStake(Web3.utils.toWei('800', 'ether'));
         await this.Staking.connect(this.Bob).whitelistStake(Web3.utils.toWei('800', 'ether'));

         await network.provider.send('evm_mine');

         await network.provider.send('evm_increaseTime', [
                Number(86400)
         ]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('1400', 'ether'));

         await network.provider.send('evm_mine');
         let poolUSDC1 = await this.Staking.poolUSDC();
         await expect(poolUSDC1.toString()).to.be.eq(Web3.utils.toWei('3000', 'ether'));

         await this.Staking.connect(this.Bob).stake(Web3.utils.toWei('2000', 'ether'));
         await network.provider.send('evm_mine');

         let poolUSDC2 = await this.Staking.poolUSDC();
         await expect(poolUSDC2.toString()).to.be.eq(Web3.utils.toWei('5000', 'ether'));
      });


      it("Should create whitelist stakes", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address]);
         await network.provider.send('evm_mine');

         await expect(this.Staking.connect(this.Carol).whitelistStake(
             Web3.utils.toWei('801', 'ether')
             )).to.be.revertedWith(
            'Max amount for stake exceeded'
         );

         await this.Staking.connect(this.Carol).whitelistStake(Web3.utils.toWei('800', 'ether'));
         let firstToken = await this.Staking.tokensLP(1);

         await expect(firstToken.tokenId.toString()).to.be.eq('1');
         await expect(firstToken.USDCAmount.toString()).to.be.eq(Web3.utils.toWei('800', 'ether').toString());
         await expect(firstToken.BRBCAmount.toString()).to.be.eq(Web3.utils.toWei('800', 'ether').toString());
         await expect(firstToken.isStaked.toString()).to.be.eq('true');
         await expect(firstToken.isWhitelisted.toString()).to.be.eq('true');
         await expect(await this.Staking.viewRewards('1')).to.be.eq('0');

         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;
         await expect(firstToken.startTime).to.be.eq(timestamp);
         await expect(firstToken.deadline).to.be.closeTo(timestamp + 5270400, 20); // + 61 days

         await network.provider.send('evm_mine');

         await expect(this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('499', 'ether'))).to.be.revertedWith(
            'Less than minimum stake amount'
         );

         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('500', 'ether'));

         let secondToken = await this.Staking.tokensLP(2);

         await expect(secondToken.tokenId.toString()).to.be.eq('2');
         await expect(secondToken.USDCAmount.toString()).to.be.eq(Web3.utils.toWei('500', 'ether').toString());
         await expect(secondToken.BRBCAmount.toString()).to.be.eq(Web3.utils.toWei('500', 'ether').toString());
         await expect(secondToken.isStaked.toString()).to.be.eq('true');
         await expect(secondToken.isWhitelisted.toString()).to.be.eq('true');
         await expect(await this.Staking.viewRewards('2')).to.be.eq('0');

         let blockNum1 = await ethers.provider.getBlockNumber();
         let block1 = await ethers.provider.getBlock(blockNum1);
         let timestamp1 = block1.timestamp;
         await expect(firstToken.startTime).to.be.closeTo(timestamp1,20);
         await expect(secondToken.deadline).to.be.closeTo(timestamp1 + 5270400, 20); // + 61 days

         await network.provider.send('evm_mine');
         let poolUSDCAfter = await this.Staking.poolUSDC();
         await expect(poolUSDCAfter.toString()).to.be.eq(
             Web3.utils.toWei('1300', 'ether').toString()
         );

         let balanceUSDC = await this.USDC.balanceOf(this.Alice.address);
         await expect(balanceUSDC.toString()).to.be.eq(
             Web3.utils.toWei('99500', 'ether').toString()
         );

         let balanceBRBC = await this.BRBC.balanceOf(this.Alice.address);
         await expect(balanceBRBC.toString()).to.be.eq(
             Web3.utils.toWei('99500', 'ether').toString()
         );
         await expect(this.Staking.connect(this.Bob).whitelistStake(Web3.utils.toWei('800', 'ether'))).to.be.revertedWith(
            'You are not in whitelist'
         );

         await network.provider.send("evm_increaseTime", [timestamp1 + 86400]);
         await this.Staking.setWhitelist([this.Bob.address]);
         await network.provider.send('evm_mine');
         await expect(this.Staking.connect(this.Bob).whitelistStake(Web3.utils.toWei('800', 'ether'))).to.be.revertedWith(
            'Whitelist staking period ended'
         );
      });

      it("Should create stakes", async function () {
         await this.Staking.startLP();
         await network.provider.send('evm_increaseTime', [
                Number(86400)
         ]);
         await network.provider.send('evm_mine');
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('3000', 'ether'));
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('1000', 'ether'));
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('500', 'ether'));
         await network.provider.send('evm_mine');

         expect(this.Staking.connect(this.Carol).stake(
             Web3.utils.toWei('550', 'ether'))).to.be.revertedWith(
            'Max amount for stake exceeded'
         );

         let tokensCarol = await this.Staking.viewTokensByOwner(this.Carol.address);

         await expect(tokensCarol.toString()).to.be.eq('1,2,3');

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('543', 'ether'));

         let AliceToken = await this.Staking.tokensLP(4);

         await expect(AliceToken.isStaked.toString()).to.be.eq('true');
         await expect(AliceToken.isWhitelisted.toString()).to.be.eq('false');

         await expect(
             this.Staking.connect(this.Bob).stake(Web3.utils.toWei('100', 'ether'))
         ).to.be.revertedWith(
            'Less than minimum stake amount'
         );

         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;
         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 5270400]);
         await network.provider.send('evm_mine');

         await expect(
             this.Staking.connect(this.Bob).stake(Web3.utils.toWei('100', 'ether'))
         ).to.be.revertedWith(
            'Staking period has ended'
         );
      });
   });

   describe('Transfer', () => {
      it("Should transfer whitelist lp token", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address]);

         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('655', 'ether'));

         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);

         expect(this.Staking.connect(this.Alice).transfer(this.Bob.address, 1)).to.be.revertedWith(
               "You need to be an owner"
         );
         let tokensBob = await this.Staking.viewTokensByOwner(this.Bob.address);
         await expect(tokensBob.toString()).to.be.eq('1');
         let tokensAlice = await this.Staking.viewTokensByOwner(this.Alice.address);
         await expect(tokensAlice.toString()).to.be.eq('');

         expect(this.Staking.connect(this.Alice).requestWithdraw(1)).to.be.revertedWith(
               "You need to be an owner"
         );

         await network.provider.send('evm_mine');
         // transfer back
         await this.Staking.connect(this.Bob).transfer(this.Alice.address, 1);
         let tokensAliceAfter = await this.Staking.viewTokensByOwner(this.Alice.address);
         await expect(tokensAliceAfter.toString()).to.be.eq('1');

         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);
         await this.Staking.connect(this.Bob).requestWithdraw(1);

         await network.provider.send('evm_mine');

         let BobToken1 = await this.Staking.tokensLP(1);

         await expect(BobToken1.isWhitelisted.toString()).to.be.eq('true');
         await expect(BobToken1.isStaked.toString()).to.be.eq('false');
      });

      it("Should transfer main lp token", async function () {
         await this.Staking.startLP();
         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;
         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 86400]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('655', 'ether'));

         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);

         expect(this.Staking.connect(this.Alice).transfer(this.Bob.address, 1)).to.be.revertedWith(
               "You need to be an owner"
         );
         let tokensBob = await this.Staking.viewTokensByOwner(this.Bob.address);
         await expect(tokensBob.toString()).to.be.eq('1');
         let tokensAlice = await this.Staking.viewTokensByOwner(this.Alice.address);
         await expect(tokensAlice.toString()).to.be.eq('');

         await network.provider.send('evm_mine');

         let BobToken1 = await this.Staking.tokensLP(1);

         await expect(BobToken1.isWhitelisted.toString()).to.be.eq('false');
         await expect(BobToken1.isStaked.toString()).to.be.eq('true');
      });

      it("Should transfer token after end of staking", async function () {
         await this.Staking.startLP();

         await this.Staking.setWhitelist([this.Alice.address]);
         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('500', 'ether'));

         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;

         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 86400]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('1000', 'ether'));
         // lp staking ended
         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 5270400]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);
         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 2);

         let tokensBob = await this.Staking.viewTokensByOwner(this.Bob.address);
         await expect(tokensBob.toString()).to.be.eq('1,2');
         let tokensAlice = await this.Staking.viewTokensByOwner(this.Alice.address);
         await expect(tokensAlice.toString()).to.be.eq('');

         let BobToken1 = await this.Staking.tokensLP(1);
         let BobToken2 = await this.Staking.tokensLP(2);

         await expect(BobToken1.isWhitelisted.toString()).to.be.eq('true');
         await expect(BobToken1.isStaked.toString()).to.be.eq('true');

         await expect(BobToken2.isWhitelisted.toString()).to.be.eq('false');
         await expect(BobToken2.isStaked.toString()).to.be.eq('true');
      });

      it("Shouldn't allow to transfer lp token", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address]);
         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('500', 'ether'));

         await network.provider.send('evm_mine');

         expect(this.Staking.connect(this.Alice).transfer(constants.ZERO_ADDRESS, 1)).to.be.revertedWith(
              "You can't transfer to yourself or to null address"
         );

         expect(this.Staking.connect(this.Alice).transfer(this.Alice.address, 1)).to.be.revertedWith(
             "You can't transfer to yourself or to null address"
         );
      });
   });

   describe('Rewards', () => {
      it("Should add rewards, view rewards for main and whitelist", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Alice.address]);
         await this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('500', 'ether'));

         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;

         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 86400]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('500', 'ether'));
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('2000', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('1052', 'ether'));

         await network.provider.send('evm_mine');
         expect(await this.Staking.viewRewards(1) / (10 ** 18)).to.be.eq(175.33333333333334);
         expect(await this.Staking.viewRewards(2) / (10 ** 18)).to.be.eq(175.33333333333334);
         expect(await this.Staking.viewRewards(3) / (10 ** 18)).to.be.eq(701.3333333333334);

         await this.Staking.connect(this.Bob).stake(Web3.utils.toWei('2500', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('948', 'ether')); // pool now 2000$

         expect(await this.Staking.viewRewards(1) / (10 ** 18)).to.be.eq(261.5151515151515);
         expect(await this.Staking.viewRewards(2) / (10 ** 18)).to.be.eq(261.5151515151515);
         expect(await this.Staking.viewRewards(3) / (10 ** 18)).to.be.eq(1046.060606060606);
         expect(await this.Staking.viewRewards(4) / (10 ** 18)).to.be.eq(430.90909090909093);

         expect(261.5151515151515 * 2 + 1046.060606060606 + 430.90909090909093).to.be.eq(2000);
      });

      it("Should claim Rewards", async function () {
         await this.Staking.startLP();

         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;

         await network.provider.send("evm_setNextBlockTimestamp", [timestamp + 86400]);
         await network.provider.send('evm_mine');

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('1000', 'ether'));
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('2000', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('526', 'ether'));

         await this.Staking.connect(this.Alice).claimRewards(1);
         let initialToken = await this.Staking.tokensLP(1);
         let rewardGrowth = await this.Staking.rewardGrowth();

         expect(initialToken.lastRewardGrowth.toString()).to.be.eq(rewardGrowth.toString());

         expect(this.Staking.connect(this.Alice).claimRewards(1)).to.be.revertedWith(
             'You have 0 rewards'
         );

         this.Staking.addRewards(Web3.utils.toWei('50', 'ether'));

         this.Staking.connect(this.Alice).transfer(this.Bob.address, 2);

         expect(this.Staking.connect(this.Alice).claimRewards(2)).to.be.revertedWith(
                "You need to be an owner"
         );

         expect(this.Staking.connect(this.Alice).claimRewards(0)).to.be.revertedWith(
                "You need to be an owner"
         );
         const balanceUSDCBobBefore = await this.USDC.balanceOf(this.Bob.address) / (10 ** 18);
         const bobRewards = await this.Staking.viewRewards(2) / (10 ** 18);

         await this.Staking.connect(this.Bob).claimRewards(2);

         const balanceUSDC = await this.USDC.balanceOf(this.Bob.address) / (10 ** 18);
         await expect(balanceUSDC).to.be.eq(
             Number(balanceUSDCBobBefore) + Number(bobRewards)
         );
      });
   });
});