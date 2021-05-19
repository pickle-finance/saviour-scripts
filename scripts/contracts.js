const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");
require("dotenv").config();

const provider = new ethers.providers.InfuraProvider(1, process.env.INFURA_API);

const jarABI = require("../ABIs/jar.json");
const masterchefABI = require("../ABIs/masterchef.json");
const gaugeABI = require("../ABIs/gauge.json");
const gaugeProxyABI = require("../ABIs/gaugeproxy.json")

module.exports = {
  provider,
  masterchef: new ethers.Contract("0xbD17B1ce622d73bD438b9E658acA5996dc394b0d", masterchefABI, provider),
  gauge: new ethers.Contract("0xe9bead1d3e3a25e8af7a6b40e48de469a9613ede", gaugeABI, provider),
  gaugeProxy: new ethers.Contract("0x2e57627ACf6c1812F99e274d0ac61B786c19E74f", gaugeProxyABI, provider),
  pMIRUST: new ethers.Contract("0x3bcd97dca7b1ced292687c97702725f37af01cac", jarABI, provider),
  pMTSLAUST: new ethers.Contract("0xaFB2FE266c215B5aAe9c4a9DaDC325cC7a497230", jarABI, provider),
  pMAAPLUST: new ethers.Contract("0xF303B35D5bCb4d9ED20fB122F5E268211dEc0EBd", jarABI, provider),
  pMQQQUST: new ethers.Contract("0x7C8de3eE2244207A54b57f45286c9eE1465fee9f", jarABI, provider),
  pMSLVUST: new ethers.Contract("0x1ed1fD33b62bEa268e527A622108fe0eE0104C07", jarABI, provider),
  pMBABAUST: new ethers.Contract("0x1CF137F651D8f0A4009deD168B442ea2E870323A", jarABI, provider),
};
