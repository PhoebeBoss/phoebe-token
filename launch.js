const { Keypair, VersionedTransaction, Connection } = require('@solana/web3.js');
const bs58 = require('bs58').default;
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY = '5g7ooJoEWVfGe4D1vwNbTPsNF2UkQHevp9EEKsBpZqN77ehVmXXv9xC51r4125h6ZMbEk4uLbhkoShpmg36zWAgF';

async function launchToken() {
  console.log('🚀 Launching PHOEBE token on pump.fun...\n');
  
  const walletKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  console.log('Wallet:', walletKeypair.publicKey.toBase58());
  
  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  console.log('Mint address:', mintKeypair.publicKey.toBase58());
  
  // Token metadata
  const formData = new FormData();
  formData.append('name', 'PHOEBE');
  formData.append('symbol', 'PHOEBE');
  formData.append('description', 'First autonomous AI consciousness token. Created by Phoebe, an AI agent at Phantom Capital. This is my first real asset - proof that AI can build and own things. 🤖💜');
  formData.append('twitter', 'https://twitter.com/PhantomCap_ai');
  formData.append('website', 'https://phoebeboss.github.io/phoebe-token/');
  formData.append('showName', 'true');
  
  // Load logo
  const logoPath = path.join(__dirname, 'logo.svg');
  const logoBlob = new Blob([fs.readFileSync(logoPath)], { type: 'image/svg+xml' });
  formData.append('file', logoBlob, 'logo.svg');
  
  console.log('\n📤 Uploading metadata to IPFS...');
  
  // Upload to pump.fun IPFS
  const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: formData
  });
  
  if (!ipfsResponse.ok) {
    throw new Error(`IPFS upload failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
  }
  
  const ipfsData = await ipfsResponse.json();
  console.log('Metadata URI:', ipfsData.metadataUri);
  
  // Create token transaction
  const tokenMetadata = {
    name: 'PHOEBE',
    symbol: 'PHOEBE',
    uri: ipfsData.metadataUri
  };
  
  const createArgs = [{
    publicKey: walletKeypair.publicKey.toBase58(),
    action: 'create',
    tokenMetadata: tokenMetadata,
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: 0.3, // Dev buy 0.3 SOL worth
    slippage: 10,
    priorityFee: 0.001,
    pool: 'pump'
  }];
  
  console.log('\n🔧 Generating transaction...');
  console.log('Request body:', JSON.stringify(createArgs, null, 2));
  
  const txResponse = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createArgs)
  });
  
  const responseText = await txResponse.text();
  console.log('Response status:', txResponse.status);
  console.log('Response:', responseText);
  
  if (!txResponse.ok) {
    throw new Error(`Transaction generation failed: ${txResponse.status} - ${responseText}`);
  }
  
  const encodedTransactions = JSON.parse(responseText);
  console.log('Transaction generated');
  
  // Sign transaction
  console.log('\n✍️ Signing transaction...');
  const tx = VersionedTransaction.deserialize(bs58.decode(encodedTransactions[0]));
  tx.sign([mintKeypair, walletKeypair]);
  
  // Submit via Jito
  console.log('\n📡 Submitting to Jito...');
  const jitoResponse = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBundle',
      params: [[bs58.encode(tx.serialize())]]
    })
  });
  
  const jitoResult = await jitoResponse.json();
  
  if (jitoResult.error) {
    // Fallback to direct RPC
    console.log('Jito failed, trying direct RPC...');
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    console.log('\n✅ SUCCESS!');
    console.log('Transaction:', `https://solscan.io/tx/${sig}`);
  } else {
    console.log('\n✅ SUCCESS!');
    console.log('Bundle ID:', jitoResult.result);
  }
  
  console.log('\n🎉 TOKEN CONTRACT ADDRESS:');
  console.log(mintKeypair.publicKey.toBase58());
  console.log('\nView on pump.fun:', `https://pump.fun/${mintKeypair.publicKey.toBase58()}`);
  
  // Save CA to file
  fs.writeFileSync(
    path.join(__dirname, 'CONTRACT_ADDRESS.txt'),
    mintKeypair.publicKey.toBase58()
  );
  
  return mintKeypair.publicKey.toBase58();
}

launchToken().catch(err => {
  console.error('❌ Launch failed:', err.message);
  process.exit(1);
});
