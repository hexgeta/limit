import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { pulsechain } from 'viem/chains';
import { Address } from 'viem';

// Contract address - PulseChain OTC contract
const OTC_CONTRACT_ADDRESS = '0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2' as Address;

// Use the working RPC endpoint
const PULSECHAIN_RPC = 'https://rpc.pulsechain.com';

// Import the full ABI from the contract
const OTC_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_adminWallet",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_beanToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_uniswapAnchor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_bistroStaking",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_listingFeesInUSD",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_redeemFees",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_discountInRedeemFees",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_listingFeesLimit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_redeemFeesLimit",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "_cooldownPeriod",
        "type": "uint32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
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
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
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
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_orderId",
        "type": "uint256"
      }
    ],
    "name": "getOrderDetails",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderIndex",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "orderOwner",
                "type": "address"
              }
            ],
            "internalType": "struct OTC.UserOrderDetails",
            "name": "userDetails",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "orderId",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "remainingExecutionPercentage",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "redemeedPercentage",
                "type": "uint256"
              },
              {
                "internalType": "uint32",
                "name": "lastUpdateTime",
                "type": "uint32"
              },
              {
                "internalType": "enum OTC.OrderStatus",
                "name": "status",
                "type": "uint8"
              },
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
                "name": "orderDetails",
                "type": "tuple"
              }
            ],
            "internalType": "struct OTC.OrderDetailsWithId",
            "name": "orderDetailsWithId",
            "type": "tuple"
          }
        ],
        "internalType": "struct OTC.CompleteOrderDetails",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface UserOrderDetails {
  orderIndex: bigint;
  orderOwner: Address;
}

export interface OrderDetails {
  sellToken: Address;
  sellAmount: bigint;
  buyTokensIndex: bigint[];
  buyAmounts: bigint[];
  expirationTime: bigint;
}

export interface OrderDetailsWithId {
  orderId: bigint;
  remainingExecutionPercentage: bigint;
  redemeedPercentage: bigint;
  lastUpdateTime: number;
  status: number; // 0: Active, 1: Cancelled, 2: Completed
  orderDetails: OrderDetails;
}

export interface CompleteOrderDetails {
  userDetails: UserOrderDetails;
  orderDetailsWithId: OrderDetailsWithId;
}

// Create public client for PulseChain
const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com', {
    timeout: 10000, // 10 second timeout per call
    retryCount: 0, // Let our error handling manage retries
  })
});

// Helper function to fetch contract data
async function fetchContractData() {
  try {
    console.log('Fetching contract data from:', OTC_CONTRACT_ADDRESS);
    console.log('Using RPC:', 'https://rpc.pulsechain.com');
    
    // Test basic connectivity first
    try {
      const blockNumber = await client.getBlockNumber();
      console.log('Connected to PulseChain, current block:', blockNumber.toString());
    } catch (rpcError) {
      console.error('RPC connection failed:', rpcError);
      throw rpcError;
    }
    
    // Fetch all contract data in parallel
    const [contractName, contractOwner, contractSymbol, totalSupply, orderCounter] = await Promise.all([
      client.readContract({
        address: OTC_CONTRACT_ADDRESS,
        abi: OTC_ABI,
        functionName: 'name',
      }).catch(err => {
        console.error('Error fetching name:', err.message);
        return null;
      }),
      
      client.readContract({
        address: OTC_CONTRACT_ADDRESS,
        abi: OTC_ABI,
        functionName: 'owner',
      }).catch(err => {
        console.error('Error fetching owner:', err.message);
        return null;
      }),
      
      client.readContract({
        address: OTC_CONTRACT_ADDRESS,
        abi: OTC_ABI,
        functionName: 'symbol',
      }).catch(err => {
        console.error('Error fetching symbol:', err.message);
        return null;
      }),
      
      client.readContract({
        address: OTC_CONTRACT_ADDRESS,
        abi: OTC_ABI,
        functionName: 'totalSupply',
      }).catch(err => {
        console.error('Error fetching totalSupply:', err.message);
        return null;
      }),
      
      client.readContract({
        address: OTC_CONTRACT_ADDRESS,
        abi: OTC_ABI,
        functionName: 'getOrderCounter',
      }).catch(err => {
        console.error('Error fetching orderCounter:', err.message);
        return null;
      })
    ]);

    // Fetch all orders if we have an order counter
    let allOrders: CompleteOrderDetails[] = [];
    if (orderCounter && orderCounter > 0n) {
      console.log(`Fetching ${orderCounter.toString()} orders...`);
      
      // Create array of order IDs (1 to orderCounter)
      const orderIds = Array.from({ length: Number(orderCounter) }, (_, i) => i + 1);
      
      // Fetch orders in batches to avoid overwhelming the RPC
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < orderIds.length; i += batchSize) {
        batches.push(orderIds.slice(i, i + batchSize));
      }
      
      console.log(`Processing ${batches.length} batches of ${batchSize} orders each...`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (orders ${batch[0]}-${batch[batch.length - 1]})`);
        
        const batchPromises = batch.map(orderId => 
          client.readContract({
            address: OTC_CONTRACT_ADDRESS,
            abi: OTC_ABI,
            functionName: 'getOrderDetails',
            args: [BigInt(orderId)],
          }).catch(err => {
            console.error(`Error fetching order ${orderId}:`, err.message);
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Filter out null results and add to allOrders
        const validOrders = batchResults.filter((order): order is CompleteOrderDetails => order !== null);
        allOrders.push(...validOrders);
        
        console.log(`Batch ${batchIndex + 1} complete: ${validOrders.length}/${batch.length} orders fetched successfully`);
        
        // Small delay between batches to be nice to the RPC
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Total orders fetched: ${allOrders.length}/${orderCounter.toString()}`);
    }

    // Filter orders by status
    const activeOrders = allOrders.filter(order => order.orderDetailsWithId.status === 0);
    const completedOrders = allOrders.filter(order => order.orderDetailsWithId.status === 2);
    const cancelledOrders = allOrders.filter(order => order.orderDetailsWithId.status === 1);

    console.log('Contract data fetched successfully:', {
      name: contractName,
      owner: contractOwner,
      symbol: contractSymbol,
      totalSupply: totalSupply?.toString(),
      orderCounter: orderCounter?.toString(),
      totalOrders: allOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length
    });

    return {
      contractName: contractName as string | null,
      contractOwner: contractOwner as Address | null,
      contractSymbol: contractSymbol as string | null,
      totalSupply: totalSupply as bigint | null,
      orderCounter: orderCounter as bigint | null,
      allOrders: allOrders,
      activeOrders: activeOrders,
      completedOrders: completedOrders,
      cancelledOrders: cancelledOrders,
    };
  } catch (error) {
    console.error('Critical error fetching contract data:', error);
    return {
      contractName: null,
      contractOwner: null,
      contractSymbol: null,
      totalSupply: null,
      orderCounter: null,
      allOrders: [],
      activeOrders: [],
      completedOrders: [],
      cancelledOrders: [],
    };
  }
}

export function useOpenPositions() {
  const [data, setData] = useState<{
    contractName: string | null;
    contractOwner: Address | null;
    contractSymbol: string | null;
    totalSupply: bigint | null;
    orderCounter: bigint | null;
    allOrders: CompleteOrderDetails[];
    activeOrders: CompleteOrderDetails[];
    completedOrders: CompleteOrderDetails[];
    cancelledOrders: CompleteOrderDetails[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchContractData();
      setData(result);
      
      // If all data is null, there might be an issue
      if (!result.contractName && !result.contractOwner && !result.contractSymbol && !result.totalSupply && !result.orderCounter) {
        setError(new Error('All contract calls failed. Check console for details.'));
      }
    } catch (err) {
      console.error('Hook error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    contractName: data?.contractName,
    contractOwner: data?.contractOwner,
    contractSymbol: data?.contractSymbol,
    totalSupply: data?.totalSupply,
    orderCounter: data?.orderCounter,
    allOrders: data?.allOrders || [],
    activeOrders: data?.activeOrders || [],
    completedOrders: data?.completedOrders || [],
    cancelledOrders: data?.cancelledOrders || [],
    isLoading,
    error,
  };
}
