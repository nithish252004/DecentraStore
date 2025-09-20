# 🛒 DecentraStore – Decentralized Data & Model Marketplace  

## 📌 Introduction  
DecentraStore is a **decentralized marketplace** built using **Ethereum, NFTs, and IPFS** where users can:  
- Mint their **datasets / AI models / research files** as NFTs.  
- Buy & sell these NFTs in a transparent marketplace.  
- Ensure **royalties** are automatically paid to the original creator on every resale.  
- Store files securely using **IPFS + Pinata** instead of centralized servers.  

---

## 🎯 Motivation  
Today, datasets and AI models are usually stored in **centralized platforms (Google Drive, Dropbox, Kaggle, HuggingFace)**.  
Problems with this:  
- ❌ Risk of data tampering.  
- ❌ No guarantee of ownership.  
- ❌ Creators rarely earn from resale/reuse of their work.  

With **DecentraStore**:  
- ✅ Ownership is tracked on blockchain via NFTs.  
- ✅ Files are stored securely on IPFS (tamper-proof).  
- ✅ Automatic **royalty mechanism** ensures creators earn every time their file is resold.  

---

## 🏗️ System Design (High-Level)
1. **User Uploads File** → Stored on **IPFS** via Pinata.  
2. **Metadata Created** → File link + description pinned to IPFS.  
3. **Smart Contract (DatasetNFT.sol)** →  
   - Mints NFT linked to metadata.  
   - Handles listing, buying, selling.  
   - Distributes royalties.  
4. **Frontend (React + Ethers.js)** →  
   - Wallet connection via MetaMask.  
   - Upload + Mint + Buy + Sell UI.  
   - Fetches NFT details live from blockchain.  
5. **Ganache** → Local Ethereum test blockchain for development & testing.  

---

## ⚙️ Tech Stack  
- **Frontend**: React.js, Vite, Ethers.js  
- **Smart Contracts**: Solidity + Hardhat  
- **Storage**: IPFS + Pinata  
- **Blockchain**: Ethereum (tested with Ganache + MetaMask)  
- **Royalties**: ERC-2981 standard  

## 🛠️ How to Run Locally  
1. Clone repo:  
   ```bash
   git clone https://github.com/your-username/decentrastore.git
   cd decentrastore
   ```  
2. Install dependencies:  
   ```bash
   npm install
   ```  
3. Start Ganache (local blockchain).  
4. Deploy smart contract:  
   ```bash
   npx hardhat run scripts/deploy.js --network ganache
   ```  
5. Start frontend:  
   ```bash
   npm run dev
   ```  
6. Open browser → `http://localhost:5173`  


✨ My vision is to make **data and AI models truly decentralized, tamper-proof, and creator-friendly**.  
Done by Nithish Karthik Thangaraj
