// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract FootballBetting {
  // not currently used, but could be used in a variant of this contract where the owner is the only one
  // who can resolve bets as a "neutral" third party
  address public owner;

  // tracks all the information we need about a bet
  struct Bet {
    address creator;
    uint id;
    uint amount;
    uint oddsNumerator;
    uint oddsDenominator;
    // game description described as away team abbreviation @ home team abbreviation e.g. "CLE@PIT"
    bytes7 description;
    // the team abbreviation for who the creator thinks will win e.g. "PIT"
    bytes3 winner;

    // the person who accepts the bet
    address acceptor;

    // used to tell apart a "null" instance from a legit one
    bool isValid;
  }

  mapping (address => Bet[]) bets;

  event BetCreated(address creator, uint id, uint amount, uint oddsNumerator, uint oddsDenominator, bytes7 description, bytes3 winner);
  event BetAccepted(address creator, uint id, address acceptor);
  event BetResolved(address creator, uint id, address winner, uint amountWon);
  event BetWithdrawn(address creator, uint id);

  constructor() {
    owner = msg.sender;
  }

  function getNumberOfBets() public view returns(uint) {
    return bets[msg.sender].length;
  }

  function createBet(uint betAmount, uint oddsNumerator, uint oddsDenominator, bytes7 description, bytes3 winner) public payable {
    // TODO: validate the description/winner as a valid game and result
    require(oddsNumerator > 0, "oddsNumerator must be greater than 0");
    require(oddsDenominator > 0, "oddsDenominator must be greater than 0");

    address betCreator = msg.sender;
    uint totalAmount = msg.value;
    uint betId = bets[betCreator].length;
    Bet memory bet = Bet(betCreator, betId, betAmount, oddsNumerator, oddsDenominator, description, winner, address(0), true);
    
    // make sure that the value passed in can cover a loss based on the odds
    uint requiredAmount = _getRequiredAmountToCoverBet(bet, true);
    require(totalAmount == requiredAmount, "must send enough to cover bet loss");

    // store bet in the creators bet list
    bets[betCreator].push(bet);

    emit BetCreated(betCreator, betId, betAmount, oddsNumerator, oddsDenominator, description, winner);
  }

  function acceptBet(address betCreator, uint betId) public payable {
    address betAcceptor = msg.sender;
    uint totalAmount = msg.value;

    // find the bet in the betCreator's list of bets
    Bet[] storage creatorBets = bets[betCreator];
    Bet memory bet;
    uint betIndex;
    for (uint i = 0; i < creatorBets.length; i++) {
      if (creatorBets[i].id == betId) {
        bet = creatorBets[i];
        betIndex = i;
        break;
      }
    }
    // check if the bet exists using isValid as is null proxy
    require(bet.isValid, "unknown bet");
    // don't allow double acceptance
    require(bet.acceptor == address(0), "bet has already been accepted");
    // make sure that the value passed in can cover a loss based on the odds
    uint requiredAmount = _getRequiredAmountToCoverBet(bet, false);
    require(totalAmount == requiredAmount, "must send enough to cover bet loss");

    // update who accepted the bet and put it in storage
    bet.acceptor = betAcceptor;
    creatorBets[betIndex] = bet;

    emit BetAccepted(betCreator, betId, betAcceptor);
  }

  // allows the creator to resolve a bet of their own
  // NB: this requires trusting the creator to fairly report the results of the bet
  function resolveBet(uint betId, bytes3 actualWinner) public {
    address betCreator = msg.sender;

    // get the bet to be resolved and remove it from storage if found
    Bet[] storage creatorBets = bets[betCreator];
    Bet memory bet;
    for (uint i = 0; i < creatorBets.length; i++) {
      if (creatorBets[i].id == betId) {
        bet = creatorBets[i];
        // remove bet from storage
        creatorBets[i] = creatorBets[creatorBets.length - 1];
        creatorBets.pop();
        break;
      }
    }
    // check if the bet exists using isValid as is null proxy
    require(bet.isValid, "unknown bet");
    // can only resolve bets that were accepted
    require(bet.acceptor != address(0), "can't resolve unaccepted bet");

    uint amountWon = _getAmountWon(bet);
    // TODO: take rake only from profit
    uint rake = amountWon / 100 * 5;
    uint payout = amountWon - rake;
    address winner;
    if (actualWinner == bet.winner) {
      // creator is the winner
      winner = bet.creator;
    } else {
      // acceptor is the winner
      winner = bet.acceptor;
    }
    
    if (!payable(winner).send(payout)) {
      revert();
    }
    
    emit BetResolved(betCreator, betId, winner, amountWon);
  }

  function withdrawBet(uint betId) public {
    address betCreator = msg.sender;

    // get the bet to be withdrawn and remove it from storage if found
    Bet[] storage creatorBets = bets[betCreator];
    Bet memory bet;
    for (uint i = 0; i < creatorBets.length; i++) {
      if (creatorBets[i].id == betId) {
        bet = creatorBets[i];
        // remove bet from storage
        creatorBets[i] = creatorBets[creatorBets.length - 1];
        creatorBets.pop();
        break;
      }
    }
    // check if the bet exists using isValid as is null proxy
    require(bet.isValid, "unknown bet");
    // can only withdraw bets that were not accepted
    require(bet.acceptor == address(0), "can't withdraw from accepted bet");

    // get amount the creator was required to put in
    uint requiredAmount = _getRequiredAmountToCoverBet(bet, true);

    // attempt to return money
    if (!payable(betCreator).send(requiredAmount)) {
      revert();
    }

    emit BetWithdrawn(betCreator, betId);
  }

  function _getRequiredAmountToCoverBet(Bet memory bet, bool isCreator) private pure returns (uint) {
    if (isCreator) {
      return bet.oddsNumerator > bet.oddsDenominator ? bet.amount * bet.oddsNumerator / bet.oddsDenominator : bet.amount;
    } else {
      return bet.oddsNumerator > bet.oddsDenominator ? bet.amount : bet.amount * bet.oddsDenominator / bet.oddsNumerator;
    }
  }

  function _getAmountWon(Bet memory bet) private pure returns (uint) {
    // both users put in the bet amount, but one of them also put in extra to cover the odds
    return bet.amount + bet.amount * _max(bet.oddsNumerator, bet.oddsDenominator) / _min(bet.oddsNumerator, bet.oddsDenominator);
  }

  function _max(uint a, uint b) private pure returns (uint) {
    return a > b ? a : b;
  }

  function _min(uint a, uint b) private pure returns (uint) {
    return a < b ? a : b;
  }
}
