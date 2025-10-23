'use client';

import { useState, useRef, useEffect } from 'react';
import NumberFlow from '@number-flow/react';
import { useAccount, useBalance } from 'wagmi';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { formatEther, parseEther } from 'viem';
import { formatTokenTicker } from '@/utils/tokenUtils';

interface LimitOrderFormProps {
  onTokenChange?: (sellToken: string | undefined, buyToken: string | undefined) => void;
  onLimitPriceChange?: (price: number | undefined) => void;
  onInvertPriceDisplayChange?: (inverted: boolean) => void;
  externalLimitPrice?: number; // Allow external control of limit price
  externalMarketPrice?: number; // Allow external control of market price (from chart)
  isDragging?: boolean; // Disable animations during drag for performance
  onTransactionStart: () => void;
  onTransactionEnd: () => void;
  onTransactionSuccess: (message: string, txHash: string) => void;
  onTransactionError: (error: string) => void;
}

interface TokenOption {
  a: string;
  ticker: string;
  name: string;
  decimals: number;
}

// Helper to format large numbers with commas
const formatNumberWithCommas = (value: string): string => {
  if (!value) return '';
  const parts = value.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Helper to remove commas for calculations
const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

// Helper to format balance display
const formatBalanceDisplay = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.000001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return formatNumberWithCommas(num.toFixed(2));
};

// Helper to format display value with max 4 significant figures
const formatDisplayValue = (value: number): number => {
  if (value === 0) return 0;
  
  // Get the order of magnitude
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  
  // For numbers >= 1, show up to 4 decimal places but remove trailing zeros
  if (magnitude >= 0) {
    // Round to 4 decimal places
    const rounded = Math.round(value * 10000) / 10000;
    return rounded;
  }
  
  // For numbers < 1, use 4 significant figures
  const precision = 4 - magnitude - 1;
  return parseFloat(value.toPrecision(4));
};

// Helper to format calculated values for state (avoids floating point issues in input)
const formatCalculatedValue = (value: number): string => {
  if (value === 0) return '';
  
  // Round to 4 decimal places to avoid floating point precision issues
  const rounded = Math.round(value * 10000) / 10000;
  
  // Convert to string and remove trailing zeros after decimal point
  let str = rounded.toString();
  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }
  
  return str;
};

export function LimitOrderForm({
  onTokenChange,
  onLimitPriceChange,
  onInvertPriceDisplayChange,
  externalLimitPrice,
  externalMarketPrice,
  isDragging = false,
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
}: LimitOrderFormProps) {
  const { isConnected, address } = useAccount();
  const [sellToken, setSellToken] = useState<TokenOption | null>(null);
  const [buyToken, setBuyToken] = useState<TokenOption | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [pricePercentage, setPricePercentage] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'above' | 'below'>('above'); // Track if buying above or below market
  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [sellSearchQuery, setSellSearchQuery] = useState('');
  const [buySearchQuery, setBuySearchQuery] = useState('');
  const [invertPriceDisplay, setInvertPriceDisplay] = useState(false); // Toggle for price display
  const [isBuyInputFocused, setIsBuyInputFocused] = useState(false); // Track buy input focus
  const [isSellInputFocused, setIsSellInputFocused] = useState(false); // Track sell input focus
  
  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);
  const sellSearchRef = useRef<HTMLInputElement>(null);
  const buySearchRef = useRef<HTMLInputElement>(null);
  const buyInputRef = useRef<HTMLInputElement>(null);
  const sellInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef<boolean>(true); // Track if this is the initial load
  const limitPriceSetByUserRef = useRef<boolean>(false); // Track if user has set limit price
  const lastEditedInputRef = useRef<'sell' | 'buy' | null>(null); // Track which input was last edited
  const isUpdatingFromOtherInputRef = useRef<boolean>(false); // Prevent circular updates

  // Use all tokens from TOKEN_CONSTANTS
  const availableTokens = TOKEN_CONSTANTS.filter(t => t.a && t.dexs); // Only tokens with addresses and dex pairs

  // Filter tokens based on search queries
  const filteredSellTokens = availableTokens.filter(token => 
    token.ticker.toLowerCase().includes(sellSearchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(sellSearchQuery.toLowerCase())
  );

  const filteredBuyTokens = availableTokens.filter(token => 
    token.ticker.toLowerCase().includes(buySearchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(buySearchQuery.toLowerCase())
  );

  // Get all token addresses for price fetching
  const tokenAddresses = availableTokens.map(t => t.a).filter(Boolean) as string[];
  
  // Fetch token prices
  const { prices, isLoading: pricesLoading } = useTokenPrices(tokenAddresses);

  // Fetch sell token balance
  const { data: sellTokenBalance, isLoading: sellBalanceLoading } = useBalance({
    address: address,
    token: sellToken?.a as `0x${string}` | undefined,
    enabled: !!address && !!sellToken && sellToken.a !== '0x000000000000000000000000000000000000dead',
  });

  // Fetch PLS balance if sell token is PLS
  const { data: plsBalance } = useBalance({
    address: address,
    enabled: !!address && sellToken?.a === '0x000000000000000000000000000000000000dead',
  });

  // Set default tokens - check localStorage first, then use defaults
  useEffect(() => {
    // Try to load from localStorage
    const savedSellToken = localStorage.getItem('limitOrderSellToken');
    const savedBuyToken = localStorage.getItem('limitOrderBuyToken');
    
    if (savedSellToken) {
      const token = availableTokens.find(t => t.a?.toLowerCase() === savedSellToken.toLowerCase());
      if (token) {
        setSellToken(token);
      }
    } else {
      // Default to PLS
      const defaultSell = availableTokens.find(t => t.a?.toLowerCase() === '0x000000000000000000000000000000000000dead'); // PLS
      if (defaultSell) setSellToken(defaultSell);
    }
    
    if (savedBuyToken) {
      const token = availableTokens.find(t => t.a?.toLowerCase() === savedBuyToken.toLowerCase());
      if (token) {
        setBuyToken(token);
      }
    } else {
      // Default to HEX
      const defaultBuy = availableTokens.find(t => t.a?.toLowerCase() === '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'); // HEX
      if (defaultBuy) setBuyToken(defaultBuy);
    }
  }, []);

  // Notify parent of token changes
  useEffect(() => {
    if (onTokenChange && (sellToken || buyToken)) {
      onTokenChange(sellToken?.a, buyToken?.a);
    }
  }, [sellToken, buyToken, onTokenChange]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sellDropdownRef.current && !sellDropdownRef.current.contains(event.target as Node)) {
        setShowSellDropdown(false);
        setSellSearchQuery(''); // Clear search on close
      }
      if (buyDropdownRef.current && !buyDropdownRef.current.contains(event.target as Node)) {
        setShowBuyDropdown(false);
        setBuySearchQuery(''); // Clear search on close
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (showSellDropdown && sellSearchRef.current) {
      sellSearchRef.current.focus();
    }
  }, [showSellDropdown]);

  useEffect(() => {
    if (showBuyDropdown && buySearchRef.current) {
      buySearchRef.current.focus();
    }
  }, [showBuyDropdown]);

  const getTokenLogo = (ticker: string) => {
    return `/coin-logos/${ticker}.svg`;
  };

  // Get actual balance (PLS or token)
  const actualBalance = sellToken?.a === '0x000000000000000000000000000000000000dead' 
    ? plsBalance 
    : sellTokenBalance;

  // Calculate USD values
  const sellTokenPrice = sellToken ? prices[sellToken.a]?.price || 0 : 0;
  const buyTokenPrice = buyToken ? prices[buyToken.a]?.price || 0 : 0;
  
  const sellAmountNum = sellAmount ? parseFloat(removeCommas(sellAmount)) : 0;
  const buyAmountNum = buyAmount ? parseFloat(removeCommas(buyAmount)) : 0;
  
  const sellUsdValue = sellAmountNum * sellTokenPrice;
  const buyUsdValue = buyAmountNum * buyTokenPrice;

  // Calculate market price (ratio) - use external price from chart if available
  const internalMarketPrice = sellTokenPrice && buyTokenPrice ? sellTokenPrice / buyTokenPrice : 0;
  const marketPrice = externalMarketPrice || internalMarketPrice;

  // Sync external limit price changes (from chart drag)
  useEffect(() => {
    if (externalLimitPrice !== undefined) {
      // Mark that limit price has been set (by drag)
      limitPriceSetByUserRef.current = true;
      isInitialLoadRef.current = false;
      
      // Just update local state - don't send back to parent (prevents feedback loop)
      setLimitPrice(externalLimitPrice.toString());
      
      // Update buy amount based on new limit price if we have a sell amount
      if (sellAmountNum > 0) {
        const newBuyAmount = sellAmountNum * externalLimitPrice;
        setBuyAmount(formatCalculatedValue(newBuyAmount));
      }
      
      // Calculate and update percentage
      if (marketPrice > 0) {
        const percentageAboveMarket = ((externalLimitPrice - marketPrice) / marketPrice) * 100;
        setPricePercentage(percentageAboveMarket);
      }
    }
  }, [externalLimitPrice, sellAmountNum, marketPrice]);

  // Calculate limit price and percentage ONLY during initial load
  useEffect(() => {
    // Only calculate limit price automatically during initial page load
    // After that, user must explicitly set it via drag or direct input
    if (!isInitialLoadRef.current || limitPriceSetByUserRef.current) {
      return;
    }
    
    if (sellAmountNum > 0 && buyAmountNum > 0 && marketPrice > 0) {
      const currentLimitPrice = buyAmountNum / sellAmountNum;
      const limitPriceNum = parseFloat(limitPrice);
      
      // Only update if it's actually different
      if (Math.abs(currentLimitPrice - limitPriceNum) > 0.00000001) {
      setLimitPrice(currentLimitPrice.toFixed(8));
      
      // Notify parent of limit price change
      if (onLimitPriceChange) {
        onLimitPriceChange(currentLimitPrice);
      }
      
      // Calculate percentage above market
      const percentageAboveMarket = ((currentLimitPrice - marketPrice) / marketPrice) * 100;
      setPricePercentage(percentageAboveMarket);
        
        // Mark initial load as complete after first calculation
        isInitialLoadRef.current = false;
      }
    }
  }, [sellAmountNum, buyAmountNum, marketPrice, limitPrice, onLimitPriceChange]);

  // When tokens change, reset flags and recalculate limit price based on the same percentage
  useEffect(() => {
    // Reset flags when tokens change so it can recalculate
    isInitialLoadRef.current = true;
    limitPriceSetByUserRef.current = false;
    
    if (sellToken && buyToken && pricePercentage !== null && sellAmountNum > 0 && marketPrice > 0) {
      // Calculate new limit price with the same percentage
      const newLimitPrice = marketPrice * (1 + pricePercentage / 100);
      
      // Only update if it's different from current (avoid loops)
      const currentLimitPriceNum = parseFloat(limitPrice);
      if (Math.abs(newLimitPrice - currentLimitPriceNum) > 0.00000001) {
        setLimitPrice(newLimitPrice.toFixed(8));
        
        // Calculate new buy amount
        const newBuyAmount = sellAmountNum * newLimitPrice;
        setBuyAmount(formatCalculatedValue(newBuyAmount));
        
        // Notify parent of limit price change
        if (onLimitPriceChange) {
          onLimitPriceChange(newLimitPrice);
        }
      }
    }
  }, [sellToken?.a, buyToken?.a, marketPrice]);

  // When sell amount changes, update buy amount based on limit price
  useEffect(() => {
    // Only update if:
    // 1. We have a valid limit price (user has set it)
    // 2. The last edited input was the sell input (not the buy input)
    // 3. We're not in initial load phase
    // 4. We're not currently updating from the other input (prevent circular updates)
    if (limitPriceSetByUserRef.current && 
        lastEditedInputRef.current === 'sell' && 
        !isInitialLoadRef.current &&
        !isUpdatingFromOtherInputRef.current &&
        sellAmountNum > 0) {
      
      const limitPriceNum = parseFloat(limitPrice);
      if (limitPriceNum > 0) {
        isUpdatingFromOtherInputRef.current = true;
        const newBuyAmount = sellAmountNum * limitPriceNum;
        setBuyAmount(formatCalculatedValue(newBuyAmount));
        isUpdatingFromOtherInputRef.current = false;
      }
      
      // Clear the last edited flag after processing
      lastEditedInputRef.current = null;
    }
  }, [sellAmountNum, limitPrice]);

  // When buy amount changes, update sell amount based on limit price
  useEffect(() => {
    // Only update if:
    // 1. We have a valid limit price (user has set it)
    // 2. The last edited input was the buy input (not the sell input)
    // 3. We're not in initial load phase
    // 4. We're not currently updating from the other input (prevent circular updates)
    if (limitPriceSetByUserRef.current && 
        lastEditedInputRef.current === 'buy' && 
        !isInitialLoadRef.current &&
        !isUpdatingFromOtherInputRef.current &&
        buyAmountNum > 0) {
      
      const limitPriceNum = parseFloat(limitPrice);
      if (limitPriceNum > 0) {
        isUpdatingFromOtherInputRef.current = true;
        const newSellAmount = buyAmountNum / limitPriceNum;
        setSellAmount(formatCalculatedValue(newSellAmount));
        isUpdatingFromOtherInputRef.current = false;
      }
      
      // Clear the last edited flag after processing
      lastEditedInputRef.current = null;
    }
  }, [buyAmountNum, limitPrice]);

  const handleCreateOrder = () => {
    // This would integrate with your existing CreatePositionModal logic
    // Order creation logic
  };

  const handlePercentageClick = (percentage: number) => {
    if (!marketPrice) return;
    
    // If no sell amount entered, default to 1 unit
    let effectiveSellAmount = sellAmountNum;
    if (!sellAmountNum || sellAmountNum === 0) {
      effectiveSellAmount = 1;
      setSellAmount('1');
    }
    
    // Mark that user has set the limit price
    limitPriceSetByUserRef.current = true;
    isInitialLoadRef.current = false;
    
    // Apply percentage based on direction (above = positive, below = negative)
    const adjustedPercentage = priceDirection === 'above' ? percentage : -percentage;
    
    // Set percentage to null for market price (0%), so it doesn't show
    setPricePercentage(percentage === 0 ? null : adjustedPercentage);
    const newPrice = marketPrice * (1 + adjustedPercentage / 100);
    setLimitPrice(newPrice.toFixed(8));
    
    // Notify parent of limit price change
    if (onLimitPriceChange) {
      onLimitPriceChange(newPrice);
    }
    
    // Calculate new buy amount based on limit price
    const newBuyAmount = effectiveSellAmount * newPrice;
    setBuyAmount(formatCalculatedValue(newBuyAmount));
  };

  const handleMaxSellAmount = () => {
    if (!actualBalance) return;
    
    let maxAmount = actualBalance.formatted;
    
    // For PLS, reserve some for gas
    if (sellToken?.a === '0x000000000000000000000000000000000000dead') {
      const balanceNum = parseFloat(maxAmount);
      const reservedGas = 0.1; // Reserve 0.1 PLS for gas
      maxAmount = Math.max(0, balanceNum - reservedGas).toString();
    }
    
    // Set without formatting to avoid cursor issues
    setSellAmount(maxAmount);
  };

  const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Mark that sell input was edited
    lastEditedInputRef.current = 'sell';
    setSellAmount(value);
  };

  const handleBuyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Mark that buy input was edited
    lastEditedInputRef.current = 'buy';
    setBuyAmount(value);
  };

  const handleSwapTokens = () => {
    // Swap the tokens
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    
    // Swap the amounts
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
    
    // Flip the price direction (above ↔ below)
    setPriceDirection(prev => prev === 'above' ? 'below' : 'above');
    
    // Update localStorage
    if (buyToken) {
      localStorage.setItem('limitOrderSellToken', buyToken.a);
    }
    if (tempToken) {
      localStorage.setItem('limitOrderBuyToken', tempToken.a);
    }
    
    // Clear limit price and percentage since they're no longer valid
    setLimitPrice('');
    setPricePercentage(null);
    
    // Notify parent of limit price change (cleared)
    if (onLimitPriceChange) {
      onLimitPriceChange(undefined);
    }
    
    // Notify parent of token change
    if (onTokenChange) {
      onTokenChange(buyToken?.a, tempToken?.a);
    }
  };

  return (
    <div className="bg-black/80 backdrop-blur-sm border-2 border-[#00D9FF]  p-6 h-full shadow-[0_0_30px_rgba(0,217,255,0.3)]">
      {/* Sell Section */}
      <div className="mb-4">
        <label className="text-[#00D9FF] text-sm mb-2 block font-semibold">SELL</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={sellDropdownRef}>
          <button
            onClick={() => setShowSellDropdown(!showSellDropdown)}
            className="w-full bg-black border-2 border-[#00D9FF]  p-3 flex items-center justify-between hover:bg-[#00D9FF]/10 transition-all shadow-[0_0_10px_rgba(0,217,255,0.3)]"
          >
            <div className="flex items-center space-x-3">
              {sellToken ? (
                <>
                  <img
                    src={getTokenLogo(sellToken.ticker)}
                    alt={sellToken.ticker}
                    className="w-6 h-6 "
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <span className="text-[#00D9FF] font-medium">{formatTokenTicker(sellToken.ticker)}</span>
                </>
              ) : (
                <span className="text-[#00D9FF]/50">Select token</span>
              )}
            </div>
            <svg className="w-5 h-5 text-[#00D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showSellDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border-2 border-[#00D9FF] z-10 shadow-[0_0_20px_rgba(0,217,255,0.4)]">
              {/* Search Input */}
              <div className="sticky top-0 p-2 bg-black border-b border-[#00D9FF]/30">
                <input
                  ref={sellSearchRef}
                  type="text"
                  value={sellSearchQuery}
                  onChange={(e) => setSellSearchQuery(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full bg-black border border-[#00D9FF]/50 p-2 text-[#00D9FF] text-sm placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>
              {/* Token List */}
              <div className="max-h-60 overflow-y-auto scrollbar-hide">
                {filteredSellTokens.length === 0 ? (
                  <div className="p-4 text-center text-[#00D9FF]/50 text-sm">No tokens found</div>
                ) : (
                  filteredSellTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    // If selecting the same token as buy side, swap them
                    if (buyToken && token.a.toLowerCase() === buyToken.a.toLowerCase()) {
                      // Swap tokens
                      setBuyToken(sellToken);
                      setSellToken(token);
                      if (sellToken) {
                        localStorage.setItem('limitOrderBuyToken', sellToken.a);
                      }
                      localStorage.setItem('limitOrderSellToken', token.a);
                    } else {
                      setSellToken(token);
                      localStorage.setItem('limitOrderSellToken', token.a);
                    }
                    setShowSellDropdown(false);
                    setSellSearchQuery(''); // Clear search on selection
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-[#00D9FF]/10 transition-all text-left border-b border-[#00D9FF]/20 last:border-b-0"
                >
                  <img
                    src={getTokenLogo(token.ticker)}
                    alt={token.ticker}
                    className="w-6 h-6 "
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <div>
                    <div className="text-[#00D9FF] font-medium">{formatTokenTicker(token.ticker)}</div>
                    <div className="text-[#00D9FF]/70 text-xs">{token.name}</div>
                  </div>
                </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount Input with NumberFlow Display */}
        <div className="relative">
          {!isSellInputFocused && sellAmountNum > 0 ? (
            <div 
              onClick={() => {
                setIsSellInputFocused(true);
                setTimeout(() => sellInputRef.current?.focus(), 0);
              }}
              className="w-full bg-black border-2 border-[#00D9FF] p-3 text-[#00D9FF] text-2xl min-h-[58px] flex items-center cursor-text"
            >
              <NumberFlow 
                value={formatDisplayValue(sellAmountNum)}
                format={{
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4
                }}
                animated={!isDragging}
              />
            </div>
          ) : (
        <input
              ref={sellInputRef}
          type="text"
          value={sellAmount}
          onChange={handleSellAmountChange}
              onFocus={() => setIsSellInputFocused(true)}
              onBlur={() => setIsSellInputFocused(false)}
          placeholder="0.00"
              className="w-full bg-black border-2 border-[#00D9FF] p-3 text-[#00D9FF] text-2xl placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#00D9FF] focus:shadow-[0_0_15px_rgba(0,217,255,0.5)] transition-all"
        />
          )}
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="text-[#00D9FF] text-sm font-semibold">
            {sellUsdValue > 0 ? (
              <NumberFlow 
                value={sellUsdValue} 
                format={{ 
                  style: 'currency', 
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }}
                animated={!isDragging}
              />
            ) : '$0.00'}
          </div>
          {sellToken && actualBalance && (
            <div className="flex items-center gap-2">
              <span className="text-[#00D9FF]/70 text-xs">
                Balance: {formatBalanceDisplay(actualBalance.formatted)}
              </span>
              <button
                type="button"
                onClick={handleMaxSellAmount}
                className="text-[#00D9FF] hover:text-white text-xs font-bold transition-colors"
              >
                MAX
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={handleSwapTokens}
          type="button"
          className="bg-black border-2 border-[#00D9FF] p-2  hover:bg-[#00D9FF]/20 transition-all shadow-[0_0_15px_rgba(0,217,255,0.4)]"
        >
          <svg className="w-5 h-5 text-[#00D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {/* Buy Section */}
      <div className="mb-4">
        <label className="text-[#00D9FF] text-sm mb-2 block font-semibold">BUY</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={buyDropdownRef}>
          <button
            onClick={() => setShowBuyDropdown(!showBuyDropdown)}
            className="w-full bg-black border-2 border-[#00D9FF]  p-3 flex items-center justify-between hover:bg-[#00D9FF]/10 transition-all shadow-[0_0_10px_rgba(0,217,255,0.3)]"
          >
            <div className="flex items-center space-x-3">
              {buyToken ? (
                <>
                  <img
                    src={getTokenLogo(buyToken.ticker)}
                    alt={buyToken.ticker}
                    className="w-6 h-6 "
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <span className="text-[#00D9FF] font-medium">{formatTokenTicker(buyToken.ticker)}</span>
                </>
              ) : (
                <span className="text-[#00D9FF]/50">Select token</span>
              )}
            </div>
            <svg className="w-5 h-5 text-[#00D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showBuyDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border-2 border-[#00D9FF] z-10 shadow-[0_0_20px_rgba(0,217,255,0.4)]">
              {/* Search Input */}
              <div className="sticky top-0 p-2 bg-black border-b border-[#00D9FF]/30">
                <input
                  ref={buySearchRef}
                  type="text"
                  value={buySearchQuery}
                  onChange={(e) => setBuySearchQuery(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full bg-black border border-[#00D9FF]/50 p-2 text-[#00D9FF] text-sm placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>
              {/* Token List */}
              <div className="max-h-60 overflow-y-auto scrollbar-hide">
                {filteredBuyTokens.length === 0 ? (
                  <div className="p-4 text-center text-[#00D9FF]/50 text-sm">No tokens found</div>
                ) : (
                  filteredBuyTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    // If selecting the same token as sell side, swap them
                    if (sellToken && token.a.toLowerCase() === sellToken.a.toLowerCase()) {
                      // Swap tokens
                      setSellToken(buyToken);
                      setBuyToken(token);
                      if (buyToken) {
                        localStorage.setItem('limitOrderSellToken', buyToken.a);
                      }
                      localStorage.setItem('limitOrderBuyToken', token.a);
                    } else {
                      setBuyToken(token);
                      localStorage.setItem('limitOrderBuyToken', token.a);
                    }
                    setShowBuyDropdown(false);
                    setBuySearchQuery(''); // Clear search on selection
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-[#00D9FF]/10 transition-all text-left border-b border-[#00D9FF]/20 last:border-b-0"
                >
                  <img
                    src={getTokenLogo(token.ticker)}
                    alt={token.ticker}
                    className="w-6 h-6 "
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <div>
                    <div className="text-[#00D9FF] font-medium">{formatTokenTicker(token.ticker)}</div>
                    <div className="text-[#00D9FF]/70 text-xs">{token.name}</div>
                  </div>
                </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount Input with NumberFlow Display */}
        <div className="relative">
          {!isBuyInputFocused && buyAmountNum > 0 ? (
            <div 
              onClick={() => {
                setIsBuyInputFocused(true);
                setTimeout(() => buyInputRef.current?.focus(), 0);
              }}
              className="w-full bg-black border-2 border-[#00D9FF] p-3 text-[#00D9FF] text-2xl min-h-[58px] flex items-center cursor-text"
            >
              <NumberFlow 
                value={formatDisplayValue(buyAmountNum)}
                format={{
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4
                }}
                animated={!isDragging}
              />
            </div>
          ) : (
        <input
              ref={buyInputRef}
          type="text"
          value={buyAmount}
          onChange={handleBuyAmountChange}
              onFocus={() => setIsBuyInputFocused(true)}
              onBlur={() => setIsBuyInputFocused(false)}
          placeholder="0.00"
              className="w-full bg-black border-2 border-[#00D9FF] p-3 text-[#00D9FF] text-2xl placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#00D9FF] focus:shadow-[0_0_15px_rgba(0,217,255,0.5)] transition-all"
        />
          )}
        </div>
        <div className="text-[#00D9FF] text-sm mt-2 font-semibold">
          {buyUsdValue > 0 ? (
            <NumberFlow 
              value={buyUsdValue} 
              format={{ 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }}
              animated={!isDragging}
            />
          ) : '$0.00'}
        </div>
      </div>

      {/* Limit Price Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <label className="text-[#FF0080] text-sm font-semibold">LIMIT PRICE</label>
            {sellToken && buyToken && (
              <button
                type="button"
                onClick={() => {
                  const newInverted = !invertPriceDisplay;
                  setInvertPriceDisplay(newInverted);
                  onInvertPriceDisplayChange?.(newInverted);
                }}
                className="p-1 text-[#FF0080] hover:text-white transition-colors"
                title={`Show price in ${invertPriceDisplay ? formatTokenTicker(buyToken.ticker) : formatTokenTicker(sellToken.ticker)}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            )}
          </div>
          {pricePercentage !== null && Math.abs(pricePercentage) > 0.01 && (
            <span className="text-sm font-bold text-[#FF0080]">
              <NumberFlow 
                value={pricePercentage}
                format={{
                  signDisplay: 'always',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: Math.abs(pricePercentage) >= 10 ? 1 : 2
                }}
                suffix="%"
                animated={!isDragging}
              />
            </span>
          )}
        </div>
        <div className="relative">
          <div className="w-full bg-black border-2 border-[#FF0080] p-3 text-[#FF0080] text-lg min-h-[52px] flex items-center">
            {limitPrice && parseFloat(limitPrice) > 0 ? (
            <NumberFlow 
            value={(() => {
              const price = parseFloat(limitPrice);
              if (invertPriceDisplay && price > 0) {
                  return 1 / price;
              }
                return price;
            })()}
              format={{
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              }}
              animated={!isDragging}
            />
            ) : (
              <span className="text-[#FF0080]/30">0.00000000</span>
            )}
          </div>
          {sellToken && buyToken && limitPrice && parseFloat(limitPrice) > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF0080]/70 text-sm font-medium pointer-events-none">
              {invertPriceDisplay ? formatTokenTicker(sellToken.ticker) : formatTokenTicker(buyToken.ticker)}
            </div>
          )}
        </div>
      </div>

      {/* Percentage Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handlePercentageClick(0)}
          className="flex-1 py-2 bg-black border-2 border-[#FF0080]  text-sm text-[#FF0080] hover:bg-[#FF0080] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(255,0,128,0.3)]"
        >
          Market
        </button>
        <button
          onClick={() => handlePercentageClick(1)}
          className="flex-1 py-2 bg-black border-2 border-[#FF0080]  text-sm text-[#FF0080] hover:bg-[#FF0080] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(255,0,128,0.3)]"
        >
          1% {(() => {
            const showUp = priceDirection === 'above';
            return invertPriceDisplay ? (showUp ? '↓' : '↑') : (showUp ? '↑' : '↓');
          })()}
        </button>
        <button
          onClick={() => handlePercentageClick(2)}
          className="flex-1 py-2 bg-black border-2 border-[#FF0080]  text-sm text-[#FF0080] hover:bg-[#FF0080] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(255,0,128,0.3)]"
        >
          2% {(() => {
            const showUp = priceDirection === 'above';
            return invertPriceDisplay ? (showUp ? '↓' : '↑') : (showUp ? '↑' : '↓');
          })()}
        </button>
        <button
          onClick={() => handlePercentageClick(5)}
          className="flex-1 py-2 bg-black border-2 border-[#FF0080]  text-sm text-[#FF0080] hover:bg-[#FF0080] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(255,0,128,0.3)]"
        >
          5% {(() => {
            const showUp = priceDirection === 'above';
            return invertPriceDisplay ? (showUp ? '↓' : '↑') : (showUp ? '↑' : '↓');
          })()}
        </button>
        <button
          onClick={() => handlePercentageClick(10)}
          className="flex-1 py-2 bg-black border-2 border-[#FF0080]  text-sm text-[#FF0080] hover:bg-[#FF0080] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(255,0,128,0.3)]"
        >
          10% {(() => {
            const showUp = priceDirection === 'above';
            return invertPriceDisplay ? (showUp ? '↓' : '↑') : (showUp ? '↑' : '↓');
          })()}
        </button>
      </div>

      {/* You Receive Section */}
      <div className="mb-6 pb-6 border-b-2 border-[#00D9FF]/30 space-y-2">
        {/* Fee Line */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#00D9FF]/70 font-medium">Fee (0.2%)</span>
          <span className="text-[#00D9FF]/70">
            {buyAmountNum > 0 ? (
              <>
                <NumberFlow 
                  value={formatDisplayValue(buyAmountNum * 0.002)}
                  format={{
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4
                  }}
                  animated={!isDragging}
                />
                {' '}{buyToken?.ticker || ''}
              </>
            ) : '0.00'}
          </span>
        </div>
        {/* You Receive Line */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#00D9FF] font-medium">You receive (after fee)</span>
          <span className="text-[#00D9FF] font-bold">
            {buyAmountNum > 0 ? (
              <>
                <NumberFlow 
                  value={formatDisplayValue(buyAmountNum * 0.998)}
                  format={{
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4
                  }}
                  animated={!isDragging}
                />
                {' '}{buyToken?.ticker || ''}
              </>
            ) : '0.00'}
          </span>
        </div>
      </div>

      {/* Connect/Submit Button */}
      {!isConnected ? (
        <button className="w-full py-4 bg-black text-[#00D9FF] border-2 border-[#00D9FF]  font-bold hover:bg-[#00D9FF] hover:text-black transition-all shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:shadow-[0_0_30px_rgba(0,217,255,0.8)] text-lg tracking-wider">
          CONNECT WALLET
        </button>
      ) : (
        <button
          onClick={handleCreateOrder}
          className="w-full py-4 bg-[#00D9FF] text-black border-2 border-[#00D9FF]  font-bold hover:bg-black hover:text-[#00D9FF] text-lg tracking-wider"
        >
          CREATE LIMIT ORDER
        </button>
      )}
    </div>
  );
}
