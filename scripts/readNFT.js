const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const contractAddress = "0xd9C475CA2c753A537f66b3e76D0458384a48aFB8";

  const DatasetNFT = await hre.ethers.getContractFactory("DatasetNFT");
  const contract = DatasetNFT.attach(contractAddress);

  const totalMinted = await contract.tokenCounter();

  // Convert to number (handle BigInt if needed)
  const total = parseInt(totalMinted.toString());
  console.log(`🔢 Total NFTs minted: ${total}`);

  if (total === 0) {
    console.log("⚠️ No NFTs minted yet.");
    return;
  }

  const tokenId = total - 1;
  const uri = await contract.tokenURI(tokenId);
  const owner = await contract.ownerOf(tokenId);

  console.log(`📦 Token URI of ID ${tokenId}: ${uri}`);
  console.log(`👤 Owner of token ID ${tokenId}: ${owner}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
