import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';

// We'll need to update this with the actual deployed contract address
const OTC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OTC_CONTRACT_ADDRESS as Address;

// Import the contract ABI
const OTC_ABI = [
  // Order struct
  {
    inputs: [
      { name: "tokenToSell", type: "address" },
      { name: "amountToSell", type: "uint256" },
      { name: "tokenToBuy", type: "uint256" },
      { name: "amountToBuy", type: "uint256" }
    ],
    name: "createOrder",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "_orderId", type: "uint256" }],
    name: "fillOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "_orderId", type: "uint256" }],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "_orderId", type: "uint256" }],
    name: "getOrder",
    outputs: [
      {
        components: [
          { name: "maker", type: "address" },
          { name: "tokenToSell", type: "address" },
          { name: "amountToSell", type: "uint256" },
          { name: "tokenToBuy", type: "address" },
          { name: "amountToBuy", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "timestamp", type: "uint256" }
        ],
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getOrdersCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

export interface Order {
  maker: Address;
  tokenToSell: Address;
  amountToSell: bigint;
  tokenToBuy: Address;
  amountToBuy: bigint;
  isActive: boolean;
  timestamp: bigint;
}

export function useOTCTrade() {
  const { address } = useAccount();

  // Read functions
  const { data: ordersCount } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'getOrdersCount',
  });

  const getOrder = async (orderId: number) => {
    const { data: order } = await useContractRead({
      address: OTC_CONTRACT_ADDRESS,
      abi: OTC_ABI,
      functionName: 'getOrder',
      args: [orderId],
    });
    return order as Order;
  };

  // Write functions
  const { writeAsync: createOrder } = useContractWrite({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'createOrder',
  });

  const { writeAsync: fillOrder } = useContractWrite({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'fillOrder',
  });

  const { writeAsync: cancelOrder } = useContractWrite({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'cancelOrder',
  });

  return {
    ordersCount: ordersCount as bigint,
    getOrder,
    createOrder,
    fillOrder,
    cancelOrder,
    userAddress: address,
  };
} 