'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight } from 'lucide-react';
import { getTokenInfo, getTokenInfoByIndex, formatTokenTicker } from '@/utils/tokenUtils';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { MORE_COINS } from '@/constants/more-coins';
import { useTokenStats } from '@/hooks/crypto/useTokenStats';

// Whitelisted tokens for OTC trading
const WHITELISTED_TOKENS = [
  '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // pHEX
  '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b', // pMAXI
  '0x6b32022693210cd2cfc466b9ac0085de8fc34ea6', // pDECI
  '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140', // pLUCKY
  '0xf55cd1e399e1cc3d95303048897a680be3313308', // pTRIO
  '0xe9f84d418b008888a992ff8c6d22389c2c3504e0', // pBASE
  '0x352511c9bc5d47dbc122883ed9353e987d10a3ba', // weMAXI
  '0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89', // weDECI
  '0x8924f56df76ca9e7babb53489d7bef4fb7caff19', // weLUCKY
  '0x0f3c6134f4022d85127476bc4d3787860e5c5569', // weTRIO
  '0xda073388422065fe8d3b5921ec2ae475bae57bed', // weBASE
  '0x57fde0a71132198BBeC939B98976993d8D89D225', // weHEX
  '0x0', // PLS
  '0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
  '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX
];

interface CreatePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenOption {
  address: string;
  ticker: string;
  name: string;
  logo: string;
}

export function CreatePositionModal({ isOpen, onClose }: CreatePositionModalProps) {
  // Default initial tokens
  const DEFAULT_SELL_TOKEN = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'; // HEX
  const DEFAULT_BUY_TOKEN = '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b'; // MAXI

  // Fetch token stats from LookIntoMaxi API
  const { tokenStats, isLoading: statsLoading, error: statsError } = useTokenStats();

  // Handle close - let AnimatePresence handle the timing
  const handleClose = () => {
    onClose();
  };

  const [sellToken, setSellToken] = useState<TokenOption | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('sellToken');
      if (stored) {
        const tokenInfo = getTokenInfo(stored);
        return {
          address: stored,
          ticker: tokenInfo.ticker,
          name: tokenInfo.name,
          logo: tokenInfo.logo
        };
      }
    }
    const tokenInfo = getTokenInfo(DEFAULT_SELL_TOKEN);
    return {
      address: DEFAULT_SELL_TOKEN,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo
    };
  });
  
  const [buyToken, setBuyToken] = useState<TokenOption | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('buyToken');
      if (stored) {
        const tokenInfo = getTokenInfo(stored);
        return {
          address: stored,
          ticker: tokenInfo.ticker,
          name: tokenInfo.name,
          logo: tokenInfo.logo
        };
      }
    }
    const tokenInfo = getTokenInfo(DEFAULT_BUY_TOKEN);
    return {
      address: DEFAULT_BUY_TOKEN,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo
    };
  });
  
  const [sellAmount, setSellAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sellAmount') || '';
    }
    return '';
  });
  
  const [buyAmount, setBuyAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('buyAmount') || '';
    }
    return '';
  });
  
  const [expirationDays, setExpirationDays] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(sessionStorage.getItem('expirationDays')) || 7;
    }
    return 7;
  });

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString();
  };

  // Helper function to remove commas for calculations
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Helper function to preserve cursor position during formatting
  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    const rawValue = removeCommas(input.value);
    
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      setter(rawValue);
      
      // Restore cursor position after state update
      setTimeout(() => {
        if (inputRef.current) {
          const formattedValue = formatNumberWithCommas(rawValue);
          const newCursorPosition = Math.min(cursorPosition, formattedValue.length);
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
  };

  // Function to swap offer and buy tokens/amounts
  const handleSwapTokens = () => {
    // Swap tokens
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    
    // Swap amounts
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };
  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  
  // Refs for dropdown containers
  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);
  const sellAmountRef = useRef<HTMLInputElement>(null);
  const buyAmountRef = useRef<HTMLInputElement>(null);

  // Helper to determine if a token should show stats (exclude HEX and other non-backed tokens)
  const shouldShowTokenStats = (token: TokenOption | null) => {
    if (!token) return false;
    const tokenKey = token.ticker.startsWith('e') ? `e${token.ticker.slice(1)}` : `p${token.ticker}`;
    return tokenStats[tokenKey] && token.ticker !== 'HEX';
  };

  const showSellStats = shouldShowTokenStats(sellToken);
  const showBuyStats = shouldShowTokenStats(buyToken);
  const gridColsClass = (showSellStats && showBuyStats) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

  // Get whitelisted token options
  const tokenOptions: TokenOption[] = WHITELISTED_TOKENS.map(address => {
    const tokenInfo = getTokenInfo(address);
    return {
      address,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo
    };
  }).filter(token => token.ticker); // Filter out any invalid tokens

  const handleCreateDeal = () => {
    // TODO: Implement actual deal creation logic
    console.log('Creating deal:', {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      expirationDays
    });
    handleClose();
  };

  const handleSellTokenSelect = (token: TokenOption) => {
    setSellToken(token);
    setShowSellDropdown(false);
  };

  const handleBuyTokenSelect = (token: TokenOption) => {
    setBuyToken(token);
    setShowBuyDropdown(false);
  };

  const handleSellDropdownToggle = () => {
    setShowSellDropdown(!showSellDropdown);
    setShowBuyDropdown(false); // Close buy dropdown when opening sell dropdown
  };

  const handleBuyDropdownToggle = () => {
    setShowBuyDropdown(!showBuyDropdown);
    setShowSellDropdown(false); // Close sell dropdown when opening buy dropdown
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sellDropdownRef.current && !sellDropdownRef.current.contains(event.target as Node)) {
        setShowSellDropdown(false);
      }
      if (buyDropdownRef.current && !buyDropdownRef.current.contains(event.target as Node)) {
        setShowBuyDropdown(false);
      }
    };

    if (showSellDropdown || showBuyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSellDropdown, showBuyDropdown]);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (sellToken) {
      sessionStorage.setItem('sellToken', sellToken.address);
    }
  }, [sellToken]);

  useEffect(() => {
    if (buyToken) {
      sessionStorage.setItem('buyToken', buyToken.address);
    }
  }, [buyToken]);

  useEffect(() => {
    sessionStorage.setItem('sellAmount', sellAmount);
  }, [sellAmount]);

  useEffect(() => {
    sessionStorage.setItem('buyAmount', buyAmount);
  }, [buyAmount]);

  useEffect(() => {
    sessionStorage.setItem('expirationDays', expirationDays.toString());
  }, [expirationDays]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="create-position-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={(definition) => {
            if (definition.opacity === 0) {
              // Exit animation completed
            }
          }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={(definition) => {
              if (definition.opacity === 0) {
                // Exit animation completed
              }
            }}
            className="bg-black border-2 border-white/10 rounded-2xl p-8 w-full max-w-2xl h-[calc(100vh-3rem)] max-h-[900px] relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Create OTC Deal</h2>
            </div>

            {/* Trade Form */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Side by Side Trade Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                {/* You Offer Section */}
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">You Offer</h3>
                
                {/* Token Selector */}
                <div className="relative mb-4" ref={sellDropdownRef}>
                  <button
                    onClick={handleSellDropdownToggle}
                    className="w-full bg-black border border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {sellToken ? (
                        <>
                          <img 
                            src={sellToken.logo} 
                            alt={sellToken.ticker}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <span className="text-white font-medium">{formatTokenTicker(sellToken.ticker)}</span>
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
                      {tokenOptions.map((token) => (
                        <button
                          key={token.address}
                          onClick={() => handleSellTokenSelect(token)}
                          className="w-full p-3 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <img 
                            src={token.logo} 
                            alt={token.ticker}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <div>
                            <div className="text-white font-medium">{formatTokenTicker(token.ticker)}</div>
                            <div className="text-gray-400 text-xs">{token.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <input
                  ref={sellAmountRef}
                  type="text"
                  placeholder="Enter amount"
                  value={formatNumberWithCommas(sellAmount)}
                  onChange={(e) => handleAmountChange(e, setSellAmount, sellAmountRef)}
                  className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                
                {/* Price conversion display */}
                {sellAmount && buyAmount && sellToken && buyToken && parseFloat(removeCommas(sellAmount)) > 0 && parseFloat(removeCommas(buyAmount)) > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    1 {formatTokenTicker(sellToken.ticker)} = {(() => {
                      const ratio = parseFloat(removeCommas(buyAmount)) / parseFloat(removeCommas(sellAmount));
                      // Use toPrecision(4) and remove trailing zeros
                      return parseFloat(ratio.toPrecision(4)).toString();
                    })()} {formatTokenTicker(buyToken.ticker)}
                  </div>
                )}
              </div>

              {/* Swap Button - Middle Column */}
              <div className="flex justify-center items-center w-fit mx-auto">
                <button
                  onClick={handleSwapTokens}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="Swap tokens and amounts"
                >
                  <ArrowLeftRight className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                </button>
              </div>

                {/* You Want Section */}
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">You Want</h3>
                
                {/* Token Selector */}
                <div className="relative mb-4" ref={buyDropdownRef}>
                  <button
                    onClick={handleBuyDropdownToggle}
                    className="w-full bg-black border border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {buyToken ? (
                        <>
                          <img 
                            src={buyToken.logo} 
                            alt={buyToken.ticker}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <span className="text-white font-medium">{formatTokenTicker(buyToken.ticker)}</span>
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
                      {tokenOptions.map((token) => (
                        <button
                          key={token.address}
                          onClick={() => handleBuyTokenSelect(token)}
                          className="w-full p-3 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <img 
                            src={token.logo} 
                            alt={token.ticker}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <div>
                            <div className="text-white font-medium">{formatTokenTicker(token.ticker)}</div>
                            <div className="text-gray-400 text-xs">{token.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <input
                  ref={buyAmountRef}
                  type="text"
                  placeholder="Enter amount"
                  value={formatNumberWithCommas(buyAmount)}
                  onChange={(e) => handleAmountChange(e, setBuyAmount, buyAmountRef)}
                  className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                
                {/* Price conversion display */}
                {sellAmount && buyAmount && sellToken && buyToken && parseFloat(removeCommas(sellAmount)) > 0 && parseFloat(removeCommas(buyAmount)) > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    1 {formatTokenTicker(buyToken.ticker)} = {(() => {
                      const ratio = parseFloat(removeCommas(sellAmount)) / parseFloat(removeCommas(buyAmount));
                      // Use toPrecision(4) and remove trailing zeros
                      return parseFloat(ratio.toPrecision(4)).toString();
                    })()} {formatTokenTicker(sellToken.ticker)}
                  </div>
                )}
                </div>
              </div>

              {/* Expiration */}
              <div className="bg-white/5 rounded-xl p-6 mt-6">
                <h3 className="text-white font-semibold mb-4">Expiration (Days)</h3>
                <input
                  type="number"
                  value={expirationDays === 0 ? '' : expirationDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or positive integers, no leading zeros
                    if (value === '') {
                      setExpirationDays(0);
                    } else if (value.match(/^[1-9]\d*$/) && parseInt(value) > 0) {
                      setExpirationDays(Number(value));
                    }
                  }}
                  placeholder="Enter days"
                  min="1"
                  className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Deal Summary - Only show when offer amount is entered */}
              {sellAmount && sellToken && parseFloat(removeCommas(sellAmount)) > 0 && (
                <div className="bg-white/5 rounded-xl p-6 mt-6">
                  <h3 className="text-white font-semibold mb-4">Deal Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Offer Amount:</span>
                      <span className="text-white font-medium">{formatNumberWithCommas(removeCommas(sellAmount))} {formatTokenTicker(sellToken.ticker)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Platform Fee (1%):</span>
                      <span className="text-white font-medium">{formatNumberWithCommas((parseFloat(removeCommas(sellAmount)) * 0.01).toFixed(2))} {formatTokenTicker(sellToken.ticker)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Total Cost:</span>
                        <span className="text-white font-bold">{formatNumberWithCommas((parseFloat(removeCommas(sellAmount)) * 1.01).toFixed(2))} {formatTokenTicker(sellToken.ticker)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Plan - Show token stats when both tokens are selected and at least one has stats */}
              {sellToken && buyToken && (showSellStats || showBuyStats) && (
                <div className="bg-white/5 rounded-xl p-6 mt-6">
                  <h3 className="text-white font-semibold mb-4">Pro Plan</h3>
                  {statsLoading ? (
                    <div className="text-gray-400 text-center py-4">Loading token stats...</div>
                  ) : statsError ? (
                    <div className="text-red-400 text-center py-4">Failed to load token stats</div>
                  ) : (
                    <div className={`grid ${gridColsClass} gap-6`}>
                      {/* Sell Token Stats */}
                      {showSellStats && (
                        <div className="space-y-3">
                        <h4 className="text-white font-medium flex items-center space-x-2">
                          <img 
                            src={sellToken.logo} 
                            alt={sellToken.ticker}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <span>{formatTokenTicker(sellToken.ticker)} Stats</span>
                        </h4>
                        {(() => {
                          const sellTokenKey = sellToken.ticker.startsWith('e') ? `e${sellToken.ticker.slice(1)}` : `p${sellToken.ticker}`;
                          const sellStats = tokenStats[sellTokenKey];
                          
                          if (!sellStats) {
                            return <div className="text-gray-400 text-sm">Stats not available</div>;
                          }

                          // Calculate your custom price in HEX terms
                          let yourPriceInHEX: number | null = null;
                          if (buyToken && sellAmount && buyAmount && parseFloat(removeCommas(sellAmount)) > 0 && parseFloat(removeCommas(buyAmount)) > 0) {
                            if (buyToken.ticker === 'HEX') {
                              // If buying HEX, your price is buyAmount/sellAmount HEX per sellToken
                              yourPriceInHEX = parseFloat(removeCommas(buyAmount)) / parseFloat(removeCommas(sellAmount));
                            } else {
                              // If buying another token, we need to convert through HEX
                              const buyTokenKey = buyToken.ticker.startsWith('e') ? `e${buyToken.ticker.slice(1)}` : `p${buyToken.ticker}`;
                              const buyStats = tokenStats[buyTokenKey];
                              if (buyStats && buyStats.token.priceHEX > 0) {
                                // Convert: sellToken -> HEX -> buyToken
                                const hexPerSellToken = parseFloat(removeCommas(buyAmount)) / parseFloat(removeCommas(sellAmount)) * buyStats.token.priceHEX;
                                yourPriceInHEX = hexPerSellToken;
                              }
                            }
                          }

                          // Calculate discounts based on your price
                          let yourDiscountFromBacking: number | null = null;
                          let yourDiscountFromMint: number | null = null;

                          if (yourPriceInHEX !== null && sellStats.token.backingPerToken > 0) {
                            yourDiscountFromBacking = (yourPriceInHEX - sellStats.token.backingPerToken) / sellStats.token.backingPerToken;
                          }

                          if (yourPriceInHEX !== null && sellStats.token.priceHEX > 0) {
                            // Calculate mint price from API data
                            const mintPriceHEX = sellStats.token.priceHEX / (1 + sellStats.token.discountFromMint);
                            yourDiscountFromMint = (yourPriceInHEX - mintPriceHEX) / mintPriceHEX;
                          }

                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Backing per Token:</span>
                                <span className="text-white">{sellStats.token.backingPerToken.toFixed(4)} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Current Market Price:</span>
                                <span className="text-white">{sellStats.token.priceHEX.toFixed(4)} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Discount from Backing:</span>
                                <span className={`font-medium ${sellStats.token.discountFromBacking > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(sellStats.token.discountFromBacking * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Discount from Mint:</span>
                                <span className={`font-medium ${sellStats.token.discountFromMint > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(sellStats.token.discountFromMint * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Progress:</span>
                                <span className="text-blue-400">{(sellStats.dates.progressPercentage * 100).toFixed(1)}%</span>
                              </div>
                              
                              {/* Subtle divider */}
                              <div className="border-t border-white/10 my-3"></div>
                              
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Price:</span>
                                <span className="text-white">{yourPriceInHEX ? yourPriceInHEX.toFixed(4) : 'N/A'} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Discount from Backing:</span>
                                <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromBacking !== null ? (yourDiscountFromBacking * 100).toFixed(2) + '%' : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Discount from Mint:</span>
                                <span className={`font-medium ${yourDiscountFromMint !== null ? (yourDiscountFromMint > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromMint !== null ? (yourDiscountFromMint * 100).toFixed(2) + '%' : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your position is:</span>
                                <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromBacking !== null ? 
                                    (yourDiscountFromBacking > 0 ? 
                                      `${(yourDiscountFromBacking * 100).toFixed(2)}% above backing price` : 
                                      `${Math.abs(yourDiscountFromBacking * 100).toFixed(2)}% below backing price`
                                    ) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your position is:</span>
                                <span className={`font-medium ${yourPriceInHEX !== null && sellStats.token.priceHEX > 0 ? 
                                  ((yourPriceInHEX - sellStats.token.priceHEX) / sellStats.token.priceHEX > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourPriceInHEX !== null && sellStats.token.priceHEX > 0 ? 
                                    (() => {
                                      const marketDiff = (yourPriceInHEX - sellStats.token.priceHEX) / sellStats.token.priceHEX;
                                      return marketDiff > 0 ? 
                                        `${(marketDiff * 100).toFixed(2)}% above current price` : 
                                        `${Math.abs(marketDiff * 100).toFixed(2)}% below current price`;
                                    })() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        </div>
                      )}

                      {/* Buy Token Stats */}
                      {showBuyStats && (
                        <div className="space-y-3">
                        <h4 className="text-white font-medium flex items-center space-x-2">
                          <img 
                            src={buyToken.logo} 
                            alt={buyToken.ticker}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/coin-logos/default.svg';
                            }}
                          />
                          <span>{formatTokenTicker(buyToken.ticker)} Stats</span>
                        </h4>
                        {(() => {
                          const buyTokenKey = buyToken.ticker.startsWith('e') ? `e${buyToken.ticker.slice(1)}` : `p${buyToken.ticker}`;
                          const buyStats = tokenStats[buyTokenKey];
                          
                          if (!buyStats) {
                            return <div className="text-gray-400 text-sm">Stats not available</div>;
                          }

                          // Calculate your custom price in HEX terms
                          let yourPriceInHEX: number | null = null;
                          if (sellToken && sellAmount && buyAmount && parseFloat(removeCommas(sellAmount)) > 0 && parseFloat(removeCommas(buyAmount)) > 0) {
                            if (sellToken.ticker === 'HEX') {
                              // If selling HEX, your price is sellAmount/buyAmount HEX per buyToken
                              yourPriceInHEX = parseFloat(removeCommas(sellAmount)) / parseFloat(removeCommas(buyAmount));
                            } else {
                              // If selling another token, we need to convert through HEX
                              const sellTokenKey = sellToken.ticker.startsWith('e') ? `e${sellToken.ticker.slice(1)}` : `p${sellToken.ticker}`;
                              const sellStats = tokenStats[sellTokenKey];
                              if (sellStats && sellStats.token.priceHEX > 0) {
                                // Convert: buyToken -> HEX -> sellToken
                                const hexPerBuyToken = parseFloat(removeCommas(sellAmount)) / parseFloat(removeCommas(buyAmount)) * sellStats.token.priceHEX;
                                yourPriceInHEX = hexPerBuyToken;
                              }
                            }
                          }

                          // Calculate discounts based on your price
                          let yourDiscountFromBacking: number | null = null;
                          let yourDiscountFromMint: number | null = null;

                          if (yourPriceInHEX !== null && buyStats.token.backingPerToken > 0) {
                            yourDiscountFromBacking = (yourPriceInHEX - buyStats.token.backingPerToken) / buyStats.token.backingPerToken;
                          }

                          if (yourPriceInHEX !== null && buyStats.token.priceHEX > 0) {
                            // Calculate mint price from API data
                            const mintPriceHEX = buyStats.token.priceHEX / (1 + buyStats.token.discountFromMint);
                            yourDiscountFromMint = (yourPriceInHEX - mintPriceHEX) / mintPriceHEX;
                          }

                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Backing per Token:</span>
                                <span className="text-white">{buyStats.token.backingPerToken.toFixed(4)} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Current Market Price:</span>
                                <span className="text-white">{buyStats.token.priceHEX.toFixed(4)} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Discount from Backing:</span>
                                <span className={`font-medium ${buyStats.token.discountFromBacking > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(buyStats.token.discountFromBacking * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Discount from Mint:</span>
                                <span className={`font-medium ${buyStats.token.discountFromMint > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(buyStats.token.discountFromMint * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Progress:</span>
                                <span className="text-white">{(buyStats.dates.progressPercentage * 100).toFixed(1)}%</span>
                              </div>
                              
                              {/* Subtle divider */}
                              <div className="border-t border-white/10 my-3"></div>
                              
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Price:</span>
                                <span className="text-white">{yourPriceInHEX ? yourPriceInHEX.toFixed(4) : 'N/A'} HEX</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Discount from Backing:</span>
                                <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromBacking !== null ? (yourDiscountFromBacking * 100).toFixed(2) + '%' : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your Discount from Mint:</span>
                                <span className={`font-medium ${yourDiscountFromMint !== null ? (yourDiscountFromMint > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromMint !== null ? (yourDiscountFromMint * 100).toFixed(2) + '%' : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your position is:</span>
                                <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourDiscountFromBacking !== null ? 
                                    (yourDiscountFromBacking > 0 ? 
                                      `${(yourDiscountFromBacking * 100).toFixed(2)}% above backing price` : 
                                      `${Math.abs(yourDiscountFromBacking * 100).toFixed(2)}% below backing price`
                                    ) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Your position is:</span>
                                <span className={`font-medium ${yourPriceInHEX !== null && buyStats.token.priceHEX > 0 ? 
                                  ((yourPriceInHEX - buyStats.token.priceHEX) / buyStats.token.priceHEX > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                  {yourPriceInHEX !== null && buyStats.token.priceHEX > 0 ? 
                                    (() => {
                                      const marketDiff = (yourPriceInHEX - buyStats.token.priceHEX) / buyStats.token.priceHEX;
                                      return marketDiff > 0 ? 
                                        `${(marketDiff * 100).toFixed(2)}% above current price` : 
                                        `${Math.abs(marketDiff * 100).toFixed(2)}% below current price`;
                                    })() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-800/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={!sellToken || !buyToken || !sellAmount || !buyAmount}
                className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Deal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
