# moxie auto buy

Cài Node js

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/voztoy/moxie.git
   cd moxie
   ```

2. Install the necessary packages:

   ```bash
   npm install
   npm install ethers@5
   npm install xlsx
   ```
3.  Configuration data.xlsx
Thay privatekey từ ô A2 trở xuống
Copy thay thế hex vào D


### Usage

Run the script for random address generation and transactions:

   ```bash
   npm start
   ```


### Contribution


## Donations

0xADE4FBED97eF37F3BfbaF36B575a1B114DA92155

### Other chain

Tương tự send transaction các mạng khác thì set lại file index.js và data.xlsx


1. Thay đổi các dữ liệu trong Index.js

+ Đổi RPC trong Index.js
   ```bash
const provider = new ethers.providers.JsonRpcProvider("https://base.llamarpc.com");// Thay thế bằng rpc mạng cần chơi
   ```

+ Nếu rpc khoẻ thì thay đỏi số lần gửi tx mỗi lần:
const batchSize = 2;// số tx mỗi batch

+ Cài phí hợp lý (kiểm tra kỹ các giao dịch đã làm trước đó)
       const tx = {
            to: contractAddress,
            value: 0,// tuỳ giao dịch nếu muốn gửi eth thì thay thế ở đây.
            data: hexData,
            gasLimit: 400000,// số gas tối đa cho giao dịch
            maxPriorityFeePerGas: ethers.utils.parseUnits("0.000001", "gwei"),// Phí tối thiểu
            maxFeePerGas: ethers.utils.parseUnits("0.006", "gwei"),// Phí tôi đa
  2. Thay đổi trong data.xlsx

   -  File data.xlsx chứa các giữ liệu mà file index cần chạy.
     
   -   Nghĩa chung là: Sử dụng privatekey ở cột A (adress tương ứng là cột B) gửi 1 giao dịch tương ứng tới contract cột C (hoặc ví bất kỳ) kèm hexdata ở cột D

   -  Chỉ gửi tx được với các giao dịch có hexdata đơn giản, như gửi tx tới ví mình hoặc ví bất kỳ, gửi giao dịch 0 (hoặc có số dư) đến contract cố định để nhận gì đó.     
  
