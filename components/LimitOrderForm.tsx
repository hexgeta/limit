'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { WHITELISTED_TOKENS } from '@/constants/crypto';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { formatEther, parseEther } from 'viem';

interface LimitOrderFormProps {
  onTokenChange?: (sellToken: string | undefined, buyToken: string | undefined) => void;
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

export function LimitOrderForm({
  onTokenChange,
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
  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  
  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);

  const whitelistedTokens = WHITELISTED_TOKENS;

  // Get all token addresses for price fetching
  const tokenAddresses = whitelistedTokens.map(t => t.a).filter(Boolean) as string[];
  
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
      const token = whitelistedTokens.find(t => t.a?.toLowerCase() === savedSellToken.toLowerCase());
      if (token) {
        setSellToken(token);
      }
    } else {
      // Default to USDL
      const defaultSell = whitelistedTokens.find(t => t.a?.toLowerCase() === '0x0deed1486bc52aa0d3e6f8849cec5add6598a162'); // USDL
      if (defaultSell) setSellToken(defaultSell);
    }
    
    if (savedBuyToken) {
      const token = whitelistedTokens.find(t => t.a?.toLowerCase() === savedBuyToken.toLowerCase());
      if (token) {
        setBuyToken(token);
      }
    } else {
      // Default to HEX
      const defaultBuy = whitelistedTokens.find(t => t.a?.toLowerCase() === '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'); // HEX
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
      }
      if (buyDropdownRef.current && !buyDropdownRef.current.contains(event.target as Node)) {
        setShowBuyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Calculate market price (ratio)
  const marketPrice = sellTokenPrice && buyTokenPrice ? sellTokenPrice / buyTokenPrice : 0;

  // Calculate limit price and percentage
  useEffect(() => {
    if (sellAmountNum > 0 && buyAmountNum > 0 && marketPrice > 0) {
      const currentLimitPrice = buyAmountNum / sellAmountNum;
      setLimitPrice(currentLimitPrice.toFixed(8));
      
      // Calculate percentage above market
      const percentageAboveMarket = ((currentLimitPrice - marketPrice) / marketPrice) * 100;
      setPricePercentage(percentageAboveMarket);
    }
  }, [sellAmountNum, buyAmountNum, marketPrice]);

  const handleCreateOrder = () => {
    // This would integrate with your existing CreatePositionModal logic
    console.log('Creating order:', {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      limitPrice,
      pricePercentage,
    });
  };

  const handlePercentageClick = (percentage: number) => {
    if (!marketPrice || !sellAmountNum) return;
    
    // Set percentage to null for market price (0%), so it doesn't show
    setPricePercentage(percentage === 0 ? null : percentage);
    const newPrice = marketPrice * (1 + percentage / 100);
    setLimitPrice(newPrice.toFixed(8));
    
    // Calculate new buy amount based on limit price
    const newBuyAmount = sellAmountNum * newPrice;
    setBuyAmount(formatNumberWithCommas(newBuyAmount.toFixed(8)));
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
    
    setSellAmount(formatNumberWithCommas(maxAmount));
  };

  const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setSellAmount(value);
  };

  const handleBuyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setBuyAmount(value);
  };

  return (
    <div className="bg-black border-2 border-[#00D9FF] rounded-lg p-6 h-full shadow-[0_0_30px_rgba(0,217,255,0.3)]">
      {/* Sell Section */}
      <div className="mb-4">
        <label className="text-[#FF0080] text-sm mb-2 block font-semibold drop-shadow-[0_0_5px_rgba(255,0,128,0.5)]">SELL</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={sellDropdownRef}>
          <button
            onClick={() => setShowSellDropdown(!showSellDropdown)}
            className="w-full bg-black border-2 border-[#00D9FF] rounded-lg p-3 flex items-center justify-between hover:bg-[#00D9FF]/10 transition-all shadow-[0_0_10px_rgba(0,217,255,0.3)]"
          >
            <div className="flex items-center space-x-3">
              {sellToken ? (
                <>
                  <img
                    src={getTokenLogo(sellToken.ticker)}
                    alt={sellToken.ticker}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <span className="text-[#00D9FF] font-medium">{sellToken.ticker}</span>
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border-2 border-[#00D9FF] rounded-lg max-h-60 overflow-y-auto scrollbar-hide z-10 shadow-[0_0_20px_rgba(0,217,255,0.4)]">
              {whitelistedTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    setSellToken(token);
                    localStorage.setItem('limitOrderSellToken', token.a);
                    setShowSellDropdown(false);
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-[#00D9FF]/10 transition-all text-left border-b border-[#00D9FF]/20 last:border-b-0"
                >
                  <img
                    src={getTokenLogo(token.ticker)}
                    alt={token.ticker}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <div>
                    <div className="text-[#00D9FF] font-medium">{token.ticker}</div>
                    <div className="text-[#39FF14] text-xs">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <input
          type="text"
          value={sellAmount}
          onChange={handleSellAmountChange}
          placeholder="0.00"
          className="w-full bg-black border-2 border-[#FF0080] rounded-lg p-3 text-[#00D9FF] text-2xl placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#FF0080] focus:shadow-[0_0_15px_rgba(255,0,128,0.5)] transition-all"
        />
        <div className="flex justify-between items-center mt-2">
          <div className="text-[#39FF14] text-sm font-semibold">
            {sellUsdValue > 0 ? `$${formatNumberWithCommas(sellUsdValue.toFixed(2))}` : '$0.00'}
          </div>
          {sellToken && actualBalance && (
            <div className="flex items-center gap-2">
              <span className="text-[#00D9FF] text-xs">
                Balance: {formatBalanceDisplay(actualBalance.formatted)}
              </span>
              <button
                type="button"
                onClick={handleMaxSellAmount}
                className="text-[#FF0080] hover:text-[#39FF14] text-xs font-bold transition-colors drop-shadow-[0_0_5px_rgba(255,0,128,0.5)]"
              >
                MAX
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center mb-4">
        <button className="bg-black border-2 border-[#FF0080] p-2 rounded-full hover:bg-[#FF0080]/20 transition-all shadow-[0_0_15px_rgba(255,0,128,0.4)]">
          <svg className="w-5 h-5 text-[#FF0080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {/* Buy Section */}
      <div className="mb-4">
        <label className="text-[#39FF14] text-sm mb-2 block font-semibold drop-shadow-[0_0_5px_rgba(57,255,20,0.5)]">BUY</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={buyDropdownRef}>
          <button
            onClick={() => setShowBuyDropdown(!showBuyDropdown)}
            className="w-full bg-black border-2 border-[#39FF14] rounded-lg p-3 flex items-center justify-between hover:bg-[#39FF14]/10 transition-all shadow-[0_0_10px_rgba(57,255,20,0.3)]"
          >
            <div className="flex items-center space-x-3">
              {buyToken ? (
                <>
                  <img
                    src={getTokenLogo(buyToken.ticker)}
                    alt={buyToken.ticker}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <span className="text-[#39FF14] font-medium">{buyToken.ticker}</span>
                </>
              ) : (
                <span className="text-[#39FF14]/50">Select token</span>
              )}
            </div>
            <svg className="w-5 h-5 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showBuyDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border-2 border-[#39FF14] rounded-lg max-h-60 overflow-y-auto scrollbar-hide z-10 shadow-[0_0_20px_rgba(57,255,20,0.4)]">
              {whitelistedTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    setBuyToken(token);
                    localStorage.setItem('limitOrderBuyToken', token.a);
                    setShowBuyDropdown(false);
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-[#39FF14]/10 transition-all text-left border-b border-[#39FF14]/20 last:border-b-0"
                >
                  <img
                    src={getTokenLogo(token.ticker)}
                    alt={token.ticker}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/coin-logos/default.svg';
                    }}
                  />
                  <div>
                    <div className="text-[#39FF14] font-medium">{token.ticker}</div>
                    <div className="text-[#00D9FF] text-xs">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <input
          type="text"
          value={buyAmount}
          onChange={handleBuyAmountChange}
          placeholder="0.00"
          className="w-full bg-black border-2 border-[#39FF14] rounded-lg p-3 text-[#00D9FF] text-2xl placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all"
        />
        <div className="text-[#39FF14] text-sm mt-2 font-semibold">
          {buyUsdValue > 0 ? `$${formatNumberWithCommas(buyUsdValue.toFixed(2))}` : '$0.00'}
        </div>
      </div>

      {/* Limit Price Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[#FF0080] text-sm font-semibold drop-shadow-[0_0_5px_rgba(255,0,128,0.5)]">LIMIT PRICE</label>
          {pricePercentage !== null && Math.abs(pricePercentage) > 0.01 && (
            <span className={`text-sm font-bold drop-shadow-[0_0_10px_rgba(57,255,20,0.8)] ${pricePercentage > 0 ? 'text-[#39FF14]' : 'text-[#FF0080]'}`}>
              {pricePercentage > 0 ? '+' : ''}{Math.round(pricePercentage)}%
            </span>
          )}
        </div>
        <input
          type="text"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          placeholder="0.00000000"
          className="w-full bg-black border-2 border-[#FF0080] rounded-lg p-3 text-[#00D9FF] text-lg placeholder-[#00D9FF]/30 focus:outline-none focus:border-[#FF0080] transition-all cursor-not-allowed opacity-80"
          disabled
        />
      </div>

      {/* Percentage Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handlePercentageClick(0)}
          className="flex-1 py-2 bg-black border-2 border-[#00D9FF] rounded-lg text-sm text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]"
        >
          Market
        </button>
        <button
          onClick={() => handlePercentageClick(1)}
          className="flex-1 py-2 bg-black border-2 border-[#00D9FF] rounded-lg text-sm text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]"
        >
          1% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(2)}
          className="flex-1 py-2 bg-black border-2 border-[#00D9FF] rounded-lg text-sm text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]"
        >
          2% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(5)}
          className="flex-1 py-2 bg-black border-2 border-[#00D9FF] rounded-lg text-sm text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]"
        >
          5% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(10)}
          className="flex-1 py-2 bg-black border-2 border-[#00D9FF] rounded-lg text-sm text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black transition-all font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]"
        >
          10% ↑
        </button>
      </div>

      {/* You Receive Section */}
      <div className="mb-6 pb-6 border-b-2 border-[#FF0080]/30">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#00D9FF] font-medium">You receive (incl. fee)</span>
          <span className="text-[#39FF14] font-bold drop-shadow-[0_0_5px_rgba(57,255,20,0.5)]">
            {buyAmountNum > 0 ? `${formatNumberWithCommas(buyAmountNum.toFixed(8))} ${buyToken?.ticker || ''}` : '0.00'}
          </span>
        </div>
      </div>

      {/* Connect/Submit Button */}
      {!isConnected ? (
        <button className="w-full py-4 bg-black text-[#FF0080] border-2 border-[#FF0080] rounded-full font-bold hover:bg-[#FF0080] hover:text-black transition-all shadow-[0_0_20px_rgba(255,0,128,0.5)] hover:shadow-[0_0_30px_rgba(255,0,128,0.8)] text-lg tracking-wider">
          CONNECT EVM WALLET
        </button>
      ) : (
        <button
          onClick={handleCreateOrder}
          className="w-full py-4 bg-[#FF0080] text-black border-2 border-[#FF0080] rounded-full font-bold hover:bg-black hover:text-[#FF0080] transition-all shadow-[0_0_20px_rgba(255,0,128,0.5)] hover:shadow-[0_0_30px_rgba(255,0,128,0.8)] text-lg tracking-wider"
        >
          CREATE LIMIT ORDER
        </button>
      )}
    </div>
  );
}
