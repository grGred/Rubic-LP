import { ethers, network } from 'hardhat';
import chai from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Web3 from 'web3';
import chaiAsPromised from 'chai-as-promised';
import {address} from "hardhat/internal/core/config/config-validation";
chai.use(chaiAsPromised);
const expect = chai.expect;

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
      it("Initial token", async function () {
         let initialToken = await this.Staking.tokensLP(0);

         expect(initialToken.tokenId.toString()).to.be.eq('0');
         expect(initialToken.USDCAmount.toString()).to.be.eq('0');
         expect(initialToken.BRBCAmount.toString()).to.be.eq('0');
         expect(initialToken.startTime).to.be.eq(0);
         expect(initialToken.deadline).to.be.eq(0);
         expect(initialToken.lastRewardGrowth.toString()).to.be.eq('0');
      });

      it("startLP", async function () {
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address, this.Bob.address]);
         await network.provider.send('evm_mine');

         await expect(this.Staking.connect(this.Alice).whitelistStake(Web3.utils.toWei('701', 'ether'))).to.be.revertedWith(
            'Whitelist staking period ended'
         );
         await expect(this.Staking.connect(this.Alice).stake(Web3.utils.toWei('702', 'ether'))).to.be.revertedWith(
            'Staking period ended'
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

      it("Create whitelist stake", async function () {
         await this.Staking.startLP();
         await this.Staking.setWhitelist([this.Carol.address, this.Alice.address, this.Bob.address]);
         await network.provider.send('evm_mine');

         await expect(this.Staking.connect(this.Carol).whitelistStake(Web3.utils.toWei('801', 'ether'))).to.be.revertedWith(
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

         await network.provider.send("evm_increaseTime", [timestamp1 + 86400]);
         await network.provider.send('evm_mine');
         await expect(this.Staking.connect(this.Bob).whitelistStake(Web3.utils.toWei('800', 'ether'))).to.be.revertedWith(
            'Whitelist staking period ended'
         );
      });

      it.only("Create stake", async function () {
         await this.Staking.startLP();
         await network.provider.send('evm_increaseTime', [
                Number(86400)
         ]);
         await network.provider.send('evm_mine');
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('3000', 'ether'));
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('1000', 'ether'));
         await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('500', 'ether'));
         // await this.Staking.connect(this.Carol).stake(Web3.utils.toWei('550', 'ether'));
         await this.Staking.viewTokensByOwner(this.Carol.address);
         await this.Staking



         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('500', 'ether'));

         let secondToken = await this.Staking.tokensLP(2);

         expect(secondToken.USDCAmount.toString()).to.be.eq(Web3.utils.toWei('500', 'ether').toString());
         expect(secondToken.BRBCAmount.toString()).to.be.eq(Web3.utils.toWei('500', 'ether').toString());

         let balanceUSDC = await this.USDC.balanceOf(this.Alice.address);
         expect(balanceUSDC.toString()).to.be.eq(
             Web3.utils.toWei('99500', 'ether').toString()
         );

         let balanceBRBC = await this.BRBC.balanceOf(this.Alice.address);
         expect(balanceBRBC.toString()).to.be.eq(
             Web3.utils.toWei('99500', 'ether').toString()
         );

         await this.Staking.connect(this.Bob).stake(Web3.utils.toWei('25000', 'ether'));

         let thirdToken = await this.Staking.tokensLP(3);

         expect(thirdToken.USDCAmount.toString()).to.be.eq(Web3.utils.toWei('25000', 'ether').toString());
         expect(thirdToken.BRBCAmount.toString()).to.be.eq(Web3.utils.toWei('25000', 'ether').toString());

      });

      it("Stake time", async function () {
         /*let blockNum0 = await ethers.provider.getBlockNumber();
         let block0 = await ethers.provider.getBlock(blockNum0);
         let timestamp0 = block0.timestamp;
         await network.provider.send('evm_setNextBlockTimestamp', [timestamp0 + 86400]);
         await network.provider.send('evm_mine');*/


         let blockNum = await ethers.provider.getBlockNumber();
         let block = await ethers.provider.getBlock(blockNum);
         let timestamp = block.timestamp;

         await this.Staking.setTime(timestamp + 1000, timestamp + 2592000 + 20000);

         /*
         expect(await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether')).to.be.revertedWith(
             "Staking period hasn't started"
         );
         */

         await network.provider.send('evm_setNextBlockTimestamp', [timestamp + 10000]);

         expect(this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'))).to.be.revertedWith(
            'Invalid period'
         );

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'));

         let firstToken = await this.Staking.tokensLP(1);

         let blockNum1 = await ethers.provider.getBlockNumber();
         let block1 = await ethers.provider.getBlock(blockNum1);
         let timestamp1 = block1.timestamp;

         expect(firstToken.deadline).to.be.eq(timestamp1 + 2592000);

         await network.provider.send('evm_setNextBlockTimestamp', [timestamp1 + 15552000]);


         expect(this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'))).to.be.revertedWith(
             'Staking period has ended'
         );

      });

      it("Max pool size", async function () {
         await this.Staking.setMaxPoolBRBC(Web3.utils.toWei('50000', 'ether'));
         await this.Staking.setMaxPoolUSDC(Web3.utils.toWei('50000', 'ether'));

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('40000', 'ether'));
         await expect(this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10001', 'ether'))).to.be.revertedWith(
              "Max pool size exceeded"
         );

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'));

         expect(this.Staking.connect(this.Bob).stake(Web3.utils.toWei('50000', 'ether'))).to.be.revertedWith(
             'Max pool size exceeded'
         );
      });
   });

   describe('Transfer', () => {
      it("Transfer", async function () {
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'));

         await this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);

         expect(this.Staking.connect(this.Alice).transfer(this.Bob.address, 1)).to.be.revertedWith(
               "You need to be an owner"
         );
         await network.provider.send('evm_mine');
         // transfer back
         await this.Staking.connect(this.Bob).transfer(this.Alice.address, 1);
         /*
         expect(await this.Staking.connect(this.Alice).transfer('0x0000000000000000000000000000000000000000', 1)).to.be.revertedWith(
              "You can't transfer to yourself or to null address"
         );*/

         //expect(await this.Staking.connect(this.Alice).transfer(this.Alice.address, 1)).to.be.revertedWith(
         //    "You can't transfer to yourself or to null address"
         //);
         /*
         let addr = Alice.address;
         console.log(this.Staking.ownerToTokens.addr);
         let flag = 0;
         // Means Alice doesn't own a token
         for (let i = 0; i <= this.Staking.ownerToTokens(Alice.address).length; i++) {
            if (this.Staking.ownerToTokens(Alice.address)[i] == 1){
                    console.log(this.Staking.ownerToTokens(Alice.address)[i]);
                    flag = 1;
                }
            }
            expect(flag).to.be.equal(0);
            let flag1 = 0;
            for (let i = 0; i <= this.Staking.ownerToTokens(Bob.address).length; i++) {
                if (this.Staking.ownerToTokens(Bob.address)[i] == 1){
                    console.log(this.Staking.ownerToTokens(Alice.address)[i]);
                    flag1 = 1;
                }
            }
            expect(flag1).to.be.equal(1);*/

      });
   });

   describe('Rewards ', () => {
      it("Add rewards, view rewards", async function () {
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'));
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('20000', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('1052', 'ether'));

         await network.provider.send('evm_mine');
         expect(await this.Staking.viewRewards(1) / (10 ** 18)).to.be.eq(350.6666666666667);
         expect(await this.Staking.viewRewards(2) / (10 ** 18)).to.be.eq(701.3333333333334);

         await this.Staking.connect(this.Bob).stake(Web3.utils.toWei('25000', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('948', 'ether')); // pool now 2000$

         expect(await this.Staking.viewRewards(1) / (10 ** 18)).to.be.eq(523.030303030303);
         expect(await this.Staking.viewRewards(2) / (10 ** 18)).to.be.eq(1046.060606060606);
         expect(await this.Staking.viewRewards(3) / (10 ** 18)).to.be.eq(430.90909090909093);

         expect(523.030303030303 + 1046.060606060606 + 430.90909090909093).to.be.eq(2000);

      });

      it("Claim Rewards", async function () {

         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('10000', 'ether'));
         await this.Staking.connect(this.Alice).stake(Web3.utils.toWei('20000', 'ether'));

         await this.Staking.addRewards(Web3.utils.toWei('526', 'ether'));

         await this.Staking.connect(this.Alice).claimRewards(1);
         let initialToken = await this.Staking.tokensLP(1);
         let rewardGrowth = await this.Staking.rewardGrowth();

         expect(initialToken.lastRewardGrowth.toString()).to.be.eq(rewardGrowth.toString());
         /*

         expect(this.Staking.connect(Alice).claimRewards(1)).to.be.revertedWith(
             'You have 0 rewards'
         );*/

         this.Staking.addRewards(Web3.utils.toWei('50', 'ether'));

         this.Staking.connect(this.Alice).transfer(this.Bob.address, 1);
         /*

          expect(this.Staking.connect(Alice).claimRewards(1)).to.be.revertedWith(
                "You need to be an owner"
            );

            expect(this.Staking.connect(Alice).claimRewards(0)).to.be.revertedWith(
                "Token 0 is empty"
            );*/

         this.Staking.connect(this.Bob).claimRewards(1);

      });
   });
});