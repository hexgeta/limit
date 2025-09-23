import { useContractRead, useAccount } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { useContractWhitelist } from './useContractWhitelist';

// We'll need to update this with the actual deployed contract address
const OTC_CONTRACT_ADDRESS = '0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2';

// Import the contract ABI - using the correct ABI from the contract
const OTC_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "sellToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "sellAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "buyTokensIndex",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "buyAmounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "expirationTime",
            "type": "uint256"
          }
        ],
        "internalType": "struct OTC.OrderDetails",
        "name": "_orderDetails",
        "type": "tuple"
      }
    ],
    "name": "placeOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_orderId",
        "type": "uint256"
      }
    ],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_orderId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_buyTokenIndexInOrder",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_buyAmount",
        "type": "uint256"
      }
    ],
    "name": "executeOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOrderCounter",
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
] as const;

export interface OrderDetails {
  sellToken: Address;
  sellAmount: bigint;
  buyTokensIndex: bigint[];
  buyAmounts: bigint[];
  expirationTime: bigint;
}

export function useOTCTrade() {
  const { address } = useAccount();
  
  // Use the whitelist system for write functions
  const {
    placeOrder,
    executeOrder,
    cancelOrder,
    isWalletConnected,
    isConnected
  } = useContractWhitelist();

  // Read functions
  const { data: ordersCount } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'getOrderCounter',
  });

  return {
    ordersCount: ordersCount as bigint,
    placeOrder,
    executeOrder,
    cancelOrder,
    userAddress: address,
    isWalletConnected,
    isConnected,
  };
}

