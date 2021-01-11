// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract FootballBetting {
  address public owner;

  struct Bet {
    address creator;
    uint id;
    uint amount;
    uint oddsNumerator;
    uint oddsDenominator;
    bytes7 description;
    bytes3 winner;

    address acceptor;

    bool isValid;
  }

  mapping (address => Bet[]) bets;

  event BetCreated(address creator, uint id, uint amount, uint oddsNumerator, uint oddsDenominator, bytes7 description, bytes3 winner);
  event BetAccepted(address creator, uint id, address acceptor);
  event BetResolved(address creator, uint id, address winner, uint amountWon);

  constructor() {
    owner = msg.sender;
  }

  function getNumberOfBets() public view returns(uint) {
    return bets[msg.sender].length;
  }

  function createBet(uint betAmount, uint oddsNumerator, uint oddsDenominator, bytes7 description, bytes3 winner) public payable {
    // TODO: validate the description/winner as a valid game and result
    address betCreator = msg.sender;
    uint totalAmount = msg.value;
    uint requiredAmount = oddsNumerator > oddsDenominator ? betAmount * oddsNumerator / oddsDenominator : betAmount;
    require(totalAmount == requiredAmount, "must send enough to cover bet loss");

    uint betId = bets[betCreator].length;
    Bet memory bet = Bet(betCreator, betId, betAmount, oddsNumerator, oddsDenominator, description, winner, address(0), true);
    bets[betCreator].push(bet);

    emit BetCreated(betCreator, betId, betAmount, oddsNumerator, oddsDenominator, description, winner);
  }

  function acceptBet(address betCreator, uint betId) public payable {
    address betAcceptor = msg.sender;
    uint totalAmount = msg.value;

    Bet[] memory creatorBets = bets[betCreator];
    Bet memory bet;
    uint betIndex;
    for (uint i = 0; i < creatorBets.length; i++) {
      if (creatorBets[i].id == betId) {
        bet = creatorBets[i];
        betIndex = i;
        break;
      }
    }
    require(bet.isValid, "unknown bet");
    require(bet.acceptor == address(0), "bet has already been accepted");
    uint requiredAmount = bet.oddsNumerator > bet.oddsDenominator ? bet.amount : bet.amount * bet.oddsDenominator / bet.oddsNumerator;
    require(totalAmount == requiredAmount, "must send enough to cover bet loss");

    bet.acceptor = betAcceptor;
    bets[betCreator][betIndex] = bet;

    emit BetAccepted(betCreator, betId, betAcceptor);
  }

  function resolveBet(uint betId, bytes3 actualWinner) public {
    address betCreator = msg.sender;

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
    require(bet.isValid, "unknown bet");
    require(bet.acceptor != address(0), "can't resolve unaccepted bet");

    uint amountWon = bet.amount + bet.amount * (bet.oddsNumerator > bet.oddsDenominator ? bet.oddsNumerator / bet.oddsDenominator : bet.oddsDenominator / bet.oddsNumerator);
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

    Bet[] storage creatorBets = bets[betCreator];
    Bet memory bet;
    for (uint i = 0; i < creatorBets.length; i++) {
      if (creatorBets[i].id == betId) {
        bet = creatorBets[i];
        require(bet.acceptor == address(0), "cannot withdraw from accepted bet");
        creatorBets[i] = creatorBets[creatorBets.length - 1];
        creatorBets.pop();

        uint requiredAmount = bet.oddsNumerator > bet.oddsDenominator ? bet.amount * bet.oddsNumerator / bet.oddsDenominator : bet.amount;

        if (!payable(betCreator).send(requiredAmount)) {
          revert();
        }
        return;
      }
    }
    revert("unknown bet");
  }
}
