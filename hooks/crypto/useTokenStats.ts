import useSWR from 'swr';

interface TokenStats {
  name: string;
  stake: {
    principal: number;
    tShares: number;
    yieldSoFarHEX: number;
    backingHEX: number;
    percentageYieldEarnedSoFar: number;
    hexAPY: number;
    minterAPY: number;
    buyerAPY: number | null;
  };
  token: {
    supply: number;
    burnedSupply: number;
    priceUSD: number;
    priceHEX: number;
    costPerTShareUSD: number;
    backingPerToken: number;
    discountFromBacking: number;
    discountFromMint: number;
  };
  gas: {
    equivalentSoloStakeUnits: number;
    endStakeUnits: number;
    savingPercentage: number;
  };
  dates: {
    stakeStartDate: string;
    stakeEndDate: string;
    daysTotal: number;
    daysSinceStart: number;
    daysLeft: number;
    progressPercentage: number;
  };
}

interface TokenStatsResponse {
  tokens: Record<string, TokenStats>;
  lastUpdated: string;
}

const fetcher = async (url: string): Promise<TokenStatsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch token stats');
  }
  return response.json();
};

interface UseTokenStatsOptions {
  enabled?: boolean;
}

export const useTokenStats = (options?: UseTokenStatsOptions) => {
  const { enabled = true } = options || {};
  
  const { data, error, isLoading } = useSWR<TokenStatsResponse>(
    enabled ? '/api/token-stats' : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    tokenStats: data?.tokens || {},
    lastUpdated: data?.lastUpdated,
    isLoading,
    error,
  };
};

export type { TokenStats };
