'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WHITELISTED_TOKENS } from '@/constants/crypto';

interface LimitOrderFormProps {
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

export function LimitOrderForm({
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
}: LimitOrderFormProps) {
  const { isConnected } = useAccount();
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

  // Set default tokens
  useEffect(() => {
    const defaultSell = whitelistedTokens.find(t => t.a?.toLowerCase() === '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b'); // MAXI
    const defaultBuy = whitelistedTokens.find(t => t.a?.toLowerCase() === '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'); // HEX
    if (defaultSell) setSellToken(defaultSell);
    if (defaultBuy) setBuyToken(defaultBuy);
  }, []);

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

  const handleCreateOrder = () => {
    // This would integrate with your existing CreatePositionModal logic
    console.log('Creating order:', {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      limitPrice,
    });
  };

  const handlePercentageClick = (percentage: number) => {
    setPricePercentage(percentage);
    // Calculate new limit price based on current market price
    // This is a placeholder - you'd fetch actual market price
    const currentPrice = 0.0104; // Example
    const newPrice = currentPrice * (1 + percentage / 100);
    setLimitPrice(newPrice.toFixed(8));
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 h-full">
      {/* Sell Section */}
      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Sell</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={sellDropdownRef}>
          <button
            onClick={() => setShowSellDropdown(!showSellDropdown)}
            className="w-full bg-black border border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
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
                  <span className="text-white font-medium">{sellToken.ticker}</span>
                </>
              ) : (
                <span className="text-gray-400">Select token</span>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showSellDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg max-h-60 overflow-y-auto scrollbar-hide z-10">
              {whitelistedTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    setSellToken(token);
                    setShowSellDropdown(false);
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left"
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
                    <div className="text-white font-medium">{token.ticker}</div>
                    <div className="text-gray-400 text-xs">{token.name}</div>
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
          onChange={(e) => setSellAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white text-2xl placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
        <div className="text-gray-500 text-sm mt-2">$999.90</div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center mb-4">
        <button className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {/* Buy Section */}
      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Buy</label>
        
        {/* Token Selector */}
        <div className="relative mb-3" ref={buyDropdownRef}>
          <button
            onClick={() => setShowBuyDropdown(!showBuyDropdown)}
            className="w-full bg-black border border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
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
                  <span className="text-white font-medium">{buyToken.ticker}</span>
                </>
              ) : (
                <span className="text-gray-400">Select token</span>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showBuyDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg max-h-60 overflow-y-auto scrollbar-hide z-10">
              {whitelistedTokens.map((token) => (
                <button
                  key={token.a}
                  onClick={() => {
                    setBuyToken(token);
                    setShowBuyDropdown(false);
                  }}
                  className="w-full p-3 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left"
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
                    <div className="text-white font-medium">{token.ticker}</div>
                    <div className="text-gray-400 text-xs">{token.name}</div>
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
          onChange={(e) => setBuyAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white text-2xl placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
        <div className="text-gray-500 text-sm mt-2">$1,097.43</div>
      </div>

      {/* Limit Price Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-sm">Limit price</label>
          <span className="text-green-500 text-sm">+9.8%</span>
        </div>
        <input
          type="text"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          placeholder="0.00000000"
          className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Percentage Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handlePercentageClick(0)}
          className="flex-1 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          Market
        </button>
        <button
          onClick={() => handlePercentageClick(1)}
          className="flex-1 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          1% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(2)}
          className="flex-1 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          2% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(5)}
          className="flex-1 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          5% ↑
        </button>
        <button
          onClick={() => handlePercentageClick(10)}
          className="flex-1 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          10% ↑
        </button>
      </div>

      {/* You Receive Section */}
      <div className="mb-6 pb-6 border-b border-gray-800">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">You receive (incl. fee)</span>
          <span className="text-white">69.257194 {buyToken?.ticker || 'LINK'}</span>
        </div>
      </div>

      {/* Connect/Submit Button */}
      {!isConnected ? (
        <button className="w-full py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
          Connect EVM wallet
        </button>
      ) : (
        <button
          onClick={handleCreateOrder}
          className="w-full py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
        >
          Create Limit Order
        </button>
      )}
    </div>
  );
}
