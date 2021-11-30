const { ethers, BigNumber } = require("ethers");
const gaugeAbi = require("../ABIs/Gauge.json");
const erc20 = require("@studydefi/money-legos/erc20");
const jarAbi = require("../ABIs/jar.json")
const gaugeProxyAbi = require("../ABIs/GaugeProxy.json");

const provider = new ethers.providers.JsonRpcProvider(
  "https://eth-mainnet.alchemyapi.io/v2/hryDcEe1YR3iSfKm1pZWyi5RwiUUznMX"
);

const GAUGE_PROXY = "0x2e57627ACf6c1812F99e274d0ac61B786c19E74f";
const gaugeProxy = new ethers.Contract(GAUGE_PROXY, gaugeProxyAbi, provider);

let users = {};

const main = async () => {
  const gaugeTokens = await gaugeProxy.tokens();

  // token is typically a pToken
  gaugeTokens.forEach(async (token) => {
    // get deposit token info
    const tokenContract = new ethers.Contract(token, jarAbi, provider);
    const tokenName = await tokenContract.name();

    const lpAddress = await tokenContract.token().catch(x => ethers.constants.AddressZero)

    // get gauge
    const gaugeAddress = await gaugeProxy.gauges(token);
    const gauge = new ethers.Contract(gaugeAddress, gaugeAbi, provider);

    // get deposit/withdrawal events & perform accounting
    const depositEvents = await gauge.queryFilter(gauge.filters.Staked());
    const withdrawEvents = await gauge.queryFilter(gauge.filters.Withdrawn());
    for (const e of depositEvents) {
      users[e.args.user] = e.args.amount;
    }
    for (const e of withdrawEvents) {
      users[e.args.user] = users[e.args.user].sub(e.args.amount);
    }

    // don't care about users who've left
    Object.keys(users).map((user) => {
      if (users[user].eq(ethers.constants.Zero)) delete users[user];
    });

    console.log(
      `${tokenName} (${lpAddress == (ethers.constants.AddressZero) ? token : lpAddress}) has ${
        Object.keys(users).length
      } active Gauge depositors`
    );
    users = {};
  });
};

main();
