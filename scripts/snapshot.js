const fs = require("fs");
const { ethers } = require("ethers");
const contracts = require("./contracts");
const { masterchef } = require("./contracts");
const erc20IFace = new ethers.utils.Interface(require("../ABIs/jar.json"));
const provider = contracts.provider;
const abiDecoder = require("abi-decoder");
abiDecoder.addABI(require("../ABIs/jar.json"));

const generateData = async ({ jar, poolID, fuckedBlock }) => {
  let users = {};

  // 1. Getting all the users
  const filter = jar.filters.Transfer();
  const events = await jar.queryFilter(filter, fuckedBlock );
  console.log(events[0])
  for (const e of events) {
    users[e.args.from] = ethers.constants.Zero;
    users[e.args.to] = ethers.constants.Zero;
  }

  // Delete burn address, dead address and masterchef
  delete users[ethers.constants.AddressZero];
  delete users[contracts.masterchef.address];
  delete users["0x000000000000000000000000000000000000dEaD"];

  // Post fuck block
  // 3. Do a state transition to see how much users have withdrawn and deposited into the fund
  const depositEventsPostFuck = events
    .filter(
      (x) => x.blockNumber >= fuckedBlock)
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
          x.args.to !== ethers.constants.AddressZero &&
          x.args.to !== masterchef.address
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

  const monies = [
    {
      jar: contracts.pMAIUSDC,
      poolID: 7,
      fuckedBlock: 15597905,
      outfile: "mai.json",
    },
  ];

  for (const moneh of monies) {
    const data = await generateData(moneh);
    fs.writeFileSync(moneh.outfile, JSON.stringify(data, null, 4));
  }
};

main();
