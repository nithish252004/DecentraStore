const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // ✅ Fix: Remove extra space before address
  const contractAddress = "0xd9C475CA2c753A537f66b3e76D0458384a48aFB8";

  // ✅ Get contract factory (not deployed again)
  const DatasetNFT = await hre.ethers.getContractFactory("DatasetNFT");

  // ✅ Attach to existing deployed contract
  const contract = DatasetNFT.attach(contractAddress);

  // ✅ Optional: Check that contract is connected to signer
  console.log("Connected as:", deployer.address);

  // ✅ Mint an NFT (update with your actual CID)
  const tx = await contract.mintNFT(deployer.address, "ipfs://bafybeibwzifozr3nupzj72nrf26xk7ydq3az5j45ejsqbl5cg2qpew7aai"
);

  console.log("⏳ Waiting for transaction to confirm...");
  await tx.wait();

  console.log(`✅ NFT minted to: ${deployer.address}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
