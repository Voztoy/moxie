const { ethers } = require("ethers");
const xlsx = require("xlsx");

async function sendErc20Tokens() {
    // Kết nối tới provider
    const provider = new ethers.providers.JsonRpcProvider("https://developer-access-mainnet.base.org");

    // ABI đầy đủ cho transfer và decimals
    const ERC20_ABI = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() public view returns (uint8)"
    ];

    // Đọc tệp Excel
    const workbook = xlsx.readFile('data.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Tùy chỉnh phí giao dịch
    const gasLimit = ethers.utils.hexlify(130000); // Giới hạn gas, mặc định 500,000
    const maxPriorityFeePerGas = ethers.utils.parseUnits("0.02", "gwei"); // Phí ưu tiên, chỉnh tay
    const maxFeePerGas = ethers.utils.parseUnits("0.1", "gwei"); // Phí tối đa, chỉnh tay

    // Lặp qua các dòng trong tệp Excel (bỏ dòng tiêu đề)
    for (let i = 1; i < data.length; i++) {
        const privkey = data[i][0]; // Cột A: private key
        const contractAddress = data[i][1]; // Cột B: ERC20 contract address
        const recipientAddress = data[i][2]; // Cột C: recipient address
        const amount = data[i][3]; // Cột D: amount to send

        // Tạo wallet từ private key
        const wallet = new ethers.Wallet(privkey, provider);

        // Tạo contract instance
        const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);

        try {
            // Chuyển số lượng token sang đơn vị wei
            const decimals = await tokenContract.decimals(); // Lấy số chữ số thập phân
            const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);

            // Tạo giao dịch
            const tx = await tokenContract.populateTransaction.transfer(recipientAddress, amountInWei);

            // Thêm phí giao dịch tùy chỉnh
            tx.gasLimit = gasLimit;
            tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
            tx.maxFeePerGas = maxFeePerGas;

            // Gửi giao dịch
            const txResponse = await wallet.sendTransaction(tx);
            console.log(`Transaction Hash for wallet ${wallet.address}:`, txResponse.hash);

            // Đợi giao dịch hoàn tất
            const receipt = await txResponse.wait();
            console.log("Transaction Receipt:", receipt);
        } catch (error) {
            console.error(`Error sending tokens for wallet ${wallet.address}:`, error);
        }
    }
}

sendErc20Tokens();
