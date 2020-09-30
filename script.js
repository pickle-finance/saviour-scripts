const { ethers } = require("ethers");
const abiDecoder = require("abi-decoder");
const fs = require("fs");

const provider = new ethers.providers.JsonRpcProvider(
  "http://192.168.1.108:8544"
);

const etherscan = new ethers.providers.EtherscanProvider(
  1,
  "QJPHEUVRS84V4KH16EG1YTUQMHJMH9PBBK"
);

const contracts = require("./contracts");

const erc20IFace = new ethers.utils.Interface(require("./ABIs/jar.json"));

abiDecoder.addABI(require("./ABIs/jar.json"));
abiDecoder.addABI(require("./ABIs/masterchef.json"));

const generateData = async ({ jar, poolID, fuckedBlock }) => {
  // const jar = contracts.psCRV;
  // const poolID = 8;
  const preFuckedBlock = fuckedBlock - 1;
  let users = {};

  // 1. Getting all the users
  const jarHistory = (await etherscan.getHistory(jar.address)).slice(1);
  jarHistory.forEach((tx) => {
    // early return if post-fucked
    if (tx.blockNumber >= fuckedBlock) return;

    // filter for the actions we care about
    const actions = ["withdraw", "withdrawAll", "deposit", "depositAll"];
    const functionSig = abiDecoder.decodeMethod(tx.data);

    if (actions.includes(functionSig.name)) {
      users[tx.from] = ethers.BigNumber.from(0); // create empty record in users object
    }
  });

  // 2. Getting the total asset balance of the users at the pre-fucked block
  const ratio = await jar.getRatio({ blockTag: preFuckedBlock });
  await Promise.all(
    Object.keys(users).map(async (userAddress) => {
      // pToken balance in jar
      const balInJar = await jar.balanceOf(userAddress, {
        blockTag: preFuckedBlock,
      });
      // pToken balance in farm
      const { amount: balInFarm } = await contracts.masterchef.userInfo(
        poolID,
        userAddress,
        { blockTag: preFuckedBlock }
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
  await Promise.all(
    jarHistory.map(async (tx) => {
      // early return if pre-fucked
      if (tx.blockNumber < fuckedBlock) return;

      // don't return if post fucked
      if (tx.blockNumber > 10958758) return;

      const actions = ["deposit", "depositAll"];
      const functionSig = abiDecoder.decodeMethod(tx.data);

      if (actions.includes(functionSig.name)) {
        const txReceipt = await provider.getTransactionReceipt(tx.hash);
        txReceipt.logs = txReceipt.logs.map((x) => erc20IFace.parseLog(x));

        txReceipt.logs.forEach((x) => {
          // for each transfer, see how much non-pToken is deposited into the jar
          if (x.args.to.toLowerCase() === jar.address.toLowerCase()) {
            // whatever ppl put into the jar, add that to the balance
            users[x.args.from] = (
              users[x.args.from] || ethers.BigNumber.from(0)
            ).add(x.args.value);
          }
        });
      }

      if (["withdraw", "withdrawAll"].includes(functionSig.name)) {
        const txReceipt = await provider.getTransactionReceipt(tx.hash);
        txReceipt.logs = txReceipt.logs.map((x) => erc20IFace.parseLog(x));

        txReceipt.logs.forEach((x) => {
          // for each transfer, see how much non-pToken was sent out from the jar
          if (
            x.args.from.toLowerCase() === jar.address.toLowerCase() &&
            x.args.to !== ethers.constants.AddressZero
          ) {
            users[x.args.to] = (
              users[x.args.to] || ethers.BigNumber.from(0)
            ).sub(x.args.value);
          }
        });
      }
    })
  );

  Object.keys(users).forEach((userAddress) => {
    const temp = users[userAddress];
    users[userAddress] = {
      rawValue: temp.toString(),
      value: ethers.utils.formatEther(temp),
    };
  });

  return users;
};

const main = async () => {
  const pJar0FuckedBlock = 10958758;
  const pJar69aFuckedBlock = 10958774;
  const pJar69bFuckedBlock = 10958783;
  const pJar69cFuckedBlock = 10958793;

  const molachMe = [
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

  for (const config of molachMe) {
    const data = await generateData(config);
    fs.writeFileSync(config.outfile, JSON.stringify(data, null, 4));
  }
};

main();
