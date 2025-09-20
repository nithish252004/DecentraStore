// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DatasetNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _tokenCounter;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => address) public creatorOf;

    event Minted(uint256 indexed tokenId, address indexed to, string tokenURI, uint96 royaltyBps);
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event Bought(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royaltyPaid);
    event Burned(uint256 indexed tokenId, address indexed owner);

    constructor() ERC721("DatasetNFT", "DSNFT") Ownable(msg.sender) {}

    function mintNFT(address recipient, string memory _tokenURI, uint96 royaltyBps) external returns (uint256) {
        uint256 newId = _tokenCounter;
        _tokenCounter++;

        _mint(recipient, newId);
        _setTokenURI(newId, _tokenURI);
        _setTokenRoyalty(newId, recipient, royaltyBps);

        creatorOf[newId] = recipient;

        emit Minted(newId, recipient, _tokenURI, royaltyBps);
        return newId;
    }

    function tokenCounter() external view returns (uint256) {
        return _tokenCounter;
    }

    function listForSale(uint256 tokenId, uint256 priceWei) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(priceWei > 0, "Price must be > 0");
        require(listings[tokenId].price == 0, "Already listed");
        require(getApproved(tokenId) == address(this), "Contract not approved");

        listings[tokenId] = Listing(msg.sender, priceWei);
        emit Listed(tokenId, msg.sender, priceWei);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.price != 0, "Not listed");
        require(l.seller == msg.sender, "Not seller");

        delete listings[tokenId];
        emit Cancelled(tokenId, msg.sender);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.price != 0, "Not listed");
        require(msg.value == l.price, "Incorrect ETH");

        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, l.price);
        delete listings[tokenId];

        uint256 toSeller = l.price;
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            toSeller = l.price - royaltyAmount;
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltySuccess, "Royalty transfer failed");
        }
        
        (bool sellerSuccess, ) = payable(l.seller).call{value: toSeller}("");
        require(sellerSuccess, "Seller transfer failed");

        _transfer(l.seller, msg.sender, tokenId);
        emit Bought(tokenId, l.seller, msg.sender, l.price, royaltyAmount);
    }

    // Burn function to delete/remove an NFT
    function burn(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        // Check if the token is listed
        Listing memory l = listings[tokenId];
        require(l.price == 0, "Cannot burn listed NFT");
        
        // Clear royalty information
        _resetTokenRoyalty(tokenId);
        
        // Delete from listings mapping if it exists
        delete listings[tokenId];
        
        // Delete creator information
        delete creatorOf[tokenId];
        
        // Burn the token
        _burn(tokenId);
        
        emit Burned(tokenId, msg.sender);
    }

    // Use the standard approve function instead of approveMarketplace
    function approveMarketplace(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        approve(address(this), tokenId);
    }

    // Helper function to get marketplace address (which is the contract itself)
    function getMarketplaceAddress() external view returns (address) {
        return address(this);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}