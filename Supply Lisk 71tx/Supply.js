const { ethers } = require("ethers");
const xlsx = require("xlsx");

async function sendTransaction() {
    // Kết nối tới provider
    const provider = new ethers.providers.JsonRpcProvider("https://lisk.drpc.org");

    // Đọc tệp Excel
    const workbook = xlsx.readFile('data.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Lặp qua các dòng trong tệp Excel (bỏ dòng tiêu đề)
    for (let i = 1; i < data.length; i++) {
        const privkey = data[i][0]; // Cột A: private key
        const contractAddress = data[i][2]; // Cột C: smart contract address
        const hexData = data[i][3]; // Cột D: hex data

        // Tạo wallet từ private key
        const wallet = new ethers.Wallet(privkey, provider);

        // Dữ liệu giao dịch
        const tx = {
            to: contractAddress, // Địa chỉ smart contract từ cột C
            value: 0, // Không gửi ETH, chỉ gửi token
            data: hexData, // Hex data từ cột D
            gasLimit: 600000, // Giới hạn gas, có thể điều chỉnh nếu cần
            maxPriorityFeePerGas: ethers.utils.parseUnits("0.0001", "gwei"), // Phí ưu tiên
            maxFeePerGas: ethers.utils.parseUnits("0.000205872", "gwei"), // Phí tối đa
        };

        try {
            const txResponse = await wallet.sendTransaction(tx);
            console.log(`Transaction Hash for wallet ${wallet.address}:`, txResponse.hash);
            const receipt = await txResponse.wait();
            console.log("Transaction Receipt:", receipt);
        } catch (error) {
            console.error(`Error sending transaction for wallet ${wallet.address}:`, error);
        }
    }
}

sendTransaction();
