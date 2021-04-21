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
    "0x2350fc7268F3f5a6cC31f26c38f706E41547505d",
    jarABI,
    provider
  ),
  pBASDAI: new ethers.Contract(
    "0x748712686a78737da0b7643df78fdf2778dc5944",
    jarABI,
    provider
  ),
};
