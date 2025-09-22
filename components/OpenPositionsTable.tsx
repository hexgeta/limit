'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDollarSign, ChevronDown } from 'lucide-react';
import { useOpenPositions } from '@/hooks/contracts/useOpenPositions';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { formatEther } from 'viem';
import { getTokenInfo, getTokenInfoByIndex, formatAddress, formatTokenTicker } from '@/utils/tokenUtils';

// Sorting types
type SortField = 'sellAmount' | 'askingFor' | 'progress' | 'owner' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

// Copy to clipboard function
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // You could add a toast notification here if you have one
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

// Format number without scientific notation
const formatAmount = (amount: string) => {
  const num = parseFloat(amount);
  if (num < 0.000001 && num > 0) {
    return num.toFixed(8);
  }
  if (num >= 10000) {
    return num.toLocaleString();
  }
  return amount;
};

// Format number with commas for large numbers
const formatNumberWithCommas = (value: string) => {
  if (!value) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString();
};

// Remove commas from number string
const removeCommas = (value: string) => {
  return value.replace(/,/g, '');
};

// Format USD amount without scientific notation
const formatUSD = (amount: number) => {
  if (amount < 0.000001) {
    return `$${amount.toFixed(8)}`;
  }
  if (amount < 0.01) {
    return `$${amount.toFixed(6)}`;
  }
  if (amount < 1) {
    return `$${amount.toFixed(4)}`;
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

// Simplified TokenLogo component that always shows fallback for missing logos
function TokenLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [hasError, setHasError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleError = useCallback(() => {
      setHasError(true);
  }, []);

  // Debug logging for logo loading
  useEffect(() => {
    if (alt === 'DARK' || alt === 'BRIBE' || alt === 'OG') {
      console.log(`TokenLogo debug for ${alt}:`, {
        src,
        hasError,
        isClient,
        shouldShowFallback: !isClient || hasError || src.includes('default.svg')
      });
    }
  }, [alt, src, hasError, isClient]);

  // If it's already the default.svg or has error, show Lucide icon fallback
  if (src.includes('default.svg') || hasError || !isClient) {
    return (
      <CircleDollarSign 
        className={`${className} text-white`}
      />
    );
  }

  return (
    <img 
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
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
  const [showMotion, setShowMotion] = useState(true);
  const animationCompleteRef = useRef(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Expanded positions state
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  
  // Offer input state
  const [offerInputs, setOfferInputs] = useState<{[orderId: string]: {[tokenAddress: string]: string}}>({});
  
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
  
  // Get unique buy token addresses for price fetching
  const buyTokenAddresses = allOrders ? [...new Set(allOrders.flatMap(order => {
    const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
    if (buyTokensIndex && Array.isArray(buyTokensIndex)) {
      return buyTokensIndex.map((tokenIndex: bigint) => {
        const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
        return tokenInfo.address;
      });
    }
    return [];
  }))] : [];
  
  // Combine all unique token addresses for price fetching
  const allTokenAddresses = [...new Set([...sellTokenAddresses, ...buyTokenAddresses])];
  
  // Use contract addresses directly for price fetching
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(allTokenAddresses);
  
  // Check if we have valid price data for all tokens
  const hasValidPriceData = useMemo(() => {
    return tokenPrices && allTokenAddresses.length > 0 && 
           allTokenAddresses.some(address => tokenPrices[address]?.price > 0);
  }, [tokenPrices, allTokenAddresses]);
  
  // Overall loading state - only for initial load
  const isTableLoading = (pricesLoading || !hasValidPriceData) && isInitialLoad;
  
  // Handle animation completion without state updates that cause re-renders
  const handleAnimationComplete = useCallback(() => {
    if (!animationCompleteRef.current) {
      animationCompleteRef.current = true;
      // Switch to regular divs after a delay to avoid any flashing
      setTimeout(() => setShowMotion(false), 50);
    }
  }, []);
  
  // Debug: Log the token addresses we're trying to fetch prices for
  useEffect(() => {
    if (sellTokenAddresses.length > 0) {
      console.log('Fetching prices for token addresses:', sellTokenAddresses);
    }
  }, [sellTokenAddresses]);
  
  // Debug: Log the fetched prices
  useEffect(() => {
    if (Object.keys(tokenPrices).length > 0) {
      console.log('Fetched token prices:', tokenPrices);
    }
  }, [tokenPrices]);

  // Debug: Log token info for specific tokens
  useEffect(() => {
    if (sellTokenAddresses.length > 0) {
      console.log('Token info debug:');
      sellTokenAddresses.forEach(address => {
        const tokenInfo = getTokenInfo(address);
        console.log(`${address} -> ${tokenInfo.ticker}:`, {
          ticker: tokenInfo.ticker,
          name: tokenInfo.name,
          logo: tokenInfo.logo,
          hasPrice: !!tokenPrices[address]
        });
      });
    }
  }, [sellTokenAddresses, tokenPrices]);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  // Effect to handle initial load completion
  useEffect(() => {
    if (hasValidPriceData && !pricesLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [hasValidPriceData, pricesLoading, isInitialLoad]);

  // Loading dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle position expansion
  const togglePositionExpansion = (orderId: string) => {
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
        // Scroll the expanded position to the top after a short delay
        setTimeout(() => {
          const element = document.querySelector(`[data-order-id="${orderId}"]`);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);
      }
      return newSet;
    });
  };



  // Handle input change for offer amounts
  const handleOfferInputChange = (orderId: string, tokenAddress: string, value: string, order: any) => {
    // Find the maximum allowed amount for this token
    const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
    const buyAmounts = order.orderDetailsWithId.orderDetails.buyAmounts;
    
    let maxAllowedAmount = '';
    let tokenIndex = -1;
    if (buyTokensIndex && buyAmounts) {
      tokenIndex = buyTokensIndex.findIndex((idx: bigint) => {
        const tokenInfo = getTokenInfoByIndex(Number(idx));
        return tokenInfo.address === tokenAddress;
      });
      
      if (tokenIndex !== -1 && buyAmounts[tokenIndex]) {
        maxAllowedAmount = formatEther(buyAmounts[tokenIndex]);
      }
    }
    
    // Validate the input amount
    const inputAmount = parseFloat(value);
    const maxAmount = parseFloat(maxAllowedAmount);
    
    // If input is valid and within limits, or if it's empty, allow it
    if (value === '' || (!isNaN(inputAmount) && inputAmount <= maxAmount)) {
      // Calculate the percentage for this token
      let percentage = 0;
      if (inputAmount > 0 && maxAmount > 0) {
        percentage = inputAmount / maxAmount;
      }
      
      // Update all other tokens to maintain the same percentage
      const newInputs: {[tokenAddress: string]: string} = {
        ...offerInputs[orderId],
        [tokenAddress]: value
      };
      
      // If we have a valid percentage, apply it to all other tokens
      if (percentage > 0 && tokenIndex !== -1) {
        buyTokensIndex.forEach((idx: bigint, idxNum: number) => {
          if (idxNum !== tokenIndex) {
            const otherTokenInfo = getTokenInfoByIndex(Number(idx));
            const otherMaxAmount = parseFloat(formatEther(buyAmounts[idxNum]));
            const otherAmount = (otherMaxAmount * percentage).toString();
            newInputs[otherTokenInfo.address] = otherAmount;
          }
        });
      } else if (value === '') {
        // If clearing this input, clear all others too
        buyTokensIndex.forEach((idx: bigint) => {
          const otherTokenInfo = getTokenInfoByIndex(Number(idx));
          newInputs[otherTokenInfo.address] = '';
        });
      }
      
      setOfferInputs(prev => ({
        ...prev,
        [orderId]: newInputs
      }));
    }
    // If input exceeds maximum, don't update the state (effectively preventing the input)
  };

  // Handle percentage fill
  const handlePercentageFill = (order: any, percentage: number) => {
    const orderId = order.orderDetailsWithId.orderId.toString();
    const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
    const buyAmounts = order.orderDetailsWithId.orderDetails.buyAmounts;
    
    if (!buyTokensIndex || !Array.isArray(buyTokensIndex)) {
      console.error('buyTokensIndex is not available or not an array:', buyTokensIndex);
      return;
    }
    
    if (!buyAmounts || !Array.isArray(buyAmounts)) {
      console.error('buyAmounts is not available or not an array:', buyAmounts);
      return;
    }
    
    const newInputs: {[tokenAddress: string]: string} = {};
    
    // Fill each token with the specified percentage of its maximum amount
    buyTokensIndex.forEach((tokenIndex: bigint, idx: number) => {
      const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
      if (tokenInfo.address && buyAmounts[idx]) {
        const maxAmount = parseFloat(formatEther(buyAmounts[idx]));
        const fillAmount = (maxAmount * percentage).toString();
        newInputs[tokenInfo.address] = fillAmount;
      }
    });
    
    setOfferInputs(prev => ({
      ...prev,
      [orderId]: newInputs
    }));
  };

  // Handle clear all inputs
  const handleClearInputs = (order: any) => {
    const orderId = order.orderDetailsWithId.orderId.toString();
    const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
    
    if (!buyTokensIndex || !Array.isArray(buyTokensIndex)) {
      console.error('buyTokensIndex is not available or not an array:', buyTokensIndex);
      return;
    }
    
    const newInputs: {[tokenAddress: string]: string} = {};
    
    // Clear all inputs
    buyTokensIndex.forEach((tokenIndex: bigint) => {
      const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
      if (tokenInfo.address) {
        newInputs[tokenInfo.address] = '';
      }
    });
    
    setOfferInputs(prev => ({
      ...prev,
      [orderId]: newInputs
    }));
  };

  // Memoize the display orders to prevent unnecessary recalculations
  const displayOrders = useMemo(() => {
    if (!allOrders) return [];
    
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
    let filteredOrders = [];
    switch (statusFilter) {
      case 'active':
        filteredOrders = orders.filter(order => order.orderDetailsWithId.status === 0);
        break;
      case 'completed':
        filteredOrders = orders.filter(order => order.orderDetailsWithId.status === 2);
        break;
      case 'cancelled':
        filteredOrders = orders.filter(order => order.orderDetailsWithId.status === 1);
        break;
      case 'all':
      default:
        filteredOrders = orders;
    }
    
    // Apply sorting
    const sortedOrders = [...filteredOrders].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'sellAmount':
          const aSellTokenAddress = a.orderDetailsWithId.orderDetails.sellToken;
          const bSellTokenAddress = b.orderDetailsWithId.orderDetails.sellToken;
          const aTokenAmount = parseFloat(formatEther(a.orderDetailsWithId.orderDetails.sellAmount));
          const bTokenAmount = parseFloat(formatEther(b.orderDetailsWithId.orderDetails.sellAmount));
          const aTokenPrice = tokenPrices[aSellTokenAddress]?.price || 0;
          const bTokenPrice = tokenPrices[bSellTokenAddress]?.price || 0;
          const aUsdValue = aTokenAmount * aTokenPrice;
          const bUsdValue = bTokenAmount * bTokenPrice;
          comparison = aUsdValue - bUsdValue;
          break;
        case 'askingFor':
          const aAsking = a.orderDetailsWithId.orderDetails.buyTokensIndex.length;
          const bAsking = b.orderDetailsWithId.orderDetails.buyTokensIndex.length;
          comparison = aAsking - bAsking;
          break;
        case 'progress':
          const aProgress = 100 - ((Number(a.orderDetailsWithId.remainingExecutionPercentage) / 1e18) * 100);
          const bProgress = 100 - ((Number(b.orderDetailsWithId.remainingExecutionPercentage) / 1e18) * 100);
          comparison = aProgress - bProgress;
          break;
        case 'owner':
          comparison = a.userDetails.orderOwner.localeCompare(b.userDetails.orderOwner);
          break;
        case 'status':
          comparison = a.orderDetailsWithId.status - b.orderDetailsWithId.status;
          break;
        case 'date':
          comparison = Number(a.orderDetailsWithId.orderDetails.expirationTime) - Number(b.orderDetailsWithId.orderDetails.expirationTime);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sortedOrders;
  }, [allOrders, activeTab, statusFilter, sortField, sortDirection, tokenPrices]);

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

  // Memoize counts for current token filter
  const currentTokenOrders = useMemo(() => getOrdersForCurrentTokenFilter(), [allOrders, activeTab]);
  const activeCountForCurrentToken = useMemo(() => 
    currentTokenOrders.filter(order => order.orderDetailsWithId.status === 0).length, 
    [currentTokenOrders]
  );
  const completedCountForCurrentToken = useMemo(() => 
    currentTokenOrders.filter(order => order.orderDetailsWithId.status === 2).length, 
    [currentTokenOrders]
  );
  const cancelledCountForCurrentToken = useMemo(() => 
    currentTokenOrders.filter(order => order.orderDetailsWithId.status === 1).length, 
    [currentTokenOrders]
  );

  // Loading state - only for initial load
  if (!mounted || isTableLoading) {
    return (
      <div className="bg-black text-white p-4 sm:p-6 pb-24 sm:pb-24 relative overflow-hidden">
        <div className="max-w-[1000px] pb-8 mx-auto w-full relative">
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
            <div className="text-gray-400 text-lg">
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
          <h2 className="text-xl font-bold mb-4">AgoráX Contract Information</h2>
          <div className="text-red-500">
            <p className="font-semibold mb-2">Unable to connect to the AgoráX OTC contract</p>
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

  // Container component - motion or regular div
  const Container = showMotion ? motion.div : 'div';
  const StatusFilter = showMotion ? motion.div : 'div';
  const TableContainer = showMotion ? motion.div : 'div';

  return (
    <Container 
      {...(showMotion ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { 
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
        },
        onAnimationComplete: handleAnimationComplete
      } : {})}
      className="w-full max-w-[1200px] mx-auto mb-8 mt-8"
    >
      {/* Status Filter - Centered with Label Styling */}
      <StatusFilter 
        {...(showMotion ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { 
          duration: 0.4,
          delay: 0.2,
          ease: [0.23, 1, 0.32, 1]
          }
        } : {})}
        className="flex justify-right gap-3 mb-4"
      >
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
      </StatusFilter>

      <TableContainer 
        {...(showMotion ? {
          initial: { opacity: 0, y: 15 },
          animate: { 
            opacity: 1, 
            y: 0,
            scale: expandedPositions.size > 0 ? 0.95 : 1,
            height: expandedPositions.size > 0 ? 'fit-content' : 'auto'
          },
          transition: { 
          duration: 0.5,
          delay: 0.3,
          ease: [0.23, 1, 0.32, 1]
          },
          layout: true
        } : {})}
        className={`bg-black border-2 border-white/10 rounded-2xl p-6 transition-all duration-500 ease-out ${
          expandedPositions.size > 0 ? 'shadow-2xl shadow-white/10' : ''
        }`}
        style={{ 
          height: expandedPositions.size > 0 ? 'fit-content' : 'auto',
          minHeight: expandedPositions.size > 0 ? 'auto' : '400px',
          maxHeight: expandedPositions.size > 0 ? 'fit-content' : 'none',
          width: expandedPositions.size > 0 ? 'fit-content' : '100%',
          margin: expandedPositions.size > 0 ? '0 auto' : '0',
          transform: expandedPositions.size > 0 ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          padding: expandedPositions.size > 0 ? '1rem' : '1.5rem'
        }}
      >
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
            <motion.div 
              className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 pb-4 border-b border-white/10 ${
                expandedPositions.size > 0 ? 'px-2' : ''
              }`}
              animate={{
                scale: expandedPositions.size > 0 ? 0.98 : 1,
                opacity: expandedPositions.size > 0 ? 0.9 : 1
              }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* COLUMN 1: Token For Sale */}
              <button 
                onClick={() => handleSort('sellAmount')}
                className={`text-sm font-medium text-left hover:text-white transition-colors ${
                  sortField === 'sellAmount' ? 'text-white' : 'text-gray-400'
                }`}
              >
                For Sale {sortField === 'sellAmount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 2: Asking For */}
              <button 
                onClick={() => handleSort('askingFor')}
                className={`text-sm font-medium text-left hover:text-white transition-colors ${
                  sortField === 'askingFor' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Asking For {sortField === 'askingFor' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 3: Fill Status % */}
              <button 
                onClick={() => handleSort('progress')}
                className={`text-sm font-medium text-center ml-4 hover:text-white transition-colors ${
                  sortField === 'progress' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Fill Status % {sortField === 'progress' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 4: Seller */}
              <button 
                onClick={() => handleSort('owner')}
                className={`text-sm font-medium text-center ml-4 hover:text-white transition-colors ${
                  sortField === 'owner' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Seller {sortField === 'owner' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 5: Status */}
              <button 
                onClick={() => handleSort('status')}
                className={`text-sm font-medium text-center ml-4 hover:text-white transition-colors ${
                  sortField === 'status' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Status {sortField === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 6: Expires */}
              <button 
                onClick={() => handleSort('date')}
                className={`text-sm font-medium text-left ml-4 hover:text-white transition-colors ${
                  sortField === 'date' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Expires {sortField === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              
              {/* COLUMN 7: Actions */}
              <div className="text-sm font-medium text-right ml-4 text-gray-400">
                {/* Actions header removed - left blank */}
            </div>
            </motion.div>

            {/* Table Rows */}
                <motion.div 
              className={`space-y-1 ${expandedPositions.size > 0 ? 'pt-0' : ''}`}
              layout
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {displayOrders.map((order, index) => {
                const orderId = order.orderDetailsWithId.orderId.toString();
                const isExpanded = expandedPositions.has(orderId);
                const hasAnyExpanded = expandedPositions.size > 0;
                const shouldShow = !hasAnyExpanded || isExpanded;
                
                return (
                  <div key={index} data-order-id={orderId}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: shouldShow ? 1 : 0,
                        y: shouldShow ? 0 : -20,
                        scale: shouldShow ? 1 : 0.9
                      }}
                  transition={{ 
                    duration: 0.4,
                        delay: shouldShow ? 0.1 : 0,
                    ease: [0.23, 1, 0.32, 1]
                  }}
                      className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] items-start gap-4 ${
                        expandedPositions.size > 0 && shouldShow ? 'py-4' : 'py-8'
                      } ${
                        index < displayOrders.length - 1 && shouldShow ? 'border-b border-white/10' : ''
                      } ${expandedPositions.size > 0 && shouldShow ? 'px-2' : ''}`}
                    >
                    {/* COLUMN 1: Token For Sale Content */}
                    <div className="flex flex-col items-start space-y-1">
                    {(() => {
                      const sellTokenAddress = order.orderDetailsWithId.orderDetails.sellToken;
                      const sellTokenInfo = getTokenInfo(sellTokenAddress);
                      const tokenAmount = parseFloat(formatEther(order.orderDetailsWithId.orderDetails.sellAmount));
                      const tokenPrice = tokenPrices[sellTokenAddress]?.price || 0;
                      const usdValue = tokenAmount * tokenPrice;
                      
                      
                      return (
                        <div className="inline-block">
                          <span className={`text-lg font-medium ${tokenPrice > 0 ? 'text-white' : 'text-gray-500'} ${tokenPrice === 0 ? 'py-1' : ''}`}>
                            {tokenPrice > 0 ? formatUSD(usdValue) : '--'}
                          </span>
                          <div className="w-1/2 h-px bg-white/10 my-2"></div>
                  <div className="flex items-center space-x-2">
                    <TokenLogo 
                      src={getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).logo}
                              alt={formatTokenTicker(getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).ticker)}
                      className="w-6 h-6 rounded-full"
                    />
                            <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">
                                {formatTokenTicker(getTokenInfo(order.orderDetailsWithId.orderDetails.sellToken).ticker)}
                    </span>
                              <span className="text-gray-400 text-xs">
                                {formatAmount(formatEther(order.orderDetailsWithId.orderDetails.sellAmount))}
                              </span>
                              {tokenPrice > 0 && (
                                <span className="text-gray-500 text-xs">
                                  {formatUSD(usdValue)}
                                </span>
                              )}
                  </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* COLUMN 2: Asking For Content */}
                  <div className="flex flex-col items-start space-y-1">
                    {(() => {
                      // Calculate total USD value for all buy tokens
                      let totalUsdValue = 0;
                      const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
                      const buyAmounts = order.orderDetailsWithId.orderDetails.buyAmounts;
                      
                      if (buyTokensIndex && buyAmounts && Array.isArray(buyTokensIndex) && Array.isArray(buyAmounts)) {
                        buyTokensIndex.forEach((tokenIndex: bigint, idx: number) => {
                      const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
                          const tokenAmount = parseFloat(formatEther(buyAmounts[idx]));
                          const tokenPrice = tokenPrices[tokenInfo.address]?.price || 0;
                      const usdValue = tokenAmount * tokenPrice;
                          totalUsdValue += usdValue;
                          
                        });
                      }
                      
                      return (
                        <div className="inline-block">
                          <span className={`text-lg font-medium ${totalUsdValue > 0 ? 'text-white' : 'text-gray-500'} ${totalUsdValue === 0 ? 'py-1' : ''}`}>
                            {totalUsdValue > 0 ? formatUSD(totalUsdValue) : '--'}
                          </span>
                          <div className="w-1/2 h-px bg-white/10 my-2"></div>
                          {buyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                      const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
                            const tokenAmount = parseFloat(formatEther(buyAmounts[idx]));
                            const tokenPrice = tokenPrices[tokenInfo.address]?.price || 0;
                            const usdValue = tokenAmount * tokenPrice;
                            
                            
                      return (
                              <div key={idx} className="flex items-center space-x-2 mb-3">
                          <TokenLogo 
                            src={tokenInfo.logo}
                                  alt={formatTokenTicker(tokenInfo.ticker)}
                            className="w-6 h-6 rounded-full"
                          />
                                <div className="flex flex-col">
                          <span className="text-white text-sm font-medium">
                                    {formatTokenTicker(tokenInfo.ticker)}
                          </span>
                                  <span className="text-gray-400 text-xs">
                            {formatAmount(formatEther(order.orderDetailsWithId.orderDetails.buyAmounts[idx]))}
                          </span>
                                  {tokenPrice > 0 && (
                                    <span className="text-gray-500 text-xs">
                                      {formatUSD(usdValue)}
                                    </span>
                                  )}
                                </div>
                        </div>
                      );
                    })}
                  </div>
                      );
                    })()}
                  </div>
                  
                  {/* COLUMN 3: Fill Status % Content */}
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
                  
                  {/* COLUMN 4: Seller Content */}
                  <div className="text-center">
                    <button
                      onClick={() => copyToClipboard(order.userDetails.orderOwner)}
                        className="px-3 py-1 rounded-full bg-gray-800/50 text-white border border-gray-600 hover:bg-gray-700/50 transition-all duration-300 text-xs"
                    >
                      {formatAddress(order.userDetails.orderOwner)}
                    </button>
                  </div>
                  
                  {/* COLUMN 5: Status Content */}
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
                  
                  {/* COLUMN 6: Expires Content */}
                  <div className="text-gray-400 text-sm text-right">
                    {formatTimestamp(Number(order.orderDetailsWithId.orderDetails.expirationTime))}
                  </div>
                  
                  {/* COLUMN 7: Actions Content */}
                    <div className="text-right">
                      <button
                        onClick={() => togglePositionExpansion(order.orderDetailsWithId.orderId.toString())}
                        className="p-2 rounded-full hover:text-white transition-colors"
                      >
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform duration-200 ${
                            expandedPositions.has(order.orderDetailsWithId.orderId.toString()) ? '' : 'rotate-180'
                          }`}
                        />
                      </button>
                  </div>
                </motion.div>
                  
                  {/* Expandable Actions Shelf */}
                  <AnimatePresence>
                    {expandedPositions.has(order.orderDetailsWithId.orderId.toString()) && (
                      <motion.div
                        key={`shelf-${order.orderDetailsWithId.orderId}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl mt-2 border border-white/10 bg-white/5"
                      >
                        <div className="p-3">
                          <div className="flex flex-col space-y-2">
                            <h4 className="text-white font-medium text-xl">Your Trade</h4>
                            
                            {/* Offer Input Fields */}
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <h5 className="text-white font-medium text-xs mb-2">You pay:</h5>
                              <div className="flex flex-wrap gap-2">
                                {order.orderDetailsWithId.orderDetails.buyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                                  const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
                                  const orderId = order.orderDetailsWithId.orderId.toString();
                                  const currentAmount = offerInputs[orderId]?.[tokenInfo.address] || '';
                                  
                                  return (
                                    <div key={tokenInfo.address} className="flex items-center space-x-2 bg-white/5 rounded-lg px-3 py-2">
                                      <div className="flex items-center space-x-2">
                                        <TokenLogo 
                                          src={tokenInfo.logo}
                                          alt={formatTokenTicker(tokenInfo.ticker)}
                                          className="w-6 h-6 rounded-full"
                                        />
                                        <span className="text-white text-md font-medium">
                                          {formatTokenTicker(tokenInfo.ticker)}
                                        </span>
            </div>
                                      <div className="flex flex-col">
                                        <input
                                          type="text"
                                          value={formatNumberWithCommas(currentAmount)}
                                          onChange={(e) => handleOfferInputChange(
                                            orderId, 
                                            tokenInfo.address, 
                                            removeCommas(e.target.value),
                                            order
                                          )}
                                          className="bg-transparent border border-white/20 rounded px-2 py-1 text-white text-md max-w-32 focus:border-white/40 focus:outline-none"
                                          placeholder="0"
                                        />
          </div>
                                    </div>
                                  );
                                })}
          </div>
                              
                              {/* Percentage buttons and Clear under all inputs */}
                              <div className="mt-4 flex space-x-2">
                                <button
                                  onClick={() => handlePercentageFill(order, 1.0)}
                                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                >
                                  100%
                                </button>
                                <button
                                  onClick={() => handlePercentageFill(order, 0.5)}
                                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                >
                                  50%
                                </button>
                                <button
                                  onClick={() => handlePercentageFill(order, 0.1)}
                                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                >
                                  10%
                                </button>
                                <button
                                  onClick={() => handleClearInputs(order)}
                                  className="px-3 py-1 text-xs bg-red-500/20 text-red-400 border border-red-400 rounded hover:bg-red-500/30 transition-colors"
                                >
                                  Clear
                                </button>
                              </div>
                              
                              {/* Fee Breakdown */}
                              {(() => {
                                const orderId = order.orderDetailsWithId.orderId.toString();
                                const currentInputs = offerInputs[orderId];
                                if (!currentInputs) return null;
                                
                                // Calculate total buy amount (what buyer will pay)
                                let totalBuyAmount = 0;
                                const buyTokensIndex = order.orderDetailsWithId.orderDetails.buyTokensIndex;
                                const buyAmounts = order.orderDetailsWithId.orderDetails.buyAmounts;
                                
                                if (buyTokensIndex && buyAmounts && Array.isArray(buyTokensIndex) && Array.isArray(buyAmounts)) {
                                  buyTokensIndex.forEach((tokenIndex: bigint, idx: number) => {
                                    const tokenInfo = getTokenInfoByIndex(Number(tokenIndex));
                                    if (tokenInfo.address && currentInputs[tokenInfo.address]) {
                                      const inputAmount = parseFloat(removeCommas(currentInputs[tokenInfo.address]));
                                      if (!isNaN(inputAmount)) {
                                        totalBuyAmount += inputAmount;
                                      }
                                    }
                                  });
                                }
                                
                                if (totalBuyAmount > 0) {
                                  const platformFee = totalBuyAmount * 0.01; // 1% fee
                                  const orderOwnerReceives = totalBuyAmount - platformFee;
                                  
                                  return (
                                    <div className="mt-4 p-3 bg-white/5 rounded-lg">
                                      <h5 className="text-white font-medium mb-2">Fee Breakdown</h5>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">You Pay:</span>
                                          <span className="text-white">{formatNumberWithCommas(totalBuyAmount.toFixed(2))} tokens</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Platform Fee (1%):</span>
                                          <span className="text-white">{formatNumberWithCommas(platformFee.toFixed(2))} tokens</span>
                                        </div>
                                        <div className="border-t border-white/10 pt-1">
                                          <div className="flex justify-between">
                                            <span className="text-white font-medium">Order Owner Receives:</span>
                                            <span className="text-white font-bold">{formatNumberWithCommas(orderOwnerReceives.toFixed(2))} tokens</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Submit Section */}
                              <div className="mt-4 pt-3 border-t border-white/10">
                                <button 
                                  onClick={() => {
                                    // TODO: Implement submit logic
                                    console.log('Submitting offer for order:', order.orderDetailsWithId.orderId.toString());
                                    console.log('Offer amounts:', offerInputs[order.orderDetailsWithId.orderId.toString()]);
                                  }}
                                  className="px-6 py-2 bg-white text-black border border-white rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                                >
                                  Confirm Trade
                                </button>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-1">
                              Order ID: {order.orderDetailsWithId.orderId.toString()}
                            </div>
                          </div>
        </div>
      </motion.div>
                    )}
                  </AnimatePresence>
        </div>
                );
              })}
      </motion.div>
          </div>
        )}
        </div>
      </TableContainer>
    </Container>
  );
}
