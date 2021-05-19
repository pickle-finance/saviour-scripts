const fs = require("fs");
const { ethers } = require("ethers");
const contracts = require("./contracts");
const erc20IFace = new ethers.utils.Interface(require("../ABIs/jar.json"));
const gaugeABI = require("../ABIs/gauge.json");
const provider = contracts.provider;

const initializeUsers = async jar => {
  let users = {};
  const filter = jar.filters.Transfer();
  const gaugeAddress = await contracts.gaugeProxy.getGauge(jar.address);
  const events = await jar.queryFilter(filter);
  for (const e of events) {
    users[e.args.from] = { bal: ethers.constants.Zero, luna: 0 };
    users[e.args.to] = { bal: ethers.constants.Zero, luna: 0 };
  }

  // Delete burn address, dead address and masterchef
  delete users[ethers.constants.AddressZero];
  delete users[contracts.masterchef.address];
  delete users[gaugeAddress];
  delete users["0x000000000000000000000000000000000000dEaD"];

  return users;
};

const generateData = async (jar, poolID, lunaRewards, blockNum, users) => {
  // 1. Getting all the users
  const filter = jar.filters.Transfer();
  const events = await jar.queryFilter(filter);
  const gaugeAddress = await contracts.gaugeProxy.getGauge(jar.address);
  const gaugeContract = new ethers.Contract(gaugeAddress, gaugeABI, provider);

  // 2. Getting the total asset balance of the users at the pre-fucked block
  const ratio = await jar.getRatio({ blockTag: blockNum - 1 });
  await Promise.all(
    Object.keys(users).map(async userAddress => {
      // pToken balance in jar
      const balInJar = await jar.balanceOf(userAddress, {
        blockTag: blockNum - 1
      });
      // pToken balance in gauge
      const balInGauge = await gaugeContract.balanceOf(userAddress, {
        blockTag: blockNum - 1
      });

      // pToken balance in farm
      const { amount: balInFarm } = await contracts.masterchef.userInfo(
        poolID,
        userAddress,
        {
          blockTag: blockNum - 1
        }
      );

      // store total asset balance of the users (at pre-fucked state)
      users[userAddress] = {
        ...users[userAddress],
        bal: balInJar
          .add(balInFarm)
          .add(balInGauge)
          .mul(ratio) // convert from pToken to token
          .div(ethers.utils.parseEther("1"))
      };
    })
  );

  const totalDeposits = Object.keys(users).reduce((acc, curr) => {
    return acc.add(users[curr].bal);
  }, ethers.BigNumber.from(0));

  // Readable format
  Object.keys(users).forEach(userAddress => {
    const temp = users[userAddress];

    // Airdrop tokens
    const userLuna =
      temp.luna +
      lunaRewards *
        +ethers.utils.formatEther(
          temp.bal.mul(ethers.utils.parseEther("1")).div(totalDeposits)
        );

    users[userAddress] = {
      rawValue: temp.bal.toString(),
      value: ethers.utils.formatEther(temp.bal),
      luna: userLuna
    };
  });
  return users;
};

const main = async () => {
  const startBlock = 12371130; // ~1AM UTC May 5
  const endBlock = 12461800; // ~1AM UTC May 19

  const monies = [
    {
      jar: contracts.pMIRUST,
      poolID: 28,
      luna: 271.1075,
      outfile: "mirust.json"
    },
    {
      jar: contracts.pMTSLAUST,
      poolID: 30,
      luna: 162.6645,
      outfile: "mtlsaust.json"
    },
    {
      jar: contracts.pMAAPLUST,
      poolID: 31,
      luna: 162.6645,
      outfile: "maaplust.json"
    },
    {
      jar: contracts.pMQQQUST,
      poolID: 32,
      luna: 162.6645,
      outfile: "mqqqust.json"
    },
    {
      jar: contracts.pMSLVUST,
      poolID: 33,
      luna: 162.6645,
      outfile: "mslvust.json"
    },
    {
      jar: contracts.pMBABAUST,
      poolID: 34,
      luna: 162.6645,
      outfile: "mbabaust.json"
    }
  ];

  for (const moneh of monies) {
    const blockIncrement = Math.floor((endBlock - startBlock) / 14); // Space out snapshots daily over 2 weeks

    let data;
    let users = await initializeUsers(moneh.jar);
    for (i = 0; i < 14; i++) {
      data = await generateData(
        moneh.jar,
        moneh.poolID,
        moneh.luna / 14,
        startBlock + blockIncrement * i,
        users
      );
    }

    // Cleanup
    for (const user in users) {
      if (data[user].luna === 0) delete data[user];
    }
    fs.writeFileSync(moneh.outfile, JSON.stringify(data, null, 4));
  }
};

main();
