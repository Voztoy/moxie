const { ethers } = require('ethers');
const colors = require('colors');
const fs = require('fs');
const xlsx = require('xlsx');

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  console.log(colors.green(`🔗 Starting balance check on ${NETWORK_CONFIG.name} network...\n`));

  // Load Excel file
  const workbook = xlsx.readFile('data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Read private keys
  const privateKeys = data.slice(2).map((row) => row[0]).filter(Boolean);

  if (privateKeys.length === 0) {
    console.log(colors.red('❌ No private keys found in the Excel file.'));
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

  // Create an array of promises to check balances in parallel
  const balancePromises = privateKeys.map(async (privateKey, index) => {
    const wallet = new ethers.Wallet(privateKey, provider);
    const senderAddress = wallet.address;

    console.log(colors.cyan(`💼 Checking balance for address: ${senderAddress}`));

    let senderBalance;
    try {
      senderBalance = await retry(() => provider.getBalance(senderAddress));
    } catch (error) {
      console.log(colors.red(`❌ Failed to check balance for ${senderAddress}. Skipping.`));
      return null; // Return null in case of error
    }

    console.log(colors.blue(`💰 Balance: ${ethers.utils.formatUnits(senderBalance, 'ether')} ${NETWORK_CONFIG.symbol}`));

    if (senderBalance.lt(ethers.utils.parseUnits('0.0001', 'ether'))) {
      console.log(colors.red('❌ Insufficient balance.'));
    }

    // Update Excel data (write balance in column D)
    data[index + 2][3] = ethers.utils.formatUnits(senderBalance, 'ether'); // Column D

    console.log(colors.green(`✅ Balance checked for address: ${senderAddress}\n`));
  });

  // Wait for all balance checks to finish
  await Promise.all(balancePromises);

  // Write updated data to a new Excel file
  const newWorkbook = xlsx.utils.book_new();
  const newSheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  xlsx.writeFile(newWorkbook, 'sodu.xlsx');

  console.log(colors.green('✅ All balances have been checked and saved to sodu.xlsx.'));
  process.exit(0);
};

main().catch((error) => {
  console.error(colors.red('🚨 An unexpected error occurred:'), error);
  process.exit(1);
});
