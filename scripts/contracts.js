const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");

const provider = new ethers.providers.EtherscanProvider(1);

const jarABI = require("../ABIs/jar.json");
const masterchefABI = require("../ABIs/masterchef.json");

module.exports = {
  provider,
  masterchef: new ethers.Contract(
    "0xbD17B1ce622d73bD438b9E658acA5996dc394b0d",
    masterchefABI,
    provider
  ),
  sCRV: new ethers.Contract(
    "0xC25a3A3b969415c80451098fa907EC722572917F",
    erc20.abi,
    provider
  ),
  psCRV: new ethers.Contract(
    "0x2385D31f1EB3736bE0C3629E6f03C4b3cd997Ffd",
    jarABI,
    provider
  ),
  pUNIDAI: new ethers.Contract(
    "0xf79Ae82DCcb71ca3042485c85588a3E0C395D55b",
    jarABI,
    provider
  ),
  pUNIUSDC: new ethers.Contract(
    "0x46206E9BDaf534d057be5EcF231DaD2A1479258B",
    jarABI,
    provider
  ),
  pUNIUSDT: new ethers.Contract(
    "0x3a41AB1e362169974132dEa424Fb8079Fd0E94d8",
    jarABI,
    provider
  ),
};
