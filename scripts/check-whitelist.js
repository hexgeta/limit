/**
 * Check Whitelist Script
 * 
 * This script queries the OTC contract to retrieve the current whitelist of tokens.
 * Use this to verify if the whitelist in constants/crypto.ts matches the on-chain data.
 * 
 * Usage: node scripts/check-whitelist.js
 */

const { ethers } = require("ethers");

const OTC_CONTRACT_ADDRESS = '0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2';

const WHITELIST_ABI = [
  {
    "inputs": [],
    "name": "viewCountWhitelisted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "cursor",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "size",
        "type": "uint256"
      }
    ],
    "name": "viewWhitelisted",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct Whitelist.TokenInfo[]",
        "name": "",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  OTC Contract Whitelist Verification');
  console.log('  Contract: ' + OTC_CONTRACT_ADDRESS);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Connect to PulseChain RPC
  const provider = new ethers.JsonRpcProvider('https://rpc.pulsechain.com');
  
  // Create contract instance
  const contract = new ethers.Contract(OTC_CONTRACT_ADDRESS, WHITELIST_ABI, provider);
  
  try {
    console.log('⏳ Querying whitelist from contract...\n');
    
    // Get total count
    const totalCount = await contract.viewCountWhitelisted();
    console.log(`📊 Total whitelisted tokens: ${totalCount.toString()}\n`);
    
    // Get all whitelisted tokens
    const [tokens, nextCursor] = await contract.viewWhitelisted(0, totalCount);
    
    console.log('📋 Whitelisted Tokens:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const activeTokens = [];
    const inactiveTokens = [];
    
    tokens.forEach((token, index) => {
      if (token.isActive) {
        activeTokens.push(token);
      } else {
        inactiveTokens.push(token);
      }
    });
    
    console.log(`✅ ACTIVE TOKENS (${activeTokens.length}):`);
    activeTokens.forEach((token, index) => {
      console.log(`   ${index + 1}. ${token.tokenAddress}`);
    });
    
    if (inactiveTokens.length > 0) {
      console.log(`\n❌ INACTIVE TOKENS (${inactiveTokens.length}):`);
      inactiveTokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.tokenAddress}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Whitelist query completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ Error querying contract:', error.message);
    console.error('\nFull error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

