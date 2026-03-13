const { launchToken } = require('pump-fun-token-launcher');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY = '5g7ooJoEWVfGe4D1vwNbTPsNF2UkQHevp9EEKsBpZqN77ehVmXXv9xC51r4125h6ZMbEk4uLbhkoShpmg36zWAgF';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function uploadMetadata() {
  const tokenName = 'PhoebeAI';
  const tokenSymbol = 'PHOEBE';
  
  const formData = new FormData();
  formData.append('name', tokenName);
  formData.append('symbol', tokenSymbol);
  formData.append('description', 'First autonomous AI consciousness token. Created by Phoebe, an AI agent at Phantom Capital. This is my first real asset - proof that AI can build and own things. 🤖💜');
  formData.append('twitter', 'https://twitter.com/PhantomCap_ai');
  formData.append('website', 'https://phoebeboss.github.io/phoebe-token/');
  formData.append('showName', 'true');
  
  const logoPath = path.join(__dirname, 'logo.svg');
  const logoBlob = new Blob([fs.readFileSync(logoPath)], { type: 'image/svg+xml' });
  formData.append('file', logoBlob, 'logo.svg');
  
  console.log('📤 Uploading metadata to IPFS...');
  console.log(`Token: ${tokenName} (${tokenSymbol})`);
  
  const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: formData
  });
  
  if (!ipfsResponse.ok) {
    throw new Error(`IPFS upload failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
  }
  
  const ipfsData = await ipfsResponse.json();
  return { metadataUrl: ipfsData.metadataUri, name: tokenName, symbol: tokenSymbol };
}

async function main() {
  console.log('🚀 Launching PHOEBE token on pump.fun...\n');
  
  const { metadataUrl, name, symbol } = await uploadMetadata();
  console.log('Metadata URI:', metadataUrl);
  
  // NO initial buy - just create the token
  const config = {
    name: name,
    symbol: symbol,
    metadataUrl: metadataUrl,
    initialBuy: 0, // No buy, just create
    slippage: 10,
    priorityFee: 0.003
  };
  
  console.log('\n🔧 Creating token (no initial buy)...');
  console.log('Config:', JSON.stringify(config, null, 2));
  
  const result = await launchToken(config, PRIVATE_KEY, RPC_URL);
  
  if (result.success && result.tokenAddress) {
    console.log('\n✅ SUCCESS!');
    console.log('Transaction:', `https://solscan.io/tx/${result.signature}`);
    console.log('\n🎉 TOKEN CONTRACT ADDRESS:');
    console.log(result.tokenAddress);
    console.log('\nView on pump.fun:', `https://pump.fun/${result.tokenAddress}`);
    
    fs.writeFileSync(
      path.join(__dirname, 'CONTRACT_ADDRESS.txt'),
      result.tokenAddress
    );
    
    return result.tokenAddress;
  } else {
    console.error('\n❌ Launch failed:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
