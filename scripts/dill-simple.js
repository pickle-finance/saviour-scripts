const { ethers, BigNumber } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");

const provider = new ethers.providers.JsonRpcProvider(
  "https://eth-mainnet.alchemyapi.io/v2/hryDcEe1YR3iSfKm1pZWyi5RwiUUznMX"
);

const DILL_ADDR = "0xbBCf169eE191A1Ba7371F30A1C344bFC498b29Cf";
const DILL_START_BLOCK = 11352928;
const POLL_INTERVAL = 9999;
const PICKLE_ADDR = "0x429881672B9AE42b8EbA0E26cD9C73711b891Ca5";
const dillContract = new ethers.Contract(DILL_ADDR, erc20.abi, provider);
const pickleContract = new ethers.Contract(PICKLE_ADDR, erc20.abi, provider);

let dillUsers = {};

const spaceArray = (start, end, interval) => {
  const r = [];
  const n = Math.floor((end - start) / interval);
  for (let i = 0; i < n; i++) {
    r.push(start + i * interval);
  }
  return r;
};

const main = async () => {
  const currentBlock = await provider.getBlockNumber();

  const pickleTransferFilter = pickleContract.filters.Transfer();
  const startBlocks = spaceArray(DILL_START_BLOCK, currentBlock, POLL_INTERVAL);

  await Promise.all(
    startBlocks.map(async (block) => {
      const pickleTransferEvents = await pickleContract.queryFilter(
        pickleTransferFilter,
        block,
        block + POLL_INTERVAL > currentBlock
          ? currentBlock
          : block + POLL_INTERVAL
      );
      for (const e of pickleTransferEvents) {
        if (e.args.dst === DILL_ADDR)
          dillUsers[e.args.src] = BigNumber.from("0");
      }
    })
  );
  await Promise.all(
    Object.keys(dillUsers).map(async (user) => {
      dillUsers[user] = await dillContract.balanceOf(user);
    })
  );
  console.log(dillUsers);
};

main();

