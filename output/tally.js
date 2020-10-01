const { ethers } = require("ethers");
const fs = require("fs");

const main = async () => {
  const files = [
    "scrv.json",
    "uni_eth_dai.json",
    "uni_eth_usdc.json",
    "uni_eth_usdt.json",
  ];

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(`./${f}`, "utf-8"));

    const total = Object.keys(data)
      .map((x) => parseFloat(data[x].value))
      .reduce((acc, x) => acc + x, 0);

    const totalBN = Object.keys(data)
      .map((x) => ethers.BigNumber.from(data[x].rawValue))
      .reduce((acc, x) => acc.add(x), ethers.constants.Zero);

    console.log(f, total, totalBN.toString());
  }
};

main();
