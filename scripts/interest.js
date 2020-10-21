const { ethers } = require("ethers");

const abiDecoder = require("abi-decoder");
const contracts = require("./contracts");
abiDecoder.addABI(require("../ABIs/psCRVStrategy.json"));
abiDecoder.addABI(require("../ABIs/pUNIStrategy.json"));

const curveGaugeIFace = new ethers.utils.Interface(
  require("../ABIs/Gauge.json")
);

const curveRewardsIFace = new ethers.utils.Interface(
  require("../ABIs/CurveRewards.json")
);
const uniStakingIFace = new ethers.utils.Interface(
  require("../ABIs/UniStaking.json")
);

const provider = new ethers.providers.EtherscanProvider(1);

// Assume each block is 15 seconds
const startBlock = 11055589;
const endBlock = 11102113;

const getInterestEarned = async (strategyAddress) => {
  const isCrv =
    strategyAddress === "0x1c17C71cD9eD9fb35C4b2B0cCbe46cfAcC85dE0a" ||
    strategyAddress === "0xa68EAD350155e0BC1264B3aA43aa62Ca3bc443e0" ||
    strategyAddress === "0x42AD7C7fCD4D1B1eCaAC9f14813e0136C7F414Bf";

  // get transactions
  const history = (await provider.getHistory(strategyAddress)).slice(1);
  const harvestTxs = history.filter((tx) => {
    const functionSig = abiDecoder.decodeMethod(tx.data);
    return (
      functionSig.name === "harvest" &&
      tx.blockNumber >= startBlock &&
      tx.blockNumber < endBlock
    );
  });

  // get non-failing tx receipts
  const txReceipts = await Promise.all(
    harvestTxs.map((tx) => provider.getTransactionReceipt(tx.hash))
  );
  const nonFailingTxs = txReceipts.filter((x) => x.status !== 0);

  if (isCrv) {
    // psCRV calculation
    const earned = nonFailingTxs.reduce((acc, tx) => {
      const stakedLogDesc = tx.logs
        .map((x) => {
          try {
            y = curveGaugeIFace.parseLog(x);
            return y
          } catch (e) {
            return {
              name: null,
            };
          }
        })
        .filter((x) => x.name === "Deposit")[0];
      return acc.add(
        stakedLogDesc ? stakedLogDesc.args.value : ethers.BigNumber.from(0)
      );
    }, ethers.BigNumber.from(0));

    console.log("LP Tokens Earned", ethers.utils.formatUnits(earned));
  } else {
    // pUNI-X calculation
    const earned = nonFailingTxs.reduce((acc, tx) => {
      const stakingAddresses = [
        "0xa1484C3aa22a66C62b77E0AE78E15258bd0cB711", // eth-dai uni pool
        "0x7FBa4B8Dc5E7616e59622806932DBea72537A56b", // eth-usdc uni pool
        "0x6C3e4cb2E96B01F4b866965A91ed4437839A121a", // eth-usdt uni pool
        "0xCA35e32e7926b96A9988f61d510E038108d8068e", // eth-wbtc uni pool
      ];
      const stakedLogDesc = tx.logs
        .filter((x) => stakingAddresses.includes(x.address))
        .map((x) => uniStakingIFace.parseLog(x))
        .filter((x) => x.name === "Staked")[0];

      if (stakedLogDesc) {
        return acc.add(stakedLogDesc.args.amount);
      }
      return acc;
    }, ethers.BigNumber.from(0));

    console.log("LP Tokens Earned", ethers.utils.formatUnits(earned));
  }
};

const main = async () => {
  console.log("=== Calculating interest earned ===");
  console.log(`Start block: ${startBlock}, endBLock: ${endBlock}`);
  console.log("=== psCRV ===");
  await getInterestEarned("0x1c17C71cD9eD9fb35C4b2B0cCbe46cfAcC85dE0a"); // psCRV
  console.log("=== psRENCRV ===");
  await getInterestEarned("0xa68EAD350155e0BC1264B3aA43aa62Ca3bc443e0"); // crvREN
  console.log("=== p3CRV ===");
  await getInterestEarned("0x42AD7C7fCD4D1B1eCaAC9f14813e0136C7F414Bf"); // pUNIUSDT
  console.log("=== pUNIDAI ===");
  await getInterestEarned("0x99E71Af1d19bC3f1E67D67696354C0df218441bc"); // pUNIDAI
  console.log("=== pUNIUSDC ===");
  await getInterestEarned("0x3191BeCBf4f94c92200d50C6DbFaf84C3043B7f0"); // pUNIUSDC
  console.log("=== pUNIUSDT ===");
  await getInterestEarned("0x228b401eBBb3ec55dd5724c07445549F78F98612"); // pUNIUSDT
  console.log("=== pUNIWBTC ===");
  await getInterestEarned("0xdCBA1A2A4977bc4A3fF20C85e9CA155dfA17B341"); // pUNIUSDT
};

main();
