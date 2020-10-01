const ethers = require("ethers");
const fs = require("fs");

const addressMapping = {
  "scrv.json": "0x68d14d66B2B0d6E157c06Dc8Fefa3D8ba0e66a89",
  "uni_eth_dai.json": "0xCffA068F1E44D98D3753966eBd58D4CFe3BB5162",
  "uni_eth_usdc.json": "0x53Bf2E62fA20e2b4522f05de3597890Ec1b352C6",
  "uni_eth_usdt.json": "0x09FC573c502037B149ba87782ACC81cF093EC6ef",
};

const nameMapping = {
  "scrv.json": "pSCRV",
  "uni_eth_dai.json": "pUniEthDai",
  "uni_eth_usdc.json": "pUniEthUsdc",
  "uni_eth_usdt.json": "pUniEthUsdt",
};

const main = async () => {
  const file = process.argv[2];
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const recipients = Object.keys(data);

  const filename = file.split('/').slice(-1)[0]
  const tokenAddress = addressMapping[filename]
  const tokenName = nameMapping[filename]

  if (!tokenAddress || !tokenName) {
    console.log('NOONONONONONONONONONO')
    process.exit(1)
  }
  
  console.log(`// SPDX-License-Identifier: MIT
// from file ${file}
pragma solidity ^0.6.7;

interface ERC20 {
    function transfer(address _to, uint256 _value) external returns (bool success);
}

contract ${tokenName}Reimbursement {
  mapping (address => uint256) public amounts;
  mapping (address => bool) public reimbursed;

  address public constant token = ${tokenAddress};
  address public constant gov = 0x9d074E37d408542FD38be78848e8814AFB38db17;

  constructor() public {`);
  for (const r of recipients) {
    console.log(
      `    amounts[${ethers.utils.getAddress(r)}] = ${data[r].rawValue};`
    );
  }
  console.log(`
  }
  
  function claim() public {
    require(!reimbursed[msg.sender], "already reimbursed");
    require(amounts[msg.sender] > 0, "not claimable");
    require(ERC20(token).transfer(msg.sender, amounts[msg.sender]));
    reimbursed[msg.sender] = true;
  }

  function saveERC20(address _erc20, uint256 _amount) public {
    require(_erc20 != token, "!token");
    require(ERC20(_erc20).transfer(gov, _amount));
  }
  `);
  console.log("}");
};

main();
