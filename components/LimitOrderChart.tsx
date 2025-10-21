'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { formatTokenTicker } from '@/utils/tokenUtils';
import { CoinLogo } from '@/components/ui/CoinLogo';

interface LimitOrderChartProps {
  sellTokenAddress?: string;
  buyTokenAddress?: string;
  limitOrderPrice?: number;
  onLimitPriceChange?: (newPrice: number) => void;
  onCurrentPriceChange?: (price: number) => void;
}

export function LimitOrderChart({ sellTokenAddress, buyTokenAddress, limitOrderPrice, onLimitPriceChange, onCurrentPriceChange }: LimitOrderChartProps) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format number to 4 significant figures
  const formatSignificantFigures = (num: number, sigFigs: number = 4): string => {
    if (num === 0) return '0';
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const scale = Math.pow(10, sigFigs - magnitude - 1);
    return (Math.round(num * scale) / scale).toString();
  };

  // Default to PLS -> HEX if no tokens provided
  const sellToken = sellTokenAddress || '0x000000000000000000000000000000000000dead'; // PLS
  const buyToken = buyTokenAddress || '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'; // HEX

  useEffect(() => {
    fetchPriceData();
    // Refresh price every 10 seconds
    const interval = setInterval(fetchPriceData, 10000);
    return () => clearInterval(interval);
  }, [sellToken, buyToken]);

  const fetchPriceData = async () => {
    if (!sellToken || !buyToken) return;
    
    setLoading(true);
    try {
      // Fetch both token configs
      const sellTokenConfig = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === sellToken.toLowerCase());
      const buyTokenConfig = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === buyToken.toLowerCase());
      
      if (!sellTokenConfig?.dexs || !buyTokenConfig?.dexs) {
        setLoading(false);
        return;
      }

      // Get pair addresses for DexScreener
      const sellPairAddress = Array.isArray(sellTokenConfig.dexs) ? sellTokenConfig.dexs[0] : sellTokenConfig.dexs;
      const buyPairAddress = Array.isArray(buyTokenConfig.dexs) ? buyTokenConfig.dexs[0] : buyTokenConfig.dexs;
      
      // Fetch current prices from DexScreener
      const [sellResponse, buyResponse] = await Promise.all([
        fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${sellPairAddress}`),
        fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${buyPairAddress}`)
      ]);
      
      if (!sellResponse.ok || !buyResponse.ok) {
        throw new Error('Failed to fetch current price data');
      }

      const [sellData, buyData] = await Promise.all([
        sellResponse.json(),
        buyResponse.json()
      ]);
      
      const sellPair = sellData.pairs?.[0];
      const buyPair = buyData.pairs?.[0];
      
      if (!sellPair || !buyPair || !sellPair.priceUsd || !buyPair.priceUsd) {
        throw new Error('Invalid price data from DexScreener');
      }

      const sellPriceUsd = parseFloat(sellPair.priceUsd);
      const buyPriceUsd = parseFloat(buyPair.priceUsd);
      
      // Calculate current ratio: how many buy tokens per sell token
      const currentRatio = sellPriceUsd / buyPriceUsd;
      setCurrentPrice(currentRatio);
      
      // Notify parent of current price change
      if (onCurrentPriceChange) {
        onCurrentPriceChange(currentRatio);
      }
      
    } catch (error) {
      // Error fetching price data
    } finally {
      setLoading(false);
    }
  };

  const sellTokenInfo = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === sellToken.toLowerCase());
  const buyTokenInfo = TOKEN_CONSTANTS.find(t => t.a?.toLowerCase() === buyToken.toLowerCase());

  // Calculate visual scale for the price display
  // Use a symmetric percentage range around current price for accurate % representation
  const minPrice = (currentPrice || 0) * 0.7; // 30% below current price
  const maxPrice = (currentPrice || 0) * 1.3; // 30% above current price
  const priceRange = maxPrice - minPrice || 1;

  const currentPricePosition = currentPrice 
    ? ((currentPrice - minPrice) / priceRange) * 100 
    : 50;
  const limitPricePosition = limitOrderPrice 
    ? ((limitOrderPrice - minPrice) / priceRange) * 100 
    : null;

  // Drag handlers for limit price line
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!limitOrderPrice || !onLimitPriceChange) return;
    e.preventDefault();
    setIsDragging(true);
  }, [limitOrderPrice, onLimitPriceChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !onLimitPriceChange) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, ((rect.height - y) / rect.height) * 100));
    const newPrice = minPrice + (percentage / 100) * priceRange;
    
    if (newPrice > 0) {
      onLimitPriceChange(newPrice);
    }
  }, [minPrice, priceRange, onLimitPriceChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="w-full min-h-[600px] bg-black/80 backdrop-blur-sm border-2 border-[#00D9FF] p-6 shadow-[0_0_30px_rgba(0,217,255,0.3)]">
        {/* Token Pair Info */}
        {sellTokenInfo && buyTokenInfo && (
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-[#00D9FF]">
                <span className="flex items-center gap-2">
                  <img 
                    src={`/coin-logos/${sellTokenInfo.ticker}.svg`} 
                    alt={`${sellTokenInfo.ticker} logo`} 
                    className="w-6 h-6 inline-block"
                  />
                  {formatTokenTicker(sellTokenInfo.ticker)} Price
                </span>
              </h3>
            {loading && (
              <span className="text-xs text-[#00D9FF]/50 animate-pulse">Updating...</span>
            )}
          </div>
        </div>
      )}

      {/* Price Display */}
      {loading && !currentPrice ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-[#00D9FF]/70">Loading price data...</div>
        </div>
      ) : currentPrice ? (
        <div className="space-y-6">
          {/* Visual Price Scale */}
          <div 
            ref={containerRef}
            className="relative min-h-[500px] bg-black/40 border border-[#00D9FF]/20 rounded select-none"
          >
            {/* Y-axis tick marks */}
            {[-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30].map((percentDiff) => {
              // Calculate the actual price at this percentage difference from current price
              const priceAtPercent = currentPrice * (1 + percentDiff / 100);
              
              // Calculate where this price would be positioned in the chart range
              const position = ((priceAtPercent - minPrice) / priceRange) * 100;
              
              // Only show if within bounds
              if (position < 0 || position > 100) return null;
              
              return (
                <div
                  key={percentDiff}
                  className="absolute left-0 w-full flex items-center pointer-events-none"
                  style={{ bottom: `${position}%`, zIndex: 0, transform: 'translateY(50%)' }}
                >
                  <div className="flex items-center gap-1 px-2 bg-black/80 rounded py-0.5">
                    <div className="w-2 h-px bg-[#00D9FF]/30"></div>
                    <span className="text-xs text-[#00D9FF]/50 font-mono">
                      {percentDiff > 0 ? '+' : ''}{percentDiff}%
                    </span>
                  </div>
                  <div className="flex-1 h-px border-t border-dashed border-[#00D9FF]/10"></div>
                </div>
              );
            })}

            {/* Current Price Line */}
            <div 
              className="absolute w-full border-t-2 border-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.8)] transition-all duration-500 pointer-events-none"
              style={{ 
                bottom: `${currentPricePosition}%`,
                zIndex: currentPricePosition < (limitPricePosition || 0) ? 20 : 10,
                transform: 'translateY(50%)'
              }}
            >
              <div className="absolute -top-7.5 left-16 flex items-center gap-2 bg-black/90 px-3 py-1 border border-[#00D9FF]">
                <span className="text-xs text-[#00D9FF]/70">Current Price:</span>
                <span className="text-sm font-bold text-[#00D9FF]">
                  {formatSignificantFigures(currentPrice)}
                </span>
                {buyTokenInfo && (
                  <>
                    <span className="text-xs text-[#00D9FF]">
                      {formatTokenTicker(buyTokenInfo.ticker)}
                    </span>
                    <img
                      src={`/coin-logos/${buyTokenInfo.ticker}.svg`}
                      alt={`${buyTokenInfo.ticker} logo`}
                      className="w-[16px] h-[16px] object-contain"
                      style={{ filter: 'brightness(0) saturate(100%) invert(68%) sepia(96%) saturate(2367%) hue-rotate(167deg) brightness(103%) contrast(101%)' }}
                      onError={(e) => {
                        e.currentTarget.src = '/coin-logos/default.svg';
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Limit Order Price Line - Draggable */}
            {limitOrderPrice && limitPricePosition !== null && onLimitPriceChange && (
              <div 
                className={`absolute w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} transition-all duration-200`}
                style={{ 
                  bottom: `${limitPricePosition}%`,
                  height: '24px',
                  zIndex: limitPricePosition < currentPricePosition ? 20 : 10,
                  transform: 'translateY(50%)'
                }}
                onMouseDown={handleMouseDown}
              >
                {/* Visible line */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 w-full border-t-2 border-dashed border-[#FF0080] shadow-[0_0_15px_rgba(255,0,128,0.8)] ${isDragging ? '' : 'hover:shadow-[0_0_25px_rgba(255,0,128,1)]'} transition-all duration-200 pointer-events-none`}
                />
                <div className="absolute -top-5 right-4 flex items-center gap-2 bg-black/90 px-3 py-1 border border-[#FF0080] pointer-events-none">
                  <span className="text-xs text-[#FF0080]/70">Limit Price:</span>
                  <span className="text-sm font-bold text-[#FF0080]">
                    {formatSignificantFigures(limitOrderPrice)}
                  </span>
                  {buyTokenInfo && (
                    <>
                      <span className="text-xs text-[#FF0080]">
                        {formatTokenTicker(buyTokenInfo.ticker)}
                      </span>
                      <img
                        src={`/coin-logos/${buyTokenInfo.ticker}.svg`}
                        alt={`${buyTokenInfo.ticker} logo`}
                        className="w-[16px] h-[16px] object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(47%) sepia(99%) saturate(6544%) hue-rotate(312deg) brightness(103%) contrast(103%)' }}
                        onError={(e) => {
                          e.currentTarget.src = '/coin-logos/default.svg';
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[#00D9FF]/70">No price data available</div>
          </div>
        )}
    </div>
  );
}

