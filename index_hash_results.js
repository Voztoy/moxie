const { ethers } = require("ethers");
const xlsx = require("xlsx");
const fs = require("fs");

async function sendTransactionRow(row) {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
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
        maxPriorityFeePerGas: ethers.utils.parseUnits("0.000005", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("0.1", "gwei"),
    };

    try {
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`Transaction Hash for wallet ${wallet.address}:`, txResponse.hash);
        return txResponse.hash;
    } catch (error) {
        console.error(`Error sending transaction for wallet ${wallet.address}:`, error);
        return "Error";
    }
}

async function sendTransaction() {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
    
    const workbook = xlsx.readFile("data.xlsx");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const rows = data.slice(1); // Bỏ dòng tiêu đề

    let results = [data[0].concat(["Transaction Hash"])] // Tiêu đề mới với cột E
    
    for (let i = 0; i < rows.length; i++) {
        console.log(`Processing transaction ${i + 1}`);
        const txHash = await sendTransactionRow(rows[i]);
        results.push(rows[i].concat([txHash]));
    }
    
    // Ghi kết quả vào results.xlsx
    const newSheet = xlsx.utils.aoa_to_sheet(results);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Results");
    xlsx.writeFile(newWorkbook, "results.xlsx");

    console.log("Results saved to results.xlsx");
}

sendTransaction();
