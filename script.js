const fs = require("fs");
const { ethers } = require("ethers");
const contracts = require("./contracts");
const erc20IFace = new ethers.utils.Interface(require("./ABIs/jar.json"));
const provider = contracts.provider;

const generateData = async ({ jar, poolID, fuckedBlock }) => {
  const snapshotBlock = 10959415;
  let users = {};

  // 1. Getting all the users
  const filter = jar.filters.Transfer();
  const events = await jar.queryFilter(filter);
  for (const e of events) {
    users[e.args.from] = ethers.constants.Zero;
    users[e.args.to] = ethers.constants.Zero;
  }

  // Delete burn address, dead address and masterchef
  delete users[ethers.constants.AddressZero];
  delete users[contracts.masterchef.address];
  delete users["0x000000000000000000000000000000000000dEaD"];

  // 2. Getting the total asset balance of the users at the pre-fucked block
  const ratio = await jar.getRatio({ blockTag: fuckedBlock - 1 });
  await Promise.all(
    Object.keys(users).map(async (userAddress) => {
      // pToken balance in jar
      const balInJar = await jar.balanceOf(userAddress, {
        blockTag: fuckedBlock - 1,
      });
      // pToken balance in farm
      const { amount: balInFarm } = await contracts.masterchef.userInfo(
        poolID,
        userAddress,
        { blockTag: fuckedBlock - 1 }
      );

      // store total asset balance of the users (at pre-fucked state)
      users[userAddress] = balInJar
        .add(balInFarm)
        .mul(ratio) // convert from pToken to token
        .div(ethers.utils.parseEther("1"));
    })
  );

  // Post fuck block
  // 3. Do a state transition to see how much users have withdrawn and deposited into the fund
  const depositEventsPostFuck = events
    .filter(
      (x) => x.blockNumber >= fuckedBlock && x.blockNumber < snapshotBlock
    )
    .filter((x) => x.args.from === ethers.constants.AddressZero);
  await Promise.all(
    depositEventsPostFuck.map(async (evt) => {
      const txReceipt = await provider.getTransactionReceipt(
        evt.transactionHash
      );

      txReceipt.logs = txReceipt.logs.map((x) => erc20IFace.parseLog(x));

      txReceipt.logs.forEach((x) => {
        // for each transfer, see how much non-pToken is deposited into the jar
        if (x.args.to === jar.address) {
          // whatever ppl put into the jar, add that to the balance
          users[x.args.from] = (
            users[x.args.from] || ethers.BigNumber.from(0)
          ).add(x.args.value);
        }
      });
    })
  );

  const withdrawEventsPostFuck = events
    .filter((x) => x.blockNumber >= fuckedBlock)
    .filter((x) => x.args.to === ethers.constants.AddressZero);
  await Promise.all(
    withdrawEventsPostFuck.map(async (evt) => {
      const txReceipt = await provider.getTransactionReceipt(
        evt.transactionHash
      );

      txReceipt.logs = txReceipt.logs
        .map((x) => {
          try {
            return erc20IFace.parseLog(x);
          } catch (e) {
            return null;
          }
        })
        .filter((x) => x !== null);

      txReceipt.logs.forEach((x) => {
        // for each transfer, see how much non-pToken was sent out from the jar
        if (
          x.args.from === jar.address &&
          x.args.to !== ethers.constants.AddressZero
        ) {
          users[x.args.to] = (users[x.args.to] || ethers.BigNumber.from(0)).sub(
            x.args.value
          );
        }
      });
    })
  );

  // Readable format
  Object.keys(users).forEach((userAddress) => {
    const temp = users[userAddress];

    // No need to airdrop 0 tokens
    if (temp.lte(ethers.constants.Zero)) {
      delete users[userAddress];
    }

    // Airdrop intial amount of tokens
    else {
      users[userAddress] = {
        rawValue: temp.toString(),
        value: ethers.utils.formatEther(temp),
      };
    }
  });
  return users;
};

const main = async () => {
  const pJar0FuckedBlock = 10958758;
  const pJar69aFuckedBlock = 10958774;
  const pJar69bFuckedBlock = 10958783;
  const pJar69cFuckedBlock = 10958793;

  const monies = [
    {
      jar: contracts.psCRV,
      poolID: 8,
      fuckedBlock: pJar0FuckedBlock,
      outfile: "scrv.json",
    },
    {
      jar: contracts.pUNIDAI,
      poolID: 5,
      fuckedBlock: pJar69aFuckedBlock,
      outfile: "uni_eth_dai.json",
    },
    {
      jar: contracts.pUNIUSDC,
      poolID: 6,
      fuckedBlock: pJar69bFuckedBlock,
      outfile: "uni_eth_usdc.json",
    },
    {
      jar: contracts.pUNIUSDT,
      poolID: 7,
      fuckedBlock: pJar69cFuckedBlock,
      outfile: "uni_eth_usdt.json",
    },
  ];

  for (const moneh of monies) {
    const data = await generateData(moneh);
    fs.writeFileSync(moneh.outfile, JSON.stringify(data, null, 4));
  }
};

main();
