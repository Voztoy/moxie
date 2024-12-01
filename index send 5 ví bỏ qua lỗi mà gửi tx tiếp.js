const { ethers } = require('ethers');
const colors = require('colors');
const fs = require('fs');
const xlsx = require('xlsx');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cấu hình mạng Open Campus
const NETWORK_CONFIG = {
  name: "Open Campus",
  rpcUrl: "https://rpc.open-campus-codex.gelato.digital",
  chainId: 656476,
  symbol: "EDU",
  explorer: "https://opencampus-codex.blockscout.com",
};

const main = async () => {
  console.log(colors.green(`🔗 Starting the transaction process on ${NETWORK_CONFIG.name} network...\n`));

  // Load Excel file
  const workbook = xlsx.readFile('data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Read private keys and contract-hex pairs
  const privateKeys = data.slice(2).map((row) => row[0]).filter(Boolean);

  // Get the number of cycles for each contract column
  const txCounts = {
    B: parseInt(data[1][1] || 1), // B2
    D: parseInt(data[1][3] || 1), // D2
    F: parseInt(data[1][5] || 1), // F2
    J: parseInt(data[1][9] || 1), // J2
    L: parseInt(data[1][11] || 1), // L2
    N: parseInt(data[1][13] || 1), // N2
    T: parseInt(data[1][19] || 1), // T2
    V: parseInt(data[1][21] || 1), // V2
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

  // Split private keys into batches of 5
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < privateKeys.length; i += batchSize) {
    batches.push(privateKeys.slice(i, i + batchSize));
  }

  // Loop through each column (B, D, F, ...)
  for (const [column, cycles] of Object.entries(txCounts)) {
    const pairs = contractHexPairs[column];
    if (!pairs.length) continue; // Skip if no contract-hex pairs exist for the column

    console.log(colors.blue(`🔄 Starting transactions for column: ${column}`));
    console.log(colors.blue(`🔁 Total cycles: ${cycles}`));

    for (let cycle = 0; cycle < cycles; cycle++) {
      console.log(colors.magenta(`🔄 Cycle ${cycle + 1} / ${cycles}`));

      // Process each batch
      for (const batch of batches) {
        console.log(colors.magenta(`🔄 Processing batch with ${batch.length} wallets`));

        await Promise.all(
          batch.map(async (privateKey) => {
            const wallet = new ethers.Wallet(privateKey, provider);
            const senderAddress = wallet.address;

            console.log(colors.cyan(`💼 Processing wallet: ${senderAddress}`));

            let senderBalance;
            try {
              senderBalance = await provider.getBalance(senderAddress);
              console.log(
                colors.blue(`💰 Balance: ${ethers.utils.formatUnits(senderBalance, 'ether')} ${NETWORK_CONFIG.symbol}`)
              );
            } catch (error) {
              console.log(colors.red(`❌ Failed to fetch balance for ${senderAddress}. Skipping.`));
              return;
            }

            if (senderBalance.lt(ethers.utils.parseUnits('0.0001', 'ether'))) {
              console.log(colors.red('❌ Insufficient balance. Skipping this wallet.'));
              return;
            }

            // Send random transactions
            const [contractAddress, dataHex] = pairs[Math.floor(Math.random() * pairs.length)];
            const transaction = {
              to: contractAddress,
              value: ethers.utils.parseUnits('0', 'ether'),
              data: dataHex,
              gasLimit: 50000000,
              gasPrice: await provider.getGasPrice(),
              nonce: await provider.getTransactionCount(senderAddress, 'pending'),
              chainId: NETWORK_CONFIG.chainId,
            };

            try {
              const tx = await wallet.sendTransaction(transaction);
              console.log(colors.green(`✅ Transaction Sent. Hash: ${tx.hash}`));

              const receipt = await provider.waitForTransaction(tx.hash);
              if (receipt && receipt.status === 1) {
                console.log(colors.green(`✅ Transaction Success! Block Number: ${receipt.blockNumber}`));
              } else {
                console.log(colors.red('❌ Transaction FAILED.'));
              }
            } catch (error) {
              console.log(colors.red(`❌ Failed to send transaction for ${senderAddress}: ${error.message}`));
            }
          })
        );

        await sleep(1000); // Optional delay between batches
      }
    }

    console.log(colors.green(`✅ Completed transactions for column: ${column}`));
  }

  console.log(colors.green('✅ All transactions completed.'));
  process.exit(0);
};

main().catch((error) => {
  console.error(colors.red('🚨 An unexpected error occurred:'), error);
  process.exit(1);
});
