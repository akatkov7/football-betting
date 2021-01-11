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
    // makes testing the balances easier
    FootballBetting.defaults({
      gasPrice: 0,
    })
  });

  it('successful bet flow with creator winning', async function () {
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

  // testing create
  it('cannot create bet with insufficent funds', async function () {
    expectRevert(
      this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 149 }), 
      "must send enough to cover bet loss"
    );
  });

  it('cannot create bet with 0 numerator', async function () {
    expectRevert(
      this.contract.createBet(100, 0, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 }), 
      "oddsNumerator must be greater than 0"
    );
  });

  it('cannot create bet with 0 denominator', async function () {
    expectRevert(
      this.contract.createBet(100, 3, 0, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 }), 
      "oddsDenominator must be greater than 0"
    );
  });

  it('can create bet', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
  });

  // testing accept
  it('cannot accept nonexistent bet', async function () {
    expectRevert(this.contract.acceptBet(accountA, 0, { from: accountB }), "unknown bet");
  });

  it('cannot accept already accepted bet', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 });

    expectRevert(this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 }), "bet has already been accepted");
  });

  it('cannot accept bet with insufficent funds', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });
    expectRevert(this.contract.acceptBet(accountA, 0, { from: accountB, value: 99 }), "must send enough to cover bet loss");
  });

  it('can accept bet', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 });

    expect(await this.contract.getNumberOfBets({ from: accountA })).to.be.bignumber.equal(new BN(1));
    // we can check that it was accepted succesfully by expecting a revert on a withdraw
    expectRevert(this.contract.withdrawBet(0, { from: accountA }), "can't withdraw from accepted bet");
  });

  // testing resolve
  it('cannot resolve nonexistent bet', async function () {
    expectRevert(this.contract.resolveBet(0, toHexString("PIT"), { from: accountA }), "unknown bet");
  });

  it('cannot resolve someone elses bet', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });
    expectRevert(this.contract.resolveBet(0, toHexString("PIT"), { from: accountB }), "unknown bet");
  });

  it('cannot resolve unaccepted bet', async function () {
    await this.contract.createBet(100, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 150 });

    expectRevert(this.contract.resolveBet(0, toHexString("PIT"), { from: accountA }), "can't resolve unaccepted bet");
  });

  it('can resolve bet in favor of creator', async function () {
    await this.contract.createBet(200, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 300 });
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 200 });

    const postBetAcceptanceBalanceA = new BN(await web3.eth.getBalance(accountA));

    await this.contract.resolveBet(0, toHexString("PIT"), { from: accountA });
    
    const finalBalanceA = new BN(await web3.eth.getBalance(accountA));
    expect(finalBalanceA).to.be.bignumber.equal(postBetAcceptanceBalanceA.add(new BN((200 + 200 * 3 / 2) * 0.95)));
  });

  it('can resolve bet in favor of acceptor', async function () {
    await this.contract.createBet(200, 3, 2, toHexString("CLE@PIT"), toHexString("PIT"), { from: accountA, value: 300 });
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 200 });

    const postBetAcceptanceBalanceB = new BN(await web3.eth.getBalance(accountB));
    
    await this.contract.resolveBet(0, toHexString("CLE"), { from: accountA });
    
    const finalBalanceB = new BN(await web3.eth.getBalance(accountB));
    expect(finalBalanceB).to.be.bignumber.equal(postBetAcceptanceBalanceB.add(new BN((200 + 200 * 3 / 2) * 0.95)));
  });

  // testing withdraw
  it('cannot withdraw nonexistent bet', async function () {
    expectRevert(this.contract.withdrawBet(0, { from: accountA }), "unknown bet");
  });

  it('cannot withdraw accepted bet', async function () {
    await this.contract.createBet(100, 1, 1, toHexString("CLE@PIT"), toHexString("CLE"), { from: accountA, value: 100 });
    await this.contract.acceptBet(accountA, 0, { from: accountB, value: 100 });
    expectRevert(this.contract.withdrawBet(0, { from: accountA }), "can't withdraw from accepted bet");
  });

  it('can withdraw unaccepted bet', async function () {
    const startingBalanceA = new BN(await web3.eth.getBalance(accountA));

    await this.contract.createBet(100, 1, 1, toHexString("CLE@PIT"), toHexString("CLE"), { from: accountA, value: 100 });
    await this.contract.withdrawBet(0, { from: accountA });

    const finalBalanceA = new BN(await web3.eth.getBalance(accountA));

    expect(finalBalanceA).to.be.bignumber.equal(startingBalanceA);
  });
});

function toHexString(str) {
  return '0x' + Array.from(str).map(c => c.charCodeAt().toString(16)).join('');
}
