import { PAIR_ADDRESSES } from '@/constants/crypto'

interface PairInfo {
  chain: string
  pairAddress: string
}

export function getPairInfo(symbol: string): PairInfo {