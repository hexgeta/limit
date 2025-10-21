'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAccount } from 'wagmi';
import { useOpenPositions } from '@/hooks/contracts/useOpenPositions';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { getTokenInfo, formatTokenTicker, formatTokenAmount } from '@/utils/tokenUtils';
import { CircleDollarSign } from 'lucide-react';

// Simplified TokenLogo component
function TokenLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [hasError, setHasError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleError = useCallback(() => {
      setHasError(true);
  }, []);

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

export function NotificationBell() {
  const { isConnected, address } = useAccount();
  const { notifications, unreadCount, isLoading, markAsSeen, markAsRead, toggleReadStatus } = useNotifications();
  const { allOrders } = useOpenPositions();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Collect all unique token addresses from notifications
  const allTokenAddresses = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return [];
    const addresses = new Set<string>();
    allOrders.forEach((order: any) => {
      addresses.add(order.orderDetailsWithId.orderDetails.sellToken);
      // Add buy tokens
      order.orderDetailsWithId.orderDetails.buyTokensIndex.forEach((tokenIndex: bigint) => {
        const tokenInfo = getTokenInfo(tokenIndex.toString());
        if (tokenInfo) addresses.add(tokenInfo.address);
      });
    });
    return Array.from(addresses);
  }, [allOrders]);

  const { prices: tokenPrices } = useTokenPrices(allTokenAddresses);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't show if wallet not connected
  if (!isConnected) return null;

  const handleToggle = () => {
    const wasOpen = isOpen;
    setIsOpen(!isOpen);
    
    if (!wasOpen) {
      // Opening - mark all current notifications as seen
      markAsSeen();
    }
  };

  // Helper functions
  const getTokenPrice = useCallback((tokenAddress: string): number => {
    // Hardcode weDAI to $1.00
    if (tokenAddress.toLowerCase() === '0xefd766ccb38eaf1dfd701853bfce31359239f305') {
      return 1.0;
    }
    
    // Use WPLS price for PLS (native token addresses)
    const plsAddresses = [
      '0x0000000000000000000000000000000000000000',
      '0x000000000000000000000000000000000000dead',
    ];
    if (plsAddresses.some(addr => tokenAddress.toLowerCase() === addr.toLowerCase())) {
      const wplsPrice = tokenPrices['0xa1077a294dde1b09bb078844df40758a5d0f9a27']?.price;
      return wplsPrice || 0.000034;
    }
    
    return tokenPrices[tokenAddress]?.price || 0;
  }, [tokenPrices]);

  const formatUSD = (amount: number) => {
    if (amount === 0) return '$0';
    if (amount < 0.01) return `$${amount.toFixed(6)}`;
    if (amount < 1) return `$${amount.toFixed(4)}`;
    if (amount >= 1000) {
      return `$${amount.toLocaleString(undefined, { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      })}`;
    }
    const formatted = amount.toFixed(2);
    const withoutTrailingZeros = formatted.replace(/\.?0+$/, '');
    return `$${withoutTrailingZeros}`;
  };

  const formatTokenAmountDisplay = (amount: number): string => {
    if (amount % 1 === 0) {
      return amount.toLocaleString();
    }
    return amount.toFixed(2);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = date.getUTCFullYear().toString().slice(-2);
    const hours24 = date.getUTCHours();
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return {
      date: `${day} ${month} ${year}`,
      time: `${hours12}:${minutes} ${ampm} UTC`
    };
  };

  const getStatusText = (order: any) => {
    const status = order.orderDetailsWithId.status;
    const expirationTime = Number(order.orderDetailsWithId.orderDetails.expirationTime);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (status === 0 && expirationTime < currentTime) {
      return 'Inactive';
    }
    
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Cancelled';
      case 2: return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-[#00D9FF] hover:text-white transition-colors"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge for unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF0080] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(255,0,128,0.8)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[900px] max-w-[90vw] bg-black border-2 border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded z-50 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#00D9FF]/30 flex-shrink-0">
            <h3 className="text-[#00D9FF] font-bold">
              Order History {notifications.length > 0 && `(${notifications.length})`}
            </h3>
          </div>

          {/* Notifications List - Scrollable */}
          <div className="overflow-y-auto max-h-[600px] notifications-scroll"
               style={{ 
                 scrollbarWidth: 'thin',
                 scrollbarColor: 'rgba(0, 217, 255, 0.5) transparent'
               }}
          >
            {isLoading ? (
              <div className="px-4 py-8 text-center text-[#00D9FF]/50">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#00D9FF]/50">
                No order history yet
              </div>
            ) : (
              <div className="px-4 py-4">
                {notifications.map((notif, index) => {
                  const notificationId = `${notif.txHash}-${notif.orderId}`;
                  const baseOrder = allOrders?.find((order: any) => 
                    order.orderDetailsWithId.orderId.toString() === notif.orderId
                  );

                  if (!baseOrder) return null;

                  const sellTokenInfo = getTokenInfo(baseOrder.orderDetailsWithId.orderDetails.sellToken);
                  if (!sellTokenInfo) return null;

                  const isSellTransaction = notif.type === 'sell';
                  const sellPrice = getTokenPrice(baseOrder.orderDetailsWithId.orderDetails.sellToken);
                  
                  // Get original order amounts
                  const originalSellAmountNum = parseFloat(formatTokenAmount(
                    baseOrder.orderDetailsWithId.orderDetails.sellAmount, 
                    sellTokenInfo.decimals
                  ));
                  const originalSellAmountUSD = originalSellAmountNum * sellPrice;

                  const originalBuyAmounts = baseOrder.orderDetailsWithId.orderDetails.buyAmounts;
                  const originalBuyTokensIndex = baseOrder.orderDetailsWithId.orderDetails.buyTokensIndex;
                  
                  // Calculate original buy amounts in USD
                  const originalBuyAmountsUSD = originalBuyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                    const tokenInfo = getTokenInfo(tokenIndex.toString());
                    if (!tokenInfo) return 0;
                    const amount = parseFloat(formatTokenAmount(originalBuyAmounts[idx], tokenInfo.decimals));
                    const price = getTokenPrice(tokenInfo.address);
                    return amount * price;
                  });
                  const originalMinBuyAmountUSD = originalBuyAmountsUSD.length > 0 ? Math.min(...originalBuyAmountsUSD) : 0;

                  // Calculate OTC vs Market Price
                  const otcPercentage = originalSellAmountUSD > 0 && originalMinBuyAmountUSD > 0
                    ? ((originalMinBuyAmountUSD - originalSellAmountUSD) / originalSellAmountUSD) * 100
                    : null;

                  return (
                    <div
                      key={`${notif.orderId}-${index}`}
                      className={`border border-[#00D9FF]/20 rounded p-4 mb-3 hover:border-[#00D9FF]/40 transition-colors ${
                        notif.isNew ? 'bg-[#FF0080]/5' : ''
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Buy/Sell Badge */}
                          <span className={`px-3 py-1 text-xs font-medium border ${
                            isSellTransaction 
                              ? 'bg-red-500/20 text-red-400 border-red-400' 
                              : 'bg-green-500/20 text-green-400 border-green-400'
                          }`}>
                            {isSellTransaction ? 'Sell' : 'Buy'}
                          </span>
                          
                          {/* Status Badge */}
                          <span className={`px-3 py-1 text-xs font-medium border ${
                            getStatusText(baseOrder) === 'Inactive'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400'
                              : baseOrder.orderDetailsWithId.status === 0 
                              ? 'bg-green-500/20 text-green-400 border-green-400' 
                              : baseOrder.orderDetailsWithId.status === 1
                              ? 'bg-red-500/20 text-red-400 border-red-400'
                              : 'bg-blue-500/20 text-blue-400 border-blue-400'
                          }`}>
                            {getStatusText(baseOrder)}
                          </span>

                          {/* New indicator */}
                          {notif.isNew && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-[#FF0080] rounded-full" />
                              <span className="text-xs text-[#FF0080] font-medium">NEW</span>
                            </div>
                          )}
                        </div>

                        {/* Read/Unread Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReadStatus(notificationId);
                          }}
                          className="p-1 hover:bg-[#00D9FF]/10 rounded transition-colors"
                          title={notif.isNew ? "Mark as read" : "Mark as unread"}
                        >
                          {notif.isNew ? (
                            <svg className="w-5 h-5 text-[#FF0080]" fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="5" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-[#00D9FF]/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="5" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Main Content Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {/* You Bought/Received */}
                        <div>
                          <div className="text-xs text-[#00D9FF]/60 mb-1">
                            {isSellTransaction ? 'You Received' : 'You Bought'}
                          </div>
                          <div className="text-lg font-medium text-[#00D9FF]">
                            {isSellTransaction ? formatUSD(originalMinBuyAmountUSD) : formatUSD(originalSellAmountUSD)}
                          </div>
                          <div className="mt-2">
                            {isSellTransaction ? (
                              // Show buy tokens
                              originalBuyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                                const tokenInfo = getTokenInfo(tokenIndex.toString());
                                if (!tokenInfo) return null;
                                const amount = parseFloat(formatTokenAmount(originalBuyAmounts[idx], tokenInfo.decimals));
                                return (
                                  <div key={tokenInfo.address} className="flex items-center gap-2 mb-1">
                                    <TokenLogo 
                                      src={tokenInfo.logo}
                                      alt={formatTokenTicker(tokenInfo.ticker)}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm text-[#00D9FF]">
                                      {formatTokenAmountDisplay(amount)} {formatTokenTicker(tokenInfo.ticker)}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              // Show sell token
                              <div className="flex items-center gap-2">
                                <TokenLogo 
                                  src={sellTokenInfo.logo}
                                  alt={formatTokenTicker(sellTokenInfo.ticker)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-[#00D9FF]">
                                  {formatTokenAmountDisplay(originalSellAmountNum)} {formatTokenTicker(sellTokenInfo.ticker)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* You Paid/Gave */}
                        <div>
                          <div className="text-xs text-[#00D9FF]/60 mb-1">
                            {isSellTransaction ? 'You Gave' : 'You Paid'}
                          </div>
                          <div className="text-lg font-medium text-[#00D9FF]">
                            {isSellTransaction ? formatUSD(originalSellAmountUSD) : formatUSD(originalMinBuyAmountUSD)}
                          </div>
                          <div className="mt-2">
                            {isSellTransaction ? (
                              // Show sell token
                              <div className="flex items-center gap-2">
                                <TokenLogo 
                                  src={sellTokenInfo.logo}
                                  alt={formatTokenTicker(sellTokenInfo.ticker)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-[#00D9FF]">
                                  {formatTokenAmountDisplay(originalSellAmountNum)} {formatTokenTicker(sellTokenInfo.ticker)}
                                </span>
                              </div>
                            ) : (
                              // Show buy tokens
                              originalBuyTokensIndex.map((tokenIndex: bigint, idx: number) => {
                                const tokenInfo = getTokenInfo(tokenIndex.toString());
                                if (!tokenInfo) return null;
                                const amount = parseFloat(formatTokenAmount(originalBuyAmounts[idx], tokenInfo.decimals));
                                return (
                                  <div key={tokenInfo.address} className="flex items-center gap-2 mb-1">
                                    <TokenLogo 
                                      src={tokenInfo.logo}
                                      alt={formatTokenTicker(tokenInfo.ticker)}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm text-[#00D9FF]">
                                      {formatTokenAmountDisplay(amount)} {formatTokenTicker(tokenInfo.ticker)}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Row */}
                      <div className="flex items-center justify-between text-xs border-t border-[#00D9FF]/10 pt-3">
                        <div className="flex items-center gap-4">
                          {/* OTC vs Market */}
                          {otcPercentage !== null && (
                            <div>
                              <span className="text-[#00D9FF]/60">OTC vs Market: </span>
                              <span className={`font-medium ${
                                otcPercentage < 0 ? 'text-red-400' : 'text-green-400'
                              }`}>
                                {otcPercentage < 0 ? '-' : '+'}{Math.abs(otcPercentage).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          
                          {/* Date */}
                          <div>
                            <span className="text-[#00D9FF]/60">
                              {formatTimestamp(notif.timestamp).date} {formatTimestamp(notif.timestamp).time}
                            </span>
                          </div>

                          {/* Order ID */}
                          <div>
                            <span className="text-[#00D9FF]/40">Order #{notif.orderId}</span>
                          </div>
                        </div>

                        {/* View Tx Button */}
                        <button
                          onClick={() => {
                            markAsRead(notificationId);
                            window.open(`https://otter.pulsechain.com/tx/${notif.txHash}`, '_blank');
                          }}
                          className="px-3 py-1 bg-transparent text-white text-xs border border-white hover:bg-white/10 transition-colors"
                        >
                          View Tx
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

