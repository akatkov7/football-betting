const FootballBetting = artifacts.require("FootballBetting");

module.exports = function (deployer) {
  deployer.deploy(FootballBetting);
};
