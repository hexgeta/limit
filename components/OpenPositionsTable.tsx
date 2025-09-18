'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOpenPositions } from '@/hooks/contracts/useOpenPositions';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { formatEther } from 'viem';
import { getTokenInfo, getTokenInfoByIndex, formatAddress } from '@/utils/tokenUtils';

// Copy to clipboard function
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // You could add a toast notification here if you have one
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

// Format number with scientific notation for very small numbers and commas for large numbers
const formatAmount = (amount: string) => {
  const num = parseFloat(amount);
  if (num < 0.000001 && num > 0) {
    return num.toExponential(2);
  }
  if (num >= 10000) {
    return num.toLocaleString();
  }
  return amount;
};

// Format USD amount
const formatUSD = (amount: number) => {
  if (amount < 0.01) {
    return `$${amount.toExponential(2)}`;
  }
  if (amount >= 10000) {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toFixed(2)}`;
};

// Map wrapped tokens to base tokens for price fetching
const getBaseTokenForPrice = (ticker: string) => {
  const baseTokenMap: Record<string, string> = {
    'weMAXI': 'MAXI',
    'weDECI': 'DECI', 
    'weLUCKY': 'LUCKY',
    'weTRIO': 'TRIO',
    'weBASE': 'BASE',
    'weHEX': 'HEX',
    'weUSDC': 'USDC',
    'weUSDT': 'USDT',
    'pMAXI': 'MAXI',
    'pDECI': 'DECI',
    'pLUCKY': 'LUCKY', 
    'pTRIO': 'TRIO',
    'pBASE': 'BASE',
    'pHEX': 'HEX',
    'eMAXI': 'MAXI',
    'eDECI': 'DECI',
    'eLUCKY': 'LUCKY',
    'eTRIO': 'TRIO',
    'eBASE': 'BASE',
    'eHEX': 'HEX'
  };
  
  return baseTokenMap[ticker] || ticker;
};

// MAXI token addresses (important tokens to highlight)
const maxiTokenAddresses = [
  '0x352511c9bc5d47dbc122883ed9353e987d10a3ba', // weMAXI
  '0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89', // weDECI
  '0x8924f56df76ca9e7babb53489d7bef4fb7caff19', // weLUCKY
  '0x0f3c6134f4022d85127476bc4d3787860e5c5569', // weTRIO
  '0xda073388422065fe8d3b5921ec2ae475bae57bed', // weBASE
  '0xd63204ffcefd8f8cbf7390bbcd78536468c085a2', // pMAXI
  '0x969af590981bb9d19ff38638fa3bd88aed13603a', // pDECI
  '0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e', // pLUCKY
  '0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9', // pTRIO
  '0xb39490b46d02146f59e80c6061bb3e56b824d672', // pBASE
];

// Cache to remember which logos have failed to load
const failedLogos = new Set<string>();
// Cache to remember which format works for each symbol (svg or png)
const formatCache = new Map<string, 'svg' | 'png'>();

// TokenLogo component with proper caching to prevent flashing
function TokenLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  // Extract symbol from alt text for caching
  const symbol = alt;
  
  // Determine the best format to try (check cache first, then default to original src)
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(() => failedLogos.has(src));
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isClient) {
      setCurrentSrc(src);
      setHasError(failedLogos.has(src));
    }
  }, [src, isClient]);

  const handleError = useCallback(() => {
    // If this is a placeholder URL, don't try alternatives
    if (src.includes('placeholder') || src.includes('via.placeholder')) {
      setHasError(true);
      return;
    }
    
    // Try alternative formats/extensions
    const baseUrl = src.replace(/\.(svg|png|jpg|jpeg)$/i, '');
    const extensions = ['svg', 'png', 'jpg', 'jpeg'];
    
    for (const ext of extensions) {
      const altSrc = `${baseUrl}.${ext}`;
      if (altSrc !== src && !failedLogos.has(altSrc)) {
        setCurrentSrc(altSrc);
        return;
      }
    }
    
    // If all attempts failed, cache the failure and show fallback
    failedLogos.add(src);
    setHasError(true);
  }, [src]);

  const handleLoad = useCallback(() => {
    // Cache the working URL for future use
    formatCache.set(symbol, currentSrc.split('.').pop() as 'svg' | 'png');
  }, [symbol, currentSrc]);

  // During SSR, show fallback immediately
  if (!isClient) {
    return (
      <div 
        className={`${className} bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold`}
      >
        $
      </div>
    );
  }

  // If image failed to load or is known missing, show the fallback icon immediately
  if (hasError) {
    return (
      <div 
        className={`${className} bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold`}
      >
        $
      </div>
    );
  }

  return (
    <img 
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
      onLoad={handleLoad}
      draggable="false"
    />
  );
}

export function OpenPositionsTable() {
  const [activeTab, setActiveTab] = useState<'all' | 'featured'>('featured');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingDots, setLoadingDots] = useState(1);
  
  const { 
    contractName, 
    contractOwner, 
    contractSymbol, 
    totalSupply, 
    orderCounter,
    allOrders, 
    activeOrders, 
    completedOrders, 
    cancelledOrders, 
    isLoading, 
    error 
  } = useOpenPositions();

  // Get unique sell token addresses for price fetching
  const sellTokenAddresses = allOrders ? [...new Set(allOrders.map(order => 
    order.orderDetailsWithId.orderDetails.sellToken
  ))] : [];
  
  // Debug: Log the token addresses we're trying to fetch prices for
  useEffect(() => {
    if (sellTokenAddresses.length > 0) {
      console.log('Fetching prices for token addresses:', sellTokenAddresses);
    }
  }, [sellTokenAddresses]);
  
  const { prices: tokenPrices } = useTokenPrices(sellTokenAddresses);
  
  // Debug: Log the fetched prices
  useEffect(() => {
    if (Object.keys(tokenPrices).length > 0) {
      console.log('Fetched token prices:', tokenPrices);
    }
  }, [tokenPrices]);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  // Loading dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="bg-black text-white p-4 sm:p-6 pb-24 sm:pb-24 relative overflow-hidden">
        <div className="max-w-[1000px] py-8 mx-auto w-full relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              delay: 0.2,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="bg-black border-2 border-white/10 rounded-full p-6 text-center max-w-[660px] w-full mx-auto"
          >
            <div className="text-gray-400">
              Loading OTC positions
              <span className="w-[24px] text-left inline-block">
                {'.'.repeat(loadingDots)}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto mb-8 mt-8">
        <div className="bg-white/5 p-6 rounded-lg border-2 border-white/10">
          <h2 className="text-xl font-bold mb-4">Contract Information</h2>
          <div className="text-red-500">
            <p className="font-semibold mb-2">Unable to connect to the OTC contract</p>
            <p className="text-sm mb-2">Error: {error.message}</p>
            <p className="text-sm text-gray-400 mb-2">
              Contract Address: 0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2
            </p>
            <p className="text-sm text-gray-400 mb-3">
              RPC Endpoint: https://rpc.pulsechain.com
            </p>
            <p className="text-sm text-gray-400 mb-3">
              This could mean:
            </p>
            <ul className="text-sm text-gray-400 ml-4 mb-4">
              <li>• The contract is not deployed at the expected address</li>
              <li>• The contract is not properly initialized</li>
              <li>• There's a network connectivity issue</li>
              <li>• The RPC endpoint is not responding correctly</li>
              <li>• Check the browser console for detailed error messages</li>
            </ul>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-white text-black rounded hover:bg-white/80"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }


  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  const formatPercentage = (percentage: number) => {
    // If it's a whole number (no decimals), don't show decimals
    if (percentage % 1 === 0) {
      return `${percentage}%`;
    }
    // Otherwise, round to 1 decimal place
    return `${percentage.toFixed(1)}%`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Cancelled';
      case 2: return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-green-400';
      case 1: return 'text-red-400';
      case 2: return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };


  // Get the orders to display based on active tab and status filter
  const getDisplayOrders = () => {
    let orders = [];
    
    // First filter by token type (Maxi Tokens or All)
    switch (activeTab) {
      case 'all':
        orders = allOrders;
        break;
      case 'featured': 
        orders = allOrders.filter(order => {
          const sellToken = order.orderDetailsWithId.orderDetails.sellToken.toLowerCase();
          
          // Check if sell token is in MAXI tokens
          const sellTokenInList = maxiTokenAddresses.some(addr => 
            sellToken === addr.toLowerCase()
          );
          
          // Check if any buy token is in MAXI tokens
          const buyTokensInList = order.orderDetailsWithId.orderDetails.buyTokensIndex.some(buyTokenIndex => {
            const buyTokenInfo = getTokenInfoByIndex(Number(buyTokenIndex));
            const buyTokenAddress = buyTokenInfo.address?.toLowerCase() || '';
            return maxiTokenAddresses.some(addr => 
              buyTokenAddress === addr.toLowerCase()
            );
          });
          
          return sellTokenInList || buyTokensInList;
        });
        break;
      default:
        orders = allOrders;
    }
    
    // Then filter by status
    switch (statusFilter) {
      case 'active':
        return orders.filter(order => order.orderDetailsWithId.status === 0);
      case 'completed':
        return orders.filter(order => order.orderDetailsWithId.status === 2);
      case 'cancelled':
        return orders.filter(order => order.orderDetailsWithId.status === 1);
      case 'all':
      default:
        return orders;
    }
  };

  const displayOrders = getDisplayOrders();
  
  // Helper function to get orders for current token filter
  const getOrdersForCurrentTokenFilter = () => {
    switch (activeTab) {
      case 'all':
        return allOrders;
      case 'featured': 
        return allOrders.filter(order => {
          const sellToken = order.orderDetailsWithId.orderDetails.sellToken.toLowerCase();
          
          // Check if sell token is in MAXI tokens
          const sellTokenInList = maxiTokenAddresses.some(addr => 
            sellToken === addr.toLowerCase()
          );
          
          // Check if any buy token is in MAXI tokens
          const buyTokensInList = order.orderDetailsWithId.orderDetails.buyTokensIndex.some(buyTokenIndex => {
            const buyTokenInfo = getTokenInfoByIndex(Number(buyTokenIndex));
            const buyTokenAddress = buyTokenInfo.address?.toLowerCase() || '';
            return maxiTokenAddresses.some(addr => 
              buyTokenAddress === addr.toLowerCase()
            );
          });
          
          return sellTokenInList || buyTokensInList;
        });
      default:
        return allOrders;
    }
  };

  // Calculate counts for current token filter
  const currentTokenOrders = getOrdersForCurrentTokenFilter();
  const activeCountForCurrentToken = currentTokenOrders.filter(order => order.orderDetailsWithId.status === 0).length;
  const completedCountForCurrentToken = currentTokenOrders.filter(order => order.orderDetailsWithId.status === 2).length;
  const cancelledCountForCurrentToken = currentTokenOrders.filter(order => order.orderDetailsWithId.status === 1).length;
  
  // Calculate MAXI token orders count
  const maxiTokenOrders = allOrders.filter(order => {
    const sellToken = order.orderDetailsWithId.orderDetails.sellToken.toLowerCase();
    
    // Check if sell token is in MAXI tokens
    const sellTokenInList = maxiTokenAddresses.some(addr => 
      sellToken === addr.toLowerCase()
    );
    
    // Check if any buy token is in MAXI tokens
    const buyTokensInList = order.orderDetailsWithId.orderDetails.buyTokensIndex.some(buyTokenIndex => {
      const buyTokenInfo = getTokenInfoByIndex(Number(buyTokenIndex));
      const buyTokenAddress = buyTokenInfo.address?.toLowerCase() || '';
      return maxiTokenAddresses.some(addr => 
        buyTokenAddress === addr.toLowerCase()
      );
    });
    
    return sellTokenInList || buyTokensInList;
  });

  // Debug: Log some sample orders to see their structure
  if (allOrders.length > 0) {
    console.log('Sample order structure:', {
      orderId: allOrders[0].orderDetailsWithId.orderId,
      sellToken: allOrders[0].orderDetailsWithId.orderDetails.sellToken,
      buyTokensIndex: allOrders[0].orderDetailsWithId.orderDetails.buyTokensIndex,
      maxiTokenAddresses
    });
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto mb-8 mt-8">
      {/* Status Filter - Centered with Label Styling */}
      <div className="flex justify-right gap-3 mb-4">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 rounded-full transition-all duration-300 border ${
            statusFilter === 'active'
              ? 'bg-green-500/20 text-green-400 border-green-400'
              : 'bg-gray-800/50 text-gray-300 border-gray-600 hover:bg-gray-700/50'
          }`}
        >
          Active ({activeCountForCurrentToken})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 rounded-full transition-all duration-300 border ${
            statusFilter === 'completed'
              ? 'bg-blue-500/20 text-blue-400 border-blue-400'
              : 'bg-gray-800/50 text-gray-300 border-gray-600 hover:bg-gray-700/50'
          }`}
        >
          Completed ({completedCountForCurrentToken})
        </button>
        <button
          onClick={() => setStatusFilter('cancelled')}
          className={`px-4 py-2 rounded-full transition-all duration-300 border ${
            statusFilter === 'cancelled'
              ? 'bg-red-500/20 text-red-400 border-red-400'
              : 'bg-gray-800/50 text-gray-300 border-gray-600 hover:bg-gray-700/50'
          }`}
        >
          Cancelled ({cancelledCountForCurrentToken})
        </button>
      </div>

      <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
        {/* Horizontal scroll container with hidden scrollbar */}
        <div className="overflow-x-auto scrollbar-hide">
          {!displayOrders || displayOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No {activeTab} {statusFilter} orders found</p>
              <p className="text-sm text-gray-500 mb-4">
                The contract shows {orderCounter ? orderCounter.toString() : 'unknown'} total orders, but there's a bug in the contract's view functions.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  <strong>Contract Issue:</strong> The `_viewUserOrdersWithStatus` function has a bug on line 711 
                  where it checks `userOrders[index].status` instead of `orders[_user][index].status`.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-[800px] text-lg">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 pb-4 border-b border-white/10">
              <div className="text-gray-400 text-sm font-medium text-center">Token For Sale</div>
              <div className="text-gray-400 text-sm font-medium text-right pr-4">Sell Amount</div>
              <div className="text-gray-400 text-sm font-medium text-left pl-16">Asking For</div>
              <div className="text-gray-400 text-sm font-medium text-center">Fill Status %</div>
              <div className="text-gray-400 text-sm font-medium text-center">Seller</div>
              <div className="text-gray-400 text-sm font-medium text-center">Status</div>
              <div className="text-gray-400 text-sm font-medium text-center">Expires</div>
            </div>

            {/* Table Rows */}
            <div className="space-y-1">
              {displayOrders.map((order, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 py-8 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <TokenLogo 
                      src={getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).logo}
                      alt={getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).ticker}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-white text-sm font-medium">
                      {getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).ticker}
                    </span>
                  </div>
                  <div className="flex flex-col items-end justify-center pr-4">
                    {(() => {
                      const sellTokenAddress = order.orderDetailsWithId.orderDetails.sellToken;
                      const sellTokenInfo = getTokenInfo(sellTokenAddress);
                      const tokenAmount = parseFloat(formatEther(order.orderDetailsWithId.orderDetails.sellAmount));
                      const tokenPrice = tokenPrices[sellTokenAddress]?.price || 0;
                      const usdValue = tokenAmount * tokenPrice;
                      
                      // Debug: Log calculation details
                      if (sellTokenInfo.ticker === 'PLSX') {
                        console.log('PLSX Debug:', {
                          tokenAddress: sellTokenAddress,
                          ticker: sellTokenInfo.ticker,
                          tokenAmount,
                          tokenPrice,
                          usdValue,
                          priceData: tokenPrices[sellTokenAddress]
                        });
                      }
                      
                      return (
                        <>
                          <span className="text-green-400 font-mono text-xs">
                            {formatUSD(usdValue)}
                          </span>
                          <span className="text-white font-mono text-sm">
                            {formatAmount(formatEther(order.orderDetailsWithId.orderDetails.sellAmount))}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col justify-center space-y-1 pl-16">
                    {order.orderDetailsWithId.orderDetails.buyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                      const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
                      return (
                        <div key={idx} className="flex items-center space-x-2">
                          <TokenLogo 
                            src={tokenInfo.logo}
                            alt={tokenInfo.ticker}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-white text-sm font-medium">
                            {tokenInfo.ticker}
                          </span>
                          <span className="text-gray-400 text-xs font-mono">
                            {formatAmount(formatEther(order.orderDetailsWithId.orderDetails.buyAmounts[idx]))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-white text-sm">
                      {formatPercentage(100 - ((Number(order.orderDetailsWithId.remainingExecutionPercentage) / 1e18) * 100))}
                    </span>
                    <div className="w-full max-w-[60px] h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(100 - ((Number(order.orderDetailsWithId.remainingExecutionPercentage) / 1e18) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => copyToClipboard(order.userDetails.orderOwner)}
                      className="px-3 py-1 rounded-full bg-gray-800/50 text-white border border-gray-600 hover:bg-gray-700/50 transition-all duration-300 font-mono text-xs"
                    >
                      {formatAddress(order.userDetails.orderOwner)}
                    </button>
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      order.orderDetailsWithId.status === 0 
                        ? 'bg-green-500/20 text-green-400 border-green-400' 
                        : order.orderDetailsWithId.status === 1
                        ? 'bg-red-500/20 text-red-400 border-red-400'
                        : 'bg-blue-500/20 text-blue-400 border-blue-400'
                    }`}>
                      {getStatusText(order.orderDetailsWithId.status)}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm text-center">
                    {formatTimestamp(Number(order.orderDetailsWithId.orderDetails.expirationTime))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
