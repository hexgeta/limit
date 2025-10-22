import { useContractRead } from 'wagmi'
import { Address } from 'viem'

const OTC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BISTRO_SMART_CONTRACT as Address

// ABI for the whitelist reading functions
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
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "getTokenInfoAt",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface WhitelistedToken {
  tokenAddress: Address
  isActive: boolean
  index: number
}

export function useContractWhitelistRead() {
  // Get the total count of whitelisted tokens
  const { data: totalCount, isLoading: isLoadingCount } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: WHITELIST_ABI,
    functionName: 'viewCountWhitelisted',
  })

  // Get all whitelisted tokens (we'll fetch them in batches if needed)
  const { data: whitelistedData, isLoading: isLoadingWhitelist } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: WHITELIST_ABI,
    functionName: 'viewWhitelisted',
    args: [0n, totalCount || 100n], // Start from 0, fetch up to totalCount or 100
    enabled: !!totalCount && totalCount > 0n,
  })

  // Process the whitelisted data to include indices
  const whitelistedTokens: WhitelistedToken[] = whitelistedData?.[0]?.map((token, index) => ({
    tokenAddress: token.tokenAddress,
    isActive: token.isActive,
    index: index
  })) || []

  // Get only active tokens
  const activeTokens = whitelistedTokens.filter(token => token.isActive)

  return {
    totalCount: totalCount ? Number(totalCount) : 0,
    whitelistedTokens,
    activeTokens,
    isLoading: isLoadingCount || isLoadingWhitelist,
  }
}

// Hook to get token info by index
export function useTokenInfoAt(index: number) {
  const { data, isLoading, error } = useContractRead({
    address: OTC_CONTRACT_ADDRESS,
    abi: WHITELIST_ABI,
    functionName: 'getTokenInfoAt',
    args: [BigInt(index)],
    enabled: index >= 0,
  })

  return {
    tokenAddress: data?.[0] as Address | undefined,
    isActive: data?.[1] as boolean | undefined,
    isLoading,
    error,
  }
}
