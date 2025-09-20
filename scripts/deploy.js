const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying with account:", deployer.address);

  const DatasetNFT = await ethers.getContractFactory("DatasetNFT");
  const contract = await DatasetNFT.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ Contract deployed to:", contractAddress);

  // Save to frontend
  const frontendPath = path.join(__dirname, "../src/abi/DatasetNFT.json");
  const artifact = await artifacts.readArtifact("DatasetNFT");
  
  const data = {
    address: contractAddress,
    abi: artifact.abi
  };

  fs.writeFileSync(frontendPath, JSON.stringify(data, null, 2));
  console.log("📦 ABI and address saved to:", frontendPath);

  // Also save to backend for reference
  const backendPath = path.join(__dirname, "../deployed.json");
  fs.writeFileSync(backendPath, JSON.stringify({
    network: "ganache",
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  }, null, 2));
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});