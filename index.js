const { ethers } = require("ethers");
const xlsx = require("xlsx");

async function sendTransactionBatch(batch) {
    const provider = new ethers.providers.JsonRpcProvider("https://developer-access-mainnet.base.org");

    // Thực hiện các giao dịch trong batch
    const promises = batch.map(async (row) => {
        const privkey = row[0]; // Cột A: private key
        const contractAddress = row[2]; // Cột C: smart contract address
        const hexData = row[3]; // Cột D: hex data

        // Tạo wallet từ private key
        const wallet = new ethers.Wallet(privkey, provider);

        // Dữ liệu giao dịch
        const tx = {
            to: contractAddress,
            value: 0,
            data: hexData,
            gasLimit: 400000,
            maxPriorityFeePerGas: ethers.utils.parseUnits("0.000001", "gwei"),
            maxFeePerGas: ethers.utils.parseUnits("0.006", "gwei"),
        };

        try {
            const txResponse = await wallet.sendTransaction(tx);
            console.log(`Transaction Hash for wallet ${wallet.address}:`, txResponse.hash);
        } catch (error) {
            console.error(`Error sending transaction for wallet ${wallet.address}:`, error);
        }
    });

    // Chờ tất cả giao dịch trong batch hoàn thành
    await Promise.all(promises);
}

async function sendTransaction() {
    const provider = new ethers.providers.JsonRpcProvider("https://base.llamarpc.com");

    const workbook = xlsx.readFile("data.xlsx");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const rows = data.slice(1);

    const batchSize = 2;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}`);
        await sendTransactionBatch(batch);
    }
}

sendTransaction();
