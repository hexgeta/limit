import { useContractRead } from 'wagmi';
import { Address } from 'viem';

// Contract address - update with actual deployed address
const OTC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OTC_CONTRACT_ADDRESS as Address;

// Import the full ABI from the contract
const OTC_ABI = [
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

export function useOpenPositions() {
  // Get total order counter to know how many orders exist
  const { data: orderCounter, isLoading: counterLoading } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: OTC_ABI,
    functionName: 'getOrderCounter',
  });

  // For now, let's fetch the first 20 orders to show some data
  // In a production app, you'd want to implement pagination or a more efficient method
  const maxOrdersToFetch = 20;
  const orderIds = orderCounter ? 
    Array.from({ length: Math.min(Number(orderCounter), maxOrdersToFetch) }, (_, i) => i + 1) : 
    [];

  // Create multiple contract reads for the first few orders
  const orderQueries = orderIds.map(orderId => 
    useContractRead({
      address: OTC_CONTRACT_ADDRESS,
      abi: OTC_ABI,
      functionName: 'getOrderDetails',
      args: [BigInt(orderId)],
      query: {
        enabled: !!orderCounter && orderCounter > 0n,
      }
    })
  );

  // Filter for active orders only
  const activeOrders = orderQueries
    .map(query => query.data as CompleteOrderDetails | undefined)
    .filter((order): order is CompleteOrderDetails => 
      order !== undefined && order.orderDetailsWithId.status === 0
    );

  const isLoading = counterLoading || orderQueries.some(query => query.isLoading);
  const error = orderQueries.find(query => query.error)?.error || null;

  return {
    allOrders: activeOrders,
    orderCounter: orderCounter as bigint | undefined,
    isLoading,
    error,
  };
}
