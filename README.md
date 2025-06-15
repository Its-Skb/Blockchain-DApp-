# 🔐 Decentralized File Sharing DApp

A decentralized application (DApp) built with **Hardhat**, **IPFS**, and **Ethereum smart contracts** to securely upload, register, and share files using blockchain technology. The DApp uses **MetaMask** for authentication and **React** for the user interface.

---

## 🚀 Features

- 🔗 Upload files and store them on **IPFS**
- 📝 Register and track file metadata using **Ethereum smart contracts**
- 🧾 View history of uploads, modifications, and downloads
- 🦊 Authenticate and sign transactions via **MetaMask**
- 🌐 Intuitive frontend built with **React**

---

## 🧰 Tech Stack

| Layer        | Technology                      |
|--------------|----------------------------------|
| Smart Contract | Solidity, Hardhat              |
| Blockchain    | Ethereum (Local via Hardhat/Ganache) |
| Storage       | IPFS (via Pinata or API)        |
| Frontend      | React, HTML, CSS, JavaScript    |
| Wallet        | MetaMask                        |
| Tools         | Hardhat, Ethers.js, IPFS API    |

---

## 🧑‍💻 Getting Started

### ⚙️ Prerequisites

- Node.js and npm
- MetaMask browser extension
- Ganache GUI or Hardhat local node
- IPFS or Pinata account

---

```markdown
### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Its-Skb/Blockchain-DApp-.git
cd Blockchain-DApp-

# Install backend (Hardhat) dependencies
npm install

# Go to frontend directory and install frontend dependencies
cd frontend
npm install
```

---

### 🔨 Compile and Deploy Contracts

```bash
# From the root directory
npx hardhat compile

# Start local node (optional)
npx hardhat node

# Deploy the contract to the local Hardhat network
npx hardhat run scripts/deploy.js --network localhost
```

---

### 🧬 Connect Frontend with Contracts
Make sure your deployed contract's address and ABI are saved in a JSON file like contract-config.json in your frontend src/ folder.

Example structure:
```bash
{
  "address": "0xYourContractAddress",
  "abi": [ ... ]
}
```

---

### 🖥️ Run the Frontend

```bash
cd frontend
npm start
Open http://localhost:3000 and connect your MetaMask wallet to the local network.
```

---

## 🖼️ Screenshots

### Blockchain Dapp
![DApp Main Interface](screenshots/Blockchain%20DApp.png)

### Ganache GUI
![Ganache App GUI](screenshots/Ganache%20GUI.png)

### Blocks Mined
![Blocks Mined](screenshots/Blocks%20Mined.png)

### Transaction Details
![Transaction of the process](screenshots/Transaction%20Details.png)

---