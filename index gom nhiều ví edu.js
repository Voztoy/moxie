const { ethers } = require('ethers');
const colors = require('colors');
const xlsx = require('xlsx');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

// Cấu hình mạng Open Campus
const NETWORK_CONFIG = {
  name: "Open Campus",
  rpcUrl: "https://rpc.open-campus-codex.gelato.digital",
  chainId: 656476,
  symbol: "EDU",
  explorer: "https://opencampus-codex.blockscout.com",
};

async function retry(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(
        colors.yellow(`⚠️ Error occurred. Retrying... (${i + 1}/${maxRetries})`)
      );
      await sleep(delay);
    }
  }
}

const main = async () => {
  console.log(colors.green(`🔗 Starting the transaction process on ${NETWORK_CONFIG.name} network...\n`));

  // Load Excel file
  const workbook = xlsx.readFile('data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Extract rows starting from the 2nd row (skip header)
  const transactions = data.slice(1).map((row) => ({
    privateKey: row[0],
    senderAddress: row[1],
    balance: row[3], // Cột D (số dư EDU)
    targetAddress: row[4], // Cột E (ví gom)
  }));

  const provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

  for (const txData of transactions) {
    const { privateKey, balance, targetAddress } = txData;

    if (!privateKey || !balance || !targetAddress) {
      console.log(colors.red(`❌ Missing data in row: ${JSON.stringify(txData)}`));
      continue;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const senderAddress = wallet.address;

    console.log(colors.cyan(`💼 Processing transaction from address: ${senderAddress}`));

    let senderBalance;
    try {
      senderBalance = await retry(() => provider.getBalance(senderAddress));
    } catch (error) {
      console.log(colors.red(`❌ Failed to check balance for ${senderAddress}. Skipping.`));
      continue;
    }

    console.log(colors.blue(`💰 On-chain Balance: ${ethers.utils.formatUnits(senderBalance, 'ether')} ${NETWORK_CONFIG.symbol}`));

    const eduToSend = ethers.utils.parseUnits(balance.toString(), 'ether');
    if (senderBalance.lt(eduToSend)) {
      console.log(colors.red('❌ Insufficient on-chain balance. Skipping to the next address.'));
      continue;
    }

    let nonce;
    try {
      nonce = await provider.getTransactionCount(senderAddress, 'pending');
    } catch (error) {
      console.log(colors.red(`❌ Failed to fetch nonce for ${senderAddress}. Skipping.`));
      continue;
    }

    const transaction = {
      to: targetAddress,
      value: eduToSend, // Chuyển số dư EDU (cột D)
      gasLimit: 21000000,
      gasPrice: await provider.getGasPrice(),
      nonce,
      chainId: NETWORK_CONFIG.chainId,
    };

    let tx;
    try {
      tx = await retry(() => wallet.sendTransaction(transaction));
    } catch (error) {
      console.log(colors.red(`❌ Failed to send transaction: ${error.message}`));
      continue;
    }

    console.log(colors.green(`✅ Transaction Sent:`));
    console.log(colors.green(`  Hash: ${tx.hash}`));

    let receipt;
    try {
      receipt = await retry(() => provider.waitForTransaction(tx.hash));
      if (receipt && receipt.status === 1) {
        console.log(colors.green(`✅ Transaction Success!`));
        console.log(colors.green(`  Block Number: ${receipt.blockNumber}`));
        console.log(colors.green(`  Gas Used: ${receipt.gasUsed.toString()}`));
        console.log(colors.green(`  Explorer Link: ${NETWORK_CONFIG.explorer}/tx/${tx.hash}`));
      } else {
        console.log(colors.red('❌ Transaction FAILED.'));
      }
    } catch (error) {
      console.log(colors.red(`❌ Error fetching transaction receipt.`));
    }

    console.log();
    await sleep(500); // Optional delay between transactions
  }

  console.log(colors.green('✅ All transactions completed.'));
  process.exit(0);
};

main().catch((error) => {
  console.error(colors.red('🚨 An unexpected error occurred:'), error);
  process.exit(1);
});
