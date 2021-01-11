# FootballBetting

```bash
Powered By Ethereum Smart Contracts!
```

## What is FootballBetting?
A simple smart contract for betting on football games. Can be easily expanded to accommodate bets of any kind. 


## Creating a bet
Creating a bet consists of 5 inputs:
- **Bet Amount:** the bet amount in wei
- **Odds Numerator:** the numerator of the fractional odds being given
- **Odds Denominator:** the denominator of the fractional odds being given
- **Game:** the game being bet on
- **Winner:** the predicted winner

## How it works

1. Create a bet. You must fund enough to cover a loss of the bet.
1. Have someone accept your bet.
1. Once the game is over, resolve the bet with the winner of the game.
1. Payout is automatically given to the winner! Note: there is a 5% rake.

## Example

1. Create a bet for 1 ETH, giving 8 to 1 odds on a Pittsburgh comeback in CLE@PIT. You must fund enough to cover a loss of the bet e.g. 8 ETH.
1. Have someone accept your bet. They would send in 1 ETH for their portion.
1. Once the game is over, resolve the bet with the winner of the game.
1. Payout is given accordingly upon resolution:
- if PIT wins, then you get your original 8 ETH back and the 1 ETH from the acceptor. 
- if CLE wins, then the acceptor gets their 1 ETH back and your 8 ETH.


## Known issues

1. rake is taken from total bet amount instead of profit, to be fixed.
1. No validation of a valid game/winner being chosen. Would require integration with NFL API to see schedule.
1. Requires trusting the bet creator to report the outcome fairly. Potential ways to fix this:
- only allow the owner of the contract to resolve bets as a "fair" third party
- integrate the NFL API to automatically resolve bets

## Setup
```
nvm use
npm install
```

## Running tests
```
# run your local blockchain if needed
npm run-script start-ganache
npm test
```
