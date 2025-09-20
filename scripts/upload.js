const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const pinataApiKey = 'af78f804291743afdd7a';
const pinataSecretApiKey = '7164d53c5ba0069cafe0fe548507f493775da7a8c8864295df7106fa93b57132';

async function uploadToIPFS() {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const data = new FormData();

  const filePath = 'dataset/sample.txt'; // make sure this file exists
  data.append('file', fs.createReadStream(filePath));

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: 'Infinity',
      headers: {
        ...data.getHeaders(),
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey
      }
    });

    console.log('✅ File uploaded to IPFS!');
    console.log('🆔 CID:', res.data.IpfsHash);
    console.log(`🔗 URL: https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`);
  } catch (error) {
    console.error('❌ Upload failed:', error.response ? error.response.data : error.message);
  }
}

uploadToIPFS();
