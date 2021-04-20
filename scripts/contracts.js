const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");
require("dotenv").config();

const provider = new ethers.providers.InfuraProvider(1, process.env.INFURA_API);

const jarABI = require("../ABIs/jar.json");
const masterchefABI = require("../ABIs/masterchef.json");

module.exports = {
  provider,
  masterchef: new ethers.Contract(
    "0xbD17B1ce622d73bD438b9E658acA5996dc394b0d",
    masterchefABI,
    provider
  ),
  pBACDAI: new ethers.Contract(
    "0x4Cac56929B98d4C52dDfDF998329622013Fed2a5",
    jarABI,
    provider
  ),
  pBASDAI: new ethers.Contract(
    "0xcF45563514a24b10563aC0c9fECCd3476b00DF45",
    jarABI,
    provider
  ),
};
