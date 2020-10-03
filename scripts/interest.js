const { ethers } = require("ethers");

const abiDecoder = require("abi-decoder");
const contracts = require("./contracts");
abiDecoder.addABI(require("../ABIs/psCRVStrategy.json"));
abiDecoder.addABI(require("../ABIs/pUNIStrategy.json"));

const curveRewardsIFace = new ethers.utils.Interface(
  require("../ABIs/CurveRewards.json"),
);
const uniStakingIFace = new ethers.utils.Interface(
  require("../ABIs/UniStaking.json"),
);

const provider = new ethers.providers.EtherscanProvider(1);

const getInterestEarned = async (strategyAddress) => {
  const snapshotBlock = 10959415;
  const isPsCRV =
    strategyAddress === "0xE0f887aa435Bcce11bA3836FEAA82a05f860898E";

  // get transactions
  const history = (await provider.getHistory(strategyAddress)).slice(1);
  const harvestTxs = history.filter((tx) => {
    const functionSig = abiDecoder.decodeMethod(tx.data);
    return functionSig.name === "harvest" && tx.blockNumber >= snapshotBlock;
  });

  // get non-failing tx receipts
  const txReceipts = await Promise.all(
    harvestTxs.map((tx) => provider.getTransactionReceipt(tx.hash)),
  );
  const nonFailingTxs = txReceipts.filter((x) => x.status !== 0);

  if (isPsCRV) {
    // psCRV calculation
    const CurveRewardsAddress = "0xDCB6A51eA3CA5d3Fd898Fd6564757c7aAeC3ca92";
    const earned = nonFailingTxs.reduce((acc, tx) => {
      const stakedLogDesc = tx.logs
        .filter((x) => x.address === CurveRewardsAddress)
        .map((x) => curveRewardsIFace.parseLog(x))
        .filter((x) => x.name === "Staked")[0];
      return acc.add(stakedLogDesc.args.amount);
    }, ethers.BigNumber.from(0));

    console.log("LP Tokens Earned", ethers.utils.formatUnits(earned));
  } else {
    // pUNI-X calculation
    const earned = nonFailingTxs.reduce((acc, tx) => {
      const stakingAddresses = [
        "0xa1484C3aa22a66C62b77E0AE78E15258bd0cB711", // eth-dai uni pool
        "0x7FBa4B8Dc5E7616e59622806932DBea72537A56b", // eth-usdc uni pool
        "0x6C3e4cb2E96B01F4b866965A91ed4437839A121a", // eth-usdt uni pool
      ];
      const stakedLogDesc = tx.logs
        .filter((x) => stakingAddresses.includes(x.address))
        .map((x) => uniStakingIFace.parseLog(x))
        .filter((x) => x.name === "Staked")[0];

      return acc.add(stakedLogDesc.args.amount);
    }, ethers.BigNumber.from(0));

    console.log("LP Tokens Earned", ethers.utils.formatUnits(earned));
  }
};

const main = async () => {
  console.log("=== psCRV ===");
  await getInterestEarned("0xE0f887aa435Bcce11bA3836FEAA82a05f860898E"); // psCRV
  console.log("=== pUNIDAI ===");
  await getInterestEarned("0xE335400d7b046587989E47bd85ae1e43ABAdD453"); // pUNIDAI
  console.log("=== pUNIUSDC ===");
  await getInterestEarned("0xCBEcd4d8c8eF80377f019ADdb8f071e9B034303c"); // pUNIUSDC
  console.log("=== pUNIUSDT ===");
  await getInterestEarned("0x88DFC02Fcb034E7986B12173d0c852934f6C8C01"); // pUNIUSDT
};

main();
