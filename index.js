const { ethers } = require('ethers');
const colors = require('colors');
const fs = require('fs');
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

  // Read private keys and contract-hex pairs
  const privateKeys = data.slice(2).map((row) => row[0]).filter(Boolean);

  // Get the number of transactions for each contract column
  const txCounts = {
    B: data[1][1], // B2
    D: data[1][3], // D2
    F: data[1][5], // F2
    J: data[1][9], // J2
    L: data[1][11], // L2
    N: data[1][13], // N2
    T: data[1][19], // T2
    V: data[1][21], // V2
  };

  // Generate contract-hex pairs for each column
  const contractHexPairs = {
    B: data.slice(2).map((row) => [row[1], row[2]]).filter(([contract, hex]) => contract && hex), // B-C
    D: data.slice(2).map((row) => [row[3], row[4]]).filter(([contract, hex]) => contract && hex), // D-E
    F: data.slice(2).map((row) => [row[5], row[6]]).filter(([contract, hex]) => contract && hex), // F-G
    J: data.slice(2).map((row) => [row[9], row[10]]).filter(([contract, hex]) => contract && hex), // J-K
    L: data.slice(2).map((row) => [row[11], row[12]]).filter(([contract, hex]) => contract && hex), // L-M
    N: data.slice(2).map((row) => [row[13], row[14]]).filter(([contract, hex]) => contract && hex), // N-O
    T: data.slice(2).map((row) => [row[19], row[20]]).filter(([contract, hex]) => contract && hex), // T-U
    V: data.slice(2).map((row) => [row[21], row[22]]).filter(([contract, hex]) => contract && hex), // V-W
  };

  if (privateKeys.length === 0) {
    console.log(colors.red('❌ No private keys found in the Excel file.'));
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const wallet = new ethers.Wallet(privateKey, provider);
    const senderAddress = wallet.address;

    console.log(colors.cyan(`💼 Processing transactions for address: ${senderAddress}`));

    let senderBalance;
    try {
      senderBalance = await retry(() => provider.getBalance(senderAddress));
    } catch (error) {
      console.log(colors.red(`❌ Failed to check balance for ${senderAddress}. Skipping.`));
      continue;
    }

    console.log(colors.blue(`💰 Balance: ${ethers.utils.formatUnits(senderBalance, 'ether')} ${NETWORK_CONFIG.symbol}`));

    if (senderBalance.lt(ethers.utils.parseUnits('0.0001', 'ether'))) {
      console.log(colors.red('❌ Insufficient balance. Skipping to the next address.'));
      continue;
    }

    let nonce;
    try {
      nonce = await provider.getTransactionCount(senderAddress, 'pending');
    } catch (error) {
      console.log(colors.red(`❌ Failed to fetch nonce. Skipping.`));
      continue;
    }

    // For each column B, D, F, J, L, N, T, V, send random transactions
    for (const [column, pairs] of Object.entries(contractHexPairs)) {
      const txCount = txCounts[column] || 1; // Get transaction count for the column (from B2, D2, etc.)

      // Randomly shuffle the contract-hex pairs
      const randomPairs = shuffle(pairs);

      console.log(colors.white(`\n💼 Sending random transaction(s) for column ${column} to contract addresses`));

      // Send a random number of transactions (up to txCount) from shuffled contract-hex pairs
      const randomTxCount = Math.floor(Math.random() * txCount) + 1; // Random number of transactions

      for (let k = 0; k < randomTxCount; k++) {
        const [contractAddress, dataHex] = randomPairs[k % randomPairs.length]; // Ensure we don't exceed available pairs

        const transaction = {
          to: contractAddress,
          value: ethers.utils.parseUnits('0', 'ether'),
          data: dataHex,
          gasLimit: 50000000,
          gasPrice: await provider.getGasPrice(),
          nonce: nonce++,
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
    }

    console.log(colors.green(`✅ Finished processing for address: ${senderAddress}\n`));
  }

  console.log(colors.green('✅ All transactions completed.'));
  process.exit(0);
};

// Helper function to shuffle an array (randomize order)
function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

main().catch((error) => {
  console.error(colors.red('🚨 An unexpected error occurred:'), error);
  process.exit(1);
});
