const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");
require("dotenv").config();

const urlInfo = {
  url: "https://nd-654-291-805.p2pify.com",
  user: "keen-bell",
  password: "chaste-gulf-chunk-aloe-deuce-copied"
};

const provider = new ethers.providers.JsonRpcProvider(urlInfo, 137);
const jarABI = require("../ABIs/jar.json");
const masterchefABI = require("../ABIs/masterchef.json");

module.exports = {
  provider,
  masterchef: new ethers.Contract("0x20b2a3fc7b13ca0ccf7af81a68a14cb3116e8749", masterchefABI, provider),
  pMAIUSDC: new ethers.Contract("0xf12bb9dcd40201b5a110e11e38dcddf4d11e6f83", jarABI, provider),
};
