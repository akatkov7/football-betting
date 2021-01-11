// Load dependencies
const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG } = require('constants');

// Load compiled artifacts
const FootballBetting = artifacts.require('FootballBetting');

// Start test block
contract('FootballBetting', function ([ owner, accountA, accountB ]) {
  beforeEach(async function () {
    // Deploy a new FootballBetting contract for each test
    this.contract = await FootballBetting.new();
  });

  it('successful bet flow with creator winning', async function () {
    // makes testing the balances easier
    FootballBetting.defaults({
      gasPrice: 0,
    })

    const startingBalanceA = new BN(await web3.eth.getBalance(accountA));
    const startingBalanceB = new BN(await web3.eth.getBalance(accountB));

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(0));

    const betAmount = 100;
    const betNumerator = 8;
    const betDenominator = 1;
    await this.contract.createBet(betAmount, betNumerator, betDenominator, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 800 });

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
    const postBetCreationBalanceA = new BN(await web3.eth.getBalance(accountA));
    console.log();
    expect(postBetCreationBalanceA).to.be.bignumber.equal(startingBalanceA.sub(new BN(betAmount * betNumerator / betDenominator)));
    
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 });
    
    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
    const postBetAcceptanceBalanceA = new BN(await web3.eth.getBalance(accountA));
    const postBetAcceptanceBalanceB = new BN(await web3.eth.getBalance(accountB));
    expect(postBetAcceptanceBalanceA).to.be.bignumber.equal(postBetCreationBalanceA);
    expect(postBetAcceptanceBalanceB).to.be.bignumber.equal(startingBalanceB.sub(new BN(betAmount)));

    await this.contract.resolveBet(0, toHexString("PIT"), { from: accountA });
  
    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(0));
    const finalBalanceA = new BN(await web3.eth.getBalance(accountA));
    const finalBalanceB = new BN(await web3.eth.getBalance(accountB));

    const payout = (betAmount + betAmount * betNumerator / betDenominator) * 0.95;

    expect(finalBalanceA).to.be.bignumber.equal(postBetAcceptanceBalanceA.add(new BN(payout)));
    expect(finalBalanceB).to.be.bignumber.equal(postBetAcceptanceBalanceB);
  });

  it('successful bet flow with acceptor winning', async function () {
    // makes testing the balances easier
    FootballBetting.defaults({
      gasPrice: 0,
    })

    const startingBalanceA = new BN(await web3.eth.getBalance(accountA));
    const startingBalanceB = new BN(await web3.eth.getBalance(accountB));

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(0));

    const betAmount = 100;
    const betNumerator = 8;
    const betDenominator = 1;
    await this.contract.createBet(betAmount, betNumerator, betDenominator, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 800 });

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
    const postBetCreationBalanceA = new BN(await web3.eth.getBalance(accountA));
    console.log();
    expect(postBetCreationBalanceA).to.be.bignumber.equal(startingBalanceA.sub(new BN(betAmount * betNumerator / betDenominator)));
    
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 });
    
    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
    const postBetAcceptanceBalanceA = new BN(await web3.eth.getBalance(accountA));
    const postBetAcceptanceBalanceB = new BN(await web3.eth.getBalance(accountB));
    expect(postBetAcceptanceBalanceA).to.be.bignumber.equal(postBetCreationBalanceA);
    expect(postBetAcceptanceBalanceB).to.be.bignumber.equal(startingBalanceB.sub(new BN(betAmount)));


    await this.contract.resolveBet(0, toHexString("CLE"), { from: accountA });
  
    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(0));
    const finalBalanceA = new BN(await web3.eth.getBalance(accountA));
    const finalBalanceB = new BN(await web3.eth.getBalance(accountB));

    const payout = (betAmount + betAmount * betNumerator / betDenominator) * 0.95;

    expect(finalBalanceA).to.be.bignumber.equal(postBetAcceptanceBalanceA);
    expect(finalBalanceB).to.be.bignumber.equal(postBetAcceptanceBalanceB.add(new BN(payout)));
  });
});

function toHexString(str) {
  return '0x' + Array.from(str).map(c => c.charCodeAt().toString(16)).join('');
}
