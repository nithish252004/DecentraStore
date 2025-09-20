import { useState, useEffect } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import axios from "axios";
import { 
  Upload, 
  ShoppingCart, 
  Code,
  User,
  Check,
  X,
  DollarSign,
  Sparkles,
  Shield,
  Coins,
  ExternalLink,
  Plus,
  Grid,
  List,
  Image as ImageIcon,
  Trash2
} from "lucide-react";
import DatasetNFT from "./abi/DatasetNFT.json";
import './App.css';

const CONTRACT_ADDRESS = "0xd71c9Ffb35F9f8936D4da5A3016fc99c7140dDec";
const CONTRACT_ABI = DatasetNFT.abi;

const PINATA_API_KEY = "af78f804291743afdd7a";
const PINATA_API_SECRET = "7164d53c5ba0069cafe0fe548507f493775da7a8c8864295df7106fa93b57132";

function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [mintForm, setMintForm] = useState({
    name: "",
    description: "",
    file: null,
    fileName: ""
  });
  const [listingPrices, setListingPrices] = useState({});
  const [loading, setLoading] = useState({
    mint: false,
    list: false,
    buy: false,
    cancel: false,
    approve: false,
    connect: false,
    delete: false
  });
  const [activeTab, setActiveTab] = useState("features");
  const [viewMode, setViewMode] = useState("grid");

  // Connect Wallet + Contract
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, connect: true }));
      const provider = new BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const nftContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setCurrentAccount(address);
      setContract(nftContract);
      fetchNFTs(nftContract);
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Connection error:", err);
      alert("Failed to connect: " + err.message);
    } finally {
      setLoading(prev => ({ ...prev, connect: false }));
    }
  };

  // Upload to IPFS
  const uploadToIPFS = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({ name: file.name });
    const options = JSON.stringify({ cidVersion: 0 });

    formData.append("pinataMetadata", metadata);
    formData.append("pinataOptions", options);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          "Content-Type": `multipart/form-data`,
          "pinata_api_key": PINATA_API_KEY,
          "pinata_secret_api_key": PINATA_API_SECRET,
        },
      }
    );

    return `ipfs://${res.data.IpfsHash}`;
  };

  const uploadMetadataToIPFS = async (codeFileURI) => {
    const metadata = { 
      name: mintForm.name, 
      description: mintForm.description, 
      code_file: codeFileURI,
      attributes: [
        {
          trait_type: "File Type",
          value: mintForm.fileName.split('.').pop() || "unknown"
        },
        {
          trait_type: "File Size",
          value: mintForm.file ? `${(mintForm.file.size / 1024).toFixed(2)} KB` : "unknown"
        }
      ]
    };
    
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "pinata_api_key": PINATA_API_KEY,
          "pinata_secret_api_key": PINATA_API_SECRET,
        },
      }
    );
    
    return `ipfs://${res.data.IpfsHash}`;
  };

  // Mint NFT
  const mintNFT = async () => {
    if (!mintForm.file || !mintForm.name) {
      alert("Project name and code file are required");
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, mint: true }));
      
      // Upload code file to IPFS
      const codeFileURI = await uploadToIPFS(mintForm.file);
      
      const metadataURI = await uploadMetadataToIPFS(codeFileURI);

      const tx = await contract.mintNFT(currentAccount, metadataURI, 500);
      await tx.wait();

      alert("✅ NFT minted successfully!");
      setMintForm({ 
        name: "", 
        description: "", 
        file: null, 
        fileName: ""
      });
      fetchNFTs();
      
      // Ask user if they want to list in marketplace
      if (window.confirm("🎉 NFT minted successfully! Would you like to list it in the marketplace?")) {
        setActiveTab("marketplace");
      }
    } catch (err) {
      console.error("Minting error:", err);
      alert("Minting failed: " + (err.reason || err.message));
    } finally {
      setLoading(prev => ({ ...prev, mint: false }));
    }
  };

  // Delete NFT (Burn token) - FIXED VERSION
  const deleteNFT = async (tokenId) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(prev => ({ ...prev, delete: true }));
      
      // Convert tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      
      // Check if the user owns the token
      const owner = await contract.ownerOf(tokenIdBigInt);
      if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
        alert("You don't own this NFT");
        return;
      }

      // Check if the token is listed
      const listing = await contract.listings(tokenIdBigInt);
      if (listing.price > 0) {
        alert("Cannot delete a listed NFT. Please cancel the listing first.");
        return;
      }

      // Use the standard burn function from ERC721
      const estimatedGas = await contract.burn.estimateGas(tokenIdBigInt);
      
      // Convert estimatedGas to number for gasLimit calculation
      const gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      
      const tx = await contract.burn(tokenIdBigInt, { gasLimit });
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert("✅ Project deleted successfully!");
        fetchNFTs();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      let errorMessage = "Delete failed";
      
      if (err.reason) {
        errorMessage += `: ${err.reason}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      } else if (err.data && err.data.message) {
        errorMessage += `: ${err.data.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Check if marketplace is approved for this token
  const checkMarketplaceApproval = async (tokenId) => {
    try {
      // Check if the marketplace (contract itself) is approved for this specific token
      const approvedAddress = await contract.getApproved(tokenId);
      // The marketplace is the contract itself
      return approvedAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
    } catch (err) {
      console.error("Error checking approval:", err);
      return false;
    }
  };

  // Approve Marketplace - FIXED VERSION with proper BigInt handling
  const approveMarketplace = async (tokenId) => {
    try {
      setLoading(prev => ({ ...prev, approve: true }));
      
      // Convert tokenId to BigInt to avoid type mismatch
      const tokenIdBigInt = BigInt(tokenId);
      
      // Use the standard approve function with the contract address
      const estimatedGas = await contract.approve.estimateGas(CONTRACT_ADDRESS, tokenIdBigInt);
      
      // Convert estimatedGas to number for gasLimit calculation
      const gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      
      const tx = await contract.approve(CONTRACT_ADDRESS, tokenIdBigInt, { gasLimit });
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert("✅ Marketplace approved successfully!");
        fetchNFTs();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Approval error:", err);
      let errorMessage = "Approval failed";
      
      if (err.reason) {
        errorMessage += `: ${err.reason}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      } else if (err.data && err.data.message) {
        errorMessage += `: ${err.data.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, approve: false }));
    }
  };

  // List NFT
  const listNFT = async (tokenId, priceEth) => {
    if (!priceEth || parseFloat(priceEth) <= 0) {
      alert("Please enter a valid price (greater than 0)");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, list: true }));
      
      // First check if approved
      const isApproved = await checkMarketplaceApproval(tokenId);
      
      if (!isApproved) {
        const approveFirst = window.confirm("You need to approve the marketplace first. Would you like to approve it now?");
        if (approveFirst) {
          await approveMarketplace(tokenId);
          // After approval, check again and try listing
          if (await checkMarketplaceApproval(tokenId)) {
            await performListing(tokenId, priceEth);
          }
        }
        return;
      }
      
      // If already approved, just list
      await performListing(tokenId, priceEth);
      
    } catch (err) {
      console.error("Listing error:", err);
      let errorMessage = "Listing failed";
      
      if (err.reason) {
        errorMessage += `: ${err.reason}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      } else if (err.data && err.data.message) {
        errorMessage += `: ${err.data.message}`;
      } else {
        errorMessage += ". Please check if you've approved the marketplace and have sufficient gas.";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  };

  // Perform the actual listing
  const performListing = async (tokenId, priceEth) => {
    try {
      const priceWei = parseEther(priceEth.toString());
      
      // Convert tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      
      // Estimate gas first to avoid out-of-gas errors
      const estimatedGas = await contract.listForSale.estimateGas(tokenIdBigInt, priceWei);
      
      // Convert estimatedGas to number for gasLimit calculation
      const gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      
      const tx = await contract.listForSale(tokenIdBigInt, priceWei, { gasLimit });
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert("✅ Listed for sale successfully!");
        setListingPrices(prev => ({ ...prev, [tokenId]: "" }));
        fetchNFTs();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Listing execution error:", err);
      throw err;
    }
  };

  // Cancel Listing
  const cancelListing = async (tokenId) => {
    try {
      setLoading(prev => ({ ...prev, cancel: true }));
      
      // Convert tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      
      // Estimate gas first
      const estimatedGas = await contract.cancelListing.estimateGas(tokenIdBigInt);
      
      // Convert estimatedGas to number for gasLimit calculation
      const gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      
      const tx = await contract.cancelListing(tokenIdBigInt, { gasLimit });
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert("✅ Listing cancelled successfully!");
        fetchNFTs();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      let errorMessage = "Cancel failed";
      
      if (err.reason) {
        errorMessage += `: ${err.reason}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, cancel: false }));
    }
  };

  // Buy NFT
  const buyNFT = async (tokenId, priceWei) => {
    try {
      setLoading(prev => ({ ...prev, buy: true }));
      
      // Convert tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      
      // Estimate gas first
      const estimatedGas = await contract.buy.estimateGas(tokenIdBigInt, { value: priceWei });
      
      // Convert estimatedGas to number for gasLimit calculation
      const gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      
      const tx = await contract.buy(tokenIdBigInt, { value: priceWei, gasLimit });
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        alert("✅ NFT purchased successfully!");
        fetchNFTs();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      let errorMessage = "Purchase failed";
      
      if (err.reason) {
        errorMessage += `: ${err.reason}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, buy: false }));
    }
  };

  // Fetch NFTs with image data
  const fetchNFTs = async () => {
    if (!contract) return;

    try {
      const totalSupply = await contract.tokenCounter();
      const nftsList = [];

      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const [owner, listing, tokenURI] = await Promise.all([
            contract.ownerOf(i),
            contract.listings(i),
            contract.tokenURI(i)
          ]);

          let name = `Project #${i}`;
          try {
            if (tokenURI && tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              const metadataResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
              if (metadataResponse.data.name) {
                name = metadataResponse.data.name;
              }
            }
          } catch (err) {
            console.log(`Could not fetch metadata for token ${i}:`, err.message);
          }

          nftsList.push({
            id: i,
            owner,
            price: listing.price.toString(),
            seller: listing.seller,
            tokenURI,
            name,
            isListed: listing.price > 0
          });
        } catch (err) {
          console.log(`Token ${i} might not exist:`, err.message);
        }
      }

      setNfts(nftsList);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMintForm(prev => ({ 
        ...prev, 
        file, 
        fileName: file.name 
      }));
    }
  };

  useEffect(() => {
    if (contract) fetchNFTs();
  }, [contract]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Code size={28} />
            </div>
            <h1 className="logo-text">DecentraStore</h1>
          </div>
          
          <nav className="nav-menu">
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-item ${activeTab === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketplace')}
            >
              Marketplace
            </button>
            <button 
              className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload
            </button>
          </nav>

          {currentAccount ? (
            <div className="wallet-section">
              <div className="wallet-info">
                <div className="connection-dot"></div>
                <span className="wallet-address">
                  {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                </span>
              </div>
            </div>
          ) : (
            <button 
              className="connect-wallet-btn"
              onClick={connectWallet}
              disabled={loading.connect}
            >
              {loading.connect ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!currentAccount ? (
          // Welcome/Features Page
          <div className="welcome-container">
            <div className="hero-section">
              <div className="hero-content">
                <h2 className="hero-title">
                  Decentralized Code Marketplace
                </h2>
                <p className="hero-description">
                  Store, authenticate, and trade code projects with automatic royalties on the blockchain
                </p>
                <button 
                  className="cta-button"
                  onClick={connectWallet}
                >
                  Get Started
                </button>
              </div>
            </div>

            <div className="features-section">
              <h3 className="section-title">Why Choose DecentraStore?</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Shield size={32} />
                  </div>
                  <h4>Secure Authentication</h4>
                  <p>Mint your code files as NFTs to ensure authenticity and ownership</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Coins size={32} />
                  </div>
                  <h4>Automatic Royalties</h4>
                  <p>Earn royalties automatically on every resale of your code projects</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <Sparkles size={32} />
                  </div>
                  <h4>Decentralized Storage</h4>
                  <p>Your files are stored securely on IPFS with blockchain verification</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main App Content
          <>
            {activeTab === 'dashboard' && (
              <div className="dashboard-container">
                <div className="dashboard-header">
                  <h2>Welcome to Your Dashboard</h2>
                  <p>Manage your code projects and marketplace activities</p>
                </div>
                
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>{nfts.filter(n => n.owner.toLowerCase() === currentAccount.toLowerCase()).length}</h3>
                    <p>Total Projects</p>
                  </div>
                  <div className="stat-card">
                    <h3>{nfts.filter(n => n.isListed && n.seller.toLowerCase() === currentAccount.toLowerCase()).length}</h3>
                    <p>Listed for Sale</p>
                  </div>
                  <div className="stat-card">
                    <h3>{nfts.filter(n => n.isListed && n.owner.toLowerCase() !== currentAccount.toLowerCase()).length}</h3>
                    <p>Available in Market</p>
                  </div>
                </div>

                <div className="quick-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => setActiveTab('upload')}
                  >
                    <Plus size={20} />
                    Upload New Project
                  </button>
                  <button 
                    className="action-btn secondary"
                    onClick={() => setActiveTab('marketplace')}
                  >
                    <ShoppingCart size={20} />
                    Browse Marketplace
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="upload-container">
                <div className="upload-card">
                  <div className="upload-header">
                    <h2>Create New Project</h2>
                    <p>Upload your code files and mint them as NFTs</p>
                  </div>

                  <div className="upload-form">
                    <div className="form-group">
                      <label>Project Name *</label>
                      <input
                        type="text"
                        value={mintForm.name}
                        onChange={(e) => setMintForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter project name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={mintForm.description}
                        onChange={(e) => setMintForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your project..."
                        rows="4"
                        className="form-textarea"
                      />
                    </div>

                    <div className="form-group">
                      <label>Code Files *</label>
                      <div className="file-upload-section">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="file-input"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="file-upload-btn">
                          <Upload size={18} />
                          Choose File
                        </label>
                        <span className="file-name">
                          {mintForm.fileName || "No file chosen"}
                        </span>
                      </div>

                      <div className="upload-dropzone">
                        <Upload size={32} />
                        <p>Drag and drop your code files here</p>
                        <span>ZIP, RAR, 7ZIP (MAX. 100MB)</span>
                      </div>
                    </div>

                    <button
                      onClick={mintNFT}
                      disabled={loading.mint || !mintForm.name || !mintForm.file}
                      className="submit-btn"
                    >
                      {loading.mint ? "Minting..." : "Mint NFT"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'marketplace' && (
              <div className="marketplace-container">
                <div className="marketplace-header">
                  <h2>Code Marketplace</h2>
                  <p>Discover and trade authentic code projects</p>
                  
                  <div className="marketplace-controls">
                    <div className="view-toggle">
                      <button 
                        className={viewMode === 'grid' ? 'active' : ''}
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid size={18} />
                      </button>
                      <button 
                        className={viewMode === 'list' ? 'active' : ''}
                        onClick={() => setViewMode('list')}
                      >
                        <List size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {nfts.length === 0 ? (
                  <div className="empty-state">
                    <ShoppingCart size={64} />
                    <h3>No NFTs found in the marketplace</h3>
                    <p>Be the first to mint and list your code project</p>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className="cta-button"
                    >
                      Create Your First NFT
                    </button>
                  </div>
                ) : (
                  <div className={`nfts-grid ${viewMode}`}>
                    {nfts.map(nft => (
                      <div key={nft.id} className="nft-card">
                        <div className="nft-image-container">
                          <div className="nft-image-fallback">
                            <Code size={48} />
                          </div>
                        </div>
                        
                        <div className="nft-info">
                          <h3>{nft.name}</h3>
                          <div className="nft-owner">
                            <User size={14} />
                            <span>{nft.owner.slice(0, 8)}...{nft.owner.slice(-6)}</span>
                          </div>

                          <div className="nft-uri">
                            <span className="uri-label">IPFS URI:</span>
                            <a 
                              href={nft.tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="uri-link"
                            >
                              View Metadata
                            </a>
                          </div>

                          {nft.isListed ? (
                            <>
                              <div className="nft-price">
                                <span className="price">{formatEther(nft.price)} ETH</span>
                                <span className="badge">For Sale</span>
                              </div>

                              {nft.seller.toLowerCase() === currentAccount.toLowerCase() ? (
                                <div className="owner-buttons">
                                  <button
                                    onClick={() => cancelListing(nft.id)}
                                    disabled={loading.cancel}
                                    className="cancel-btn"
                                  >
                                    Cancel Listing
                                  </button>
                                  <button
                                    onClick={() => deleteNFT(nft.id)}
                                    disabled={loading.delete}
                                    className="delete-btn"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => buyNFT(nft.id, nft.price)}
                                  disabled={loading.buy}
                                  className="buy-btn"
                                >
                                  Buy Now
                                </button>
                              )}
                            </>
                          ) : (
                            nft.owner.toLowerCase() === currentAccount.toLowerCase() && (
                              <div className="owner-actions">
                                <div className="owned-badge">You Own This</div>
                                <input
                                  type="number"
                                  placeholder="0.00 ETH"
                                  step="0.001"
                                  min="0.001"
                                  value={listingPrices[nft.id] || ""}
                                  onChange={(e) => setListingPrices(prev => ({ ...prev, [nft.id]: e.target.value }))}
                                  className="price-input"
                                />
                                <div className="action-buttons">
                                  <button
                                    onClick={() => approveMarketplace(nft.id)}
                                    disabled={loading.approve}
                                    className="action-btn small"
                                  >
                                    {loading.approve ? "Approving..." : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => listNFT(nft.id, listingPrices[nft.id])}
                                    disabled={loading.list || !listingPrices[nft.id]}
                                    className="action-btn small primary"
                                  >
                                    {loading.list ? "Listing..." : "List"}
                                  </button>
                                  <button
                                    onClick={() => deleteNFT(nft.id)}
                                    disabled={loading.delete}
                                    className="action-btn small delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;