const ethers = require("ethers");
const fs = require("fs");

const addressMapping = {
  "bacdai.json": "0x4Cac56929B98d4C52dDfDF998329622013Fed2a5",
  "basdai.json": "0xcF45563514a24b10563aC0c9fECCd3476b00DF45",
};

const nameMapping = {
  "bacdai.json": "pBasisBacDai",
  "basdai.json": "pBasisBasDai",
};

const main = async () => {
  const file = process.argv[2];
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const recipients = Object.keys(data);

  const filename = file.split("/").slice(-1)[0];
  const tokenAddress = addressMapping[filename];
  const tokenName = nameMapping[filename];

  if (!tokenAddress || !tokenName) {
    console.log("NOONONONONONONONONONO");
    process.exit(1);
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
    console.log(`    amounts[${ethers.utils.getAddress(r)}] = ${data[r].rawValue};`);
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
    require(msg.sender == gov, "!gov");
    require(ERC20(_erc20).transfer(gov, _amount));
  }
  `);
  console.log("}");
};

main();
