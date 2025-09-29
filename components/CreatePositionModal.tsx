'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Lock } from 'lucide-react';
import PaywallModal from './PaywallModal';
import { getTokenInfo, getTokenInfoByIndex, formatTokenTicker, parseTokenAmount, formatTokenAmount } from '@/utils/tokenUtils';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { MORE_COINS } from '@/constants/more-coins';
import { useTokenStats } from '@/hooks/crypto/useTokenStats';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { useContractWhitelist } from '@/hooks/contracts/useContractWhitelist';
import { parseEther, formatEther } from 'viem';
import { useBalance, usePublicClient } from 'wagmi';
import { useTransaction } from '@/context/TransactionContext';
import { useTokenApproval, isNativeToken } from '@/utils/tokenApproval';
import { PAYWALL_ENABLED } from '@/config/paywall';

// Contract whitelist mapping - index to token address
const CONTRACT_WHITELIST_MAP = {
  0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX - PulseX
  1: '0xefd766ccb38eaf1dfd701853bfce31359239f305', // weDAI - Wrapped DAI from Eth
  2: '0x000000000000000000000000000000000000dead', // PLS - Pulse
  3: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', // INC - Incentive
  4: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX - HEX on Pls
  5: '0x0deed1486bc52aa0d3e6f8849cec5add6598a162', // stPLS (Liquid Loans) - Not added to dropdown
  6: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', // weWETH - Wrapped WETH from Eth
  7: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', // weUSDC - Wrapped USDC from Eth (INACTIVE) Not added to dropdown
  8: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', // weUSDT - Wrapped USDT from Eth (INACTIVE) Not added to dropdown
  9: '0x115f3fa979a936167f9d208a7b7c4d85081e84bd', // 2PHUX - 2PHUX Governance Token Not added to dropdown
} as const;

// Active tokens only (for trading)
const ACTIVE_CONTRACT_INDICES = [0, 1, 2, 3, 4, 5, 6, 9];

// Inactive tokens
const INACTIVE_CONTRACT_INDICES = [7, 8];

// MAXI tokens (not in contract whitelist but kept for reference)
const MAXI_TOKENS = [
  '0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
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
];

// Custom dropdown order - specify the order you want tokens to appear
const DROPDOWN_ORDER = [
  4, // HEX first
  2, // PLS fourth
  0, // PLSX second
  1, // weDAI third
  3, // INC fifth
  6, // weWETH seventh
  // Inactive tokens
  // 7, // weUSDC
  // 8, // weUSDT
];

// Combined buy side whitelist - ordered by DROPDOWN_ORDER, then MAXI tokens
const BUY_WHITELISTED_TOKENS = [
  // Contract tokens in custom order
  ...DROPDOWN_ORDER.map(index => CONTRACT_WHITELIST_MAP[index]),

  // MAXI tokens at the end
  ...MAXI_TOKENS,
];

// Whitelisted tokens for OTC trading - SELL SIDE (what you can offer)
// Uses the same contract whitelist mapping and dropdown order as buy side
const SELL_WHITELISTED_TOKENS = [
  // Contract tokens in custom order (same as buy side)
  ...DROPDOWN_ORDER.map(index => CONTRACT_WHITELIST_MAP[index]),

  // MAXI tokens at the end
  ...MAXI_TOKENS,
];



interface CreatePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionStart?: () => void;
  onTransactionEnd?: () => void;
  onTransactionSuccess?: (message?: string) => void;
  onTransactionError?: (error?: string) => void;
  onOrderCreated?: () => void; // Callback to refresh data and navigate
}

interface TokenOption {
  address: string;
  ticker: string;
  name: string;
  logo: string;
  decimals: number;
}

export function CreatePositionModal({
  isOpen,
  onClose,
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
  onOrderCreated
}: CreatePositionModalProps) {
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Default initial tokens
  const DEFAULT_SELL_TOKEN = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'; // HEX
  const DEFAULT_BUY_TOKEN = '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b'; // MAXI

  // Fetch token stats from LookIntoMaxi API
  const { tokenStats, isLoading: statsLoading, error: statsError } = useTokenStats();


  // Contract functions
  const { placeOrder, isWalletConnected, address } = useContractWhitelist();
  const { setTransactionPending } = useTransaction();

  // Public client for manual balance checks
  const publicClient = usePublicClient();

  // Contract address for token approvals
  const OTC_CONTRACT_ADDRESS = '0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2';

  // Handle close - let AnimatePresence handle the timing
  const handleClose = () => {
    setOrderError(null); // Clear any error messages when closing
    setApprovalError(null);
    onClose();
  };

  const handleApproveToken = async () => {
    console.log('handleApproveToken called:', {
      needsApproval,
      sellToken: sellToken?.address,
      sellAmountWei: sellAmountWei.toString(),
      OTC_CONTRACT_ADDRESS
    });

    if (!needsApproval || !sellToken) {
      setApprovalError('No token approval needed');
      return;
    }

    setApprovalError(null);
    setTransactionPending(true);
    onTransactionStart?.();

    try {
      console.log('Calling approveToken with:', {
        tokenAddress: sellToken.address,
        spenderAddress: OTC_CONTRACT_ADDRESS,
        amount: sellAmountWei.toString()
      });

      const txHash = await approveToken();
      console.log('Approval transaction sent:', txHash);

      // Wait for the approval transaction to be confirmed
      console.log('Waiting for approval transaction to be confirmed...');

      // Wait for the allowance to be updated (this indicates approval is complete)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      const waitForApproval = async () => {
        try {
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;

            // Check if approval is now complete
            if (tokenNeedsApproval === false || isApproved === true) {
              console.log('Approval confirmed, proceeding to create order...');
              handleCreateDeal();
              return;
            }

            console.log(`Waiting for approval... attempt ${attempts}/${maxAttempts}`);
          }

          // If we get here, approval didn't complete in time
          console.log('Approval timeout, but proceeding anyway...');
          handleCreateDeal();
        } finally {
          // Only clear loading state after approval process is complete
          setTransactionPending(false);
          onTransactionEnd?.();
        }
      };

      waitForApproval();
    } catch (error: any) {
      console.error('Token approval failed:', error);
      const errorMessage = error.message || 'Failed to approve token. Please try again.';
      setApprovalError(errorMessage);
      onTransactionError?.(errorMessage);
      setTransactionPending(false);
      onTransactionEnd?.();
    }
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
          logo: tokenInfo.logo,
          decimals: tokenInfo.decimals
        };
      }
    }
    const tokenInfo = getTokenInfo(DEFAULT_SELL_TOKEN);
    return {
      address: DEFAULT_SELL_TOKEN,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo,
      decimals: tokenInfo.decimals
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
          logo: tokenInfo.logo,
          decimals: tokenInfo.decimals
        };
      }
    }
    const tokenInfo = getTokenInfo(DEFAULT_BUY_TOKEN);
    return {
      address: DEFAULT_BUY_TOKEN,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo,
      decimals: tokenInfo.decimals
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

  // Get token prices for conversion to HEX terms (after tokens are initialized)
  const tokenAddresses = useMemo(() => {
    const addresses = [
      '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX
    ];
    if (sellToken?.address) addresses.push(sellToken.address);
    if (buyToken?.address) addresses.push(buyToken.address);
    return addresses;
  }, [sellToken?.address, buyToken?.address]);
  
  const { data: tokenPrices } = useTokenPrices(tokenAddresses);
  
  // Debug tokenPrices
  useEffect(() => {
    console.log('CreatePositionModal - tokenPrices updated:', {
      tokenPrices,
      tokenAddresses,
      hasTokenPrices: !!tokenPrices,
      keys: tokenPrices ? Object.keys(tokenPrices) : []
    });
  }, [tokenPrices, tokenAddresses]);

  // Token approval state
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Helper function to remove commas for calculations
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Token approval hook - only for ERC20 tokens (not native PLS)
  const sellAmountWei = sellToken && sellAmount ? parseTokenAmount(removeCommas(sellAmount), sellToken.decimals) : 0n;
  const needsApproval = Boolean(sellToken && !isNativeToken(sellToken.address) && sellAmountWei > 0n);

  // Debug logging for approval
  console.log('Approval Debug:', {
    sellToken: sellToken?.address,
    sellAmount,
    sellAmountWei: sellAmountWei.toString(),
    needsApproval,
    isNative: sellToken ? isNativeToken(sellToken.address) : false,
    OTC_CONTRACT_ADDRESS
  });

  const {
    allowance,
    needsApproval: tokenNeedsApproval,
    isApproved,
    isApproving,
    approveToken
  } = useTokenApproval(
    needsApproval && sellToken ? sellToken.address as `0x${string}` : '0x0000000000000000000000000000000000000000' as `0x${string}`,
    OTC_CONTRACT_ADDRESS,
    sellAmountWei
  );

  // State for order creation
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Get wallet balances for selected tokens
  const { data: sellTokenBalance, isLoading: sellBalanceLoading, error: sellBalanceError } = useBalance({
    address: address,
    token: isNativeToken(sellToken?.address || '') ? undefined : sellToken?.address as `0x${string}`,
    chainId: 369, // PulseChain
    query: {
      enabled: !!address && !!sellToken,
      retry: 3,
    }
  });

  const { data: buyTokenBalance, isLoading: buyBalanceLoading, error: buyBalanceError } = useBalance({
    address: address,
    token: isNativeToken(buyToken?.address || '') ? undefined : buyToken?.address as `0x${string}`,
    chainId: 369, // PulseChain
    query: {
      enabled: !!address && !!buyToken,
      retry: 3,
    }
  });

  // Debug logging for balance issues
  console.log('Balance Debug:', {
    address,
    sellToken: sellToken?.address,
    sellTokenBalance,
    sellBalanceLoading,
    sellBalanceError,
    chainId: 369,
    isNativeToken: sellToken?.address === '0x0'
  });

  // UI Debug logging
  console.log('UI Debug:', {
    sellTokenExists: !!sellToken,
    sellTokenBalanceExists: !!sellTokenBalance,
    sellTokenBalanceValue: sellTokenBalance?.value,
    sellTokenBalanceFormatted: sellTokenBalance?.formatted,
    shouldShowBalance: sellToken && sellTokenBalance && !sellBalanceLoading && !sellBalanceError
  });

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: string): string => {
    // If the value ends with a decimal point, preserve it
    if (value.endsWith('.')) {
      const num = parseFloat(value.slice(0, -1));
      if (isNaN(num)) return value;
      return num.toLocaleString() + '.';
    }

    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString();
  };

  // Helper function to convert any token price to HEX terms
  const getTokenPriceInHex = (tokenAddress: string): number | null => {
    if (!tokenPrices) {
      console.log('No tokenPrices available');
      return null;
    }
    
    const hexAddress = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
    const tokenUsdPrice = tokenPrices[tokenAddress]?.price;
    const hexUsdPrice = tokenPrices[hexAddress]?.price;
    
    console.log('Price conversion debug:', {
      tokenAddress,
      tokenUsdPrice,
      hexUsdPrice,
      tokenPrices: Object.keys(tokenPrices)
    });
    
    if (!tokenUsdPrice || !hexUsdPrice || hexUsdPrice === 0) return null;
    
    // Convert: 1 token unit -> USD -> HEX equivalent
    const priceInHex = tokenUsdPrice / hexUsdPrice;
    console.log('Calculated price in HEX:', priceInHex);
    return priceInHex;
  };

  // Helper function to preserve cursor position during formatting
  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const input = e.target;
    const rawValue = removeCommas(input.value);

    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      setter(rawValue);

      // Use a more reliable approach with double requestAnimationFrame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            // Calculate cursor position more intelligently
            const formattedValue = formatNumberWithCommas(rawValue);
            const originalCursorPos = input.selectionStart || 0;
            const originalValue = input.value;

            // If the user is typing at the end, keep cursor at the end
            if (originalCursorPos >= originalValue.length - 1) {
              inputRef.current.setSelectionRange(formattedValue.length, formattedValue.length);
            } else {
              // For middle positions, try to maintain relative position
              const digitsBeforeCursor = originalValue.substring(0, originalCursorPos).replace(/,/g, '').length;
              const newCursorPos = Math.min(digitsBeforeCursor, formattedValue.length);
              inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }
        });
      });
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

  // Calculate OTC price in HEX terms for any token pair
  const calculateOtcPriceInHex = useMemo(() => {
    console.log('calculateOtcPriceInHex called with:', {
      sellToken: sellToken?.ticker,
      buyToken: buyToken?.ticker,
      sellAmount,
      buyAmount,
      hasTokenPrices: !!tokenPrices
    });

    if (!sellToken || !buyToken || !sellAmount || !buyAmount) {
      console.log('Missing required data for OTC price calculation');
      return null;
    }
    if (parseFloat(removeCommas(sellAmount)) <= 0 || parseFloat(removeCommas(buyAmount)) <= 0) {
      console.log('Invalid amounts for OTC price calculation');
      return null;
    }

    if (buyToken.ticker === 'HEX') {
      // If buying HEX, your price is buyAmount/sellAmount HEX per sellToken
      const price = parseFloat(removeCommas(buyAmount)) / parseFloat(removeCommas(sellAmount));
      console.log('Calculated OTC price (buying HEX):', price);
      return price;
    } else if (sellToken.ticker === 'HEX') {
      // If selling HEX, your price is sellAmount/buyAmount HEX per buyToken
      const price = parseFloat(removeCommas(sellAmount)) / parseFloat(removeCommas(buyAmount));
      console.log('Calculated OTC price (selling HEX):', price);
      return price;
    } else {
      // For any other token pair, convert using DexScreener prices
      console.log('Attempting to calculate via DexScreener prices...');
      const buyTokenPriceInHex = getTokenPriceInHex(buyToken.address);
      if (buyTokenPriceInHex) {
        // Convert: buyAmount of buyToken -> HEX equivalent, then divide by sellAmount
        const buyAmountInHex = parseFloat(removeCommas(buyAmount)) * buyTokenPriceInHex;
        const pricePerSellToken = buyAmountInHex / parseFloat(removeCommas(sellAmount));
        console.log('Calculated OTC price via DexScreener:', pricePerSellToken);
        return pricePerSellToken;
      } else {
        console.log('Could not get buyToken price in HEX');
      }
    }
    console.log('Returning null - no valid calculation path');
    return null;
  }, [sellToken, buyToken, sellAmount, buyAmount, tokenPrices]);

  // Get whitelisted token options for sell side
  const sellTokenOptions: TokenOption[] = SELL_WHITELISTED_TOKENS.map(address => {
    const tokenInfo = getTokenInfo(address);
    return {
      address,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo,
      decimals: tokenInfo.decimals
    };
  }).filter(token => token.ticker); // Filter out any invalid tokens

  // Get whitelisted token options for buy side
  const buyTokenOptions: TokenOption[] = BUY_WHITELISTED_TOKENS.map(address => {
    const tokenInfo = getTokenInfo(address);
    return {
      address,
      ticker: tokenInfo.ticker,
      name: tokenInfo.name,
      logo: tokenInfo.logo,
      decimals: tokenInfo.decimals
    };
  }).filter(token => token.ticker); // Filter out any invalid tokens

  // Helper function to get token index from address (for sell tokens)
  const getSellTokenIndex = (address: string): number => {
    const index = SELL_WHITELISTED_TOKENS.findIndex(tokenAddress =>
      tokenAddress.toLowerCase() === address.toLowerCase()
    );
    return index;
  };

  // Helper function to get token index from address (for buy tokens)
  const getBuyTokenIndex = (address: string): number => {
    // Find the contract index, not the position in BUY_WHITELISTED_TOKENS
    for (const [index, tokenAddress] of Object.entries(CONTRACT_WHITELIST_MAP)) {
      if (tokenAddress.toLowerCase() === address.toLowerCase()) {
        return parseInt(index);
      }
    }
    return -1;
  };

  // Handle MAX button clicks
  const handleMaxSellAmount = () => {
    if (sellTokenBalance) {
      const balance = sellTokenBalance.formatted;
      setSellAmount(balance);
    }
  };

  const handleMaxBuyAmount = () => {
    if (buyTokenBalance) {
      const balance = buyTokenBalance.formatted;
      setBuyAmount(balance);
    }
  };

  // Manual balance check for debugging
  const checkBalanceManually = async () => {
    if (!address || !sellToken || !publicClient) return;

    try {
      if (sellToken.address === '0x0') {
        // Native PLS balance
        const balance = await publicClient.getBalance({ address: address as `0x${string}` });
        console.log('Manual PLS balance:', formatEther(balance));
      } else {
        // ERC20/PRC20 balance
        const balance = await publicClient.readContract({
          address: sellToken.address as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        console.log('Manual token balance:', formatEther(balance as bigint));
      }
    } catch (error) {
      console.error('Manual balance check failed:', error);
    }
  };

  const handleCreateDeal = async () => {
    if (!isWalletConnected) {
      setOrderError('Please connect your wallet to create an order');
      return;
    }

    if (!sellToken || !buyToken || !sellAmount || !buyAmount) {
      setOrderError('Please fill in all required fields');
      return;
    }

    // Check if the same token is selected for both offer and ask
    if (sellToken.address === buyToken.address) {
      setOrderError(`Cannot trade ${sellToken.ticker} for ${buyToken.ticker}. Please select different tokens for your offer and ask.`);
      return;
    }


    console.log('Starting order creation process...');
    setIsCreatingOrder(true);
    setOrderError(null);
    setApprovalError(null);
    setTransactionPending(true);
    onTransactionStart?.();
    console.log('Loading states set, isCreatingOrder should now be true');

    try {
      // Convert amounts to wei using correct token decimals
      const sellAmountWei = parseTokenAmount(removeCommas(sellAmount), sellToken.decimals);
      const buyAmountWei = parseTokenAmount(removeCommas(buyAmount), buyToken.decimals);


      // Calculate expiration time (current time + expiration days)
      const expirationTime = BigInt(Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60));

      // Map buy token to its index
      const buyTokenIndex = getBuyTokenIndex(buyToken.address);
      if (buyTokenIndex === -1) {
        throw new Error('Invalid buy token selected');
      }

      // Prepare order details
      const orderDetails = {
        sellToken: sellToken.address as `0x${string}`,
        sellAmount: sellAmountWei,
        buyTokensIndex: [buyTokenIndex],
        buyAmounts: [buyAmountWei],
        expirationTime: expirationTime
      };

      console.log('Creating order with details:', orderDetails);

      // Call the contract function - only send value if selling native PLS
      const value = sellToken.address === '0x000000000000000000000000000000000000dead' ? sellAmountWei : undefined;
      const txHash = await placeOrder(orderDetails, value);

      console.log('Transaction sent:', txHash);

      // Wait for transaction confirmation using public client
      console.log('Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 60_000, // 60 second timeout
      });

      console.log('Order created successfully:', receipt);

      // Refresh data and navigate to show the new order
      onOrderCreated?.();

      // Show success toast and close modal only after confirmation
      console.log('Calling onTransactionSuccess with message...');
      onTransactionSuccess?.('Order created successfully! Your deal is now live on the marketplace.');

      console.log('Closing modal...');
      handleClose();

    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage = error.message || 'Failed to create order. Please try again.';
      setOrderError(errorMessage);
      console.log('Calling onTransactionError with:', errorMessage);
      onTransactionError?.(errorMessage);
    } finally {
      console.log('Cleaning up loading states...');
      setIsCreatingOrder(false);
      setTransactionPending(false);
      onTransactionEnd?.();
      console.log('Order creation process finished');
    }
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
          onAnimationComplete={() => {
            // Animation completed
          }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={() => {
              // Animation completed
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
                  <h3 className="text-white font-semibold mb-4">Your Offer</h3>

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
                        {sellTokenOptions.map((token) => (
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

                  {/* Balance and MAX button */}
                  {sellToken && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-400 text-xs">
                        {sellBalanceLoading ? (
                          'Loading balance...'
                        ) : sellBalanceError ? (
                          'Error loading balance'
                        ) : sellTokenBalance ? (
                          `Balance: ${formatNumberWithCommas(sellTokenBalance.formatted)} ${formatTokenTicker(sellToken.ticker)}`
                        ) : (
                          'Balance: --'
                        )}
                      </span>
                      <div className="flex space-x-2">
                        {sellTokenBalance && !sellBalanceLoading && !sellBalanceError && (
                          <button
                            type="button"
                            onClick={handleMaxSellAmount}
                            className="text-blue-400 hover:text-white text-xs font-medium transition-colors"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                    </div>
                  )}

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
                  <h3 className="text-white font-semibold mb-4">Your Ask</h3>

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
                        {buyTokenOptions.map((token) => (
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

                  {/* Invisible placeholder to match height with YOUR OFFER section */}
                  <div className="flex justify-between items-center mt-2 invisible">
                    <span className="text-gray-400 text-xs">
                      Balance: -- --
                    </span>
                    <div className="flex space-x-2">
                      <span className="text-gray-400 hover:text-white text-xs font-medium">
                        MAX
                      </span>
                    </div>
                  </div>

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

              {/* Deal Summary - Only show when offer amount is entered and tokens are different */}
              {sellAmount && sellToken && parseFloat(removeCommas(sellAmount)) > 0 && !(sellToken && buyToken && sellToken.address === buyToken.address) && (
                <div className="bg-white/5 rounded-xl p-6 mt-6">
                  <h3 className="text-white font-semibold mb-4">Deal Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Your Offer:</span>
                      <span className="text-white font-medium">{formatNumberWithCommas(removeCommas(sellAmount))} {formatTokenTicker(sellToken.ticker)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Your Ask:</span>
                      <span className="text-white font-medium">{formatNumberWithCommas(removeCommas(buyAmount))} {buyToken ? formatTokenTicker(buyToken.ticker) : 'tokens'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-400">MAX Fee:</span>
                        <div className="text-xs text-gray-500 mt-1">Max 1% fee deducted from buyer at sale (0.5% with NFT)</div>
                      </div>
                      <span className="text-red-400 font-medium">-{formatNumberWithCommas((parseFloat(removeCommas(buyAmount)) * 0.01).toFixed(2))} {buyToken ? formatTokenTicker(buyToken.ticker) : 'tokens'}</span>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">You Receive:</span>
                        <span className="text-white font-bold">{formatNumberWithCommas((parseFloat(removeCommas(buyAmount)) * 0.99).toFixed(2))} {buyToken ? formatTokenTicker(buyToken.ticker) : 'tokens'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Plan - Show token stats when both tokens are selected, at least one has stats, and tokens are different */}
              {sellToken && buyToken && (showSellStats || showBuyStats) && !(sellToken.address === buyToken.address) && (
                <div className={`bg-white/5 rounded-xl p-6 mt-6 relative ${PAYWALL_ENABLED ? 'overflow-hidden' : ''}`}>
                  <h3 className="text-white font-semibold mb-4">Pro Plan</h3>
                  
                  {/* Paywall Overlay */}
                  {PAYWALL_ENABLED && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPaywallModal(true);
                        }}
                        className="flex flex-col items-center space-y-3 p-6 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <Lock className="w-12 h-12 text-gray-400 hover:text-white transition-colors" />
                        <div className="text-center">
                          <p className="text-white font-semibold">Premium Data Access</p>
                          <p className="text-gray-400 text-sm">Click to unlock advanced analytics</p>
                        </div>
                      </button>
                    </div>
                  )}
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

                            // Use the calculated OTC price
                            const yourPriceInHEX = calculateOtcPriceInHex;

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
                                  <span className="text-gray-400">Progress:</span>
                                  <span className="text-blue-400">{(sellStats.dates.progressPercentage * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Backing per Token:</span>
                                  <span className="text-white">{sellStats.token.backingPerToken.toFixed(4)} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Current Market Price:</span>
                                  <span className="text-white">{sellStats.token.priceHEX.toFixed(4)} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Current Discount / Premium from Backing:</span>
                                  <span className={`font-medium ${sellStats.token.discountFromBacking > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {(sellStats.token.discountFromBacking * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Current Discount / Premium from Mint:</span>
                                  <span className={`font-medium ${sellStats.token.discountFromMint > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {(sellStats.token.discountFromMint * 100).toFixed(2)}%
                                  </span>
                                </div>

                                {/* Subtle divider */}
                                <div className="border-t border-white/10 my-3"></div>

                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your OTC Price:</span>
                                  <span className="text-white">{yourPriceInHEX ? yourPriceInHEX.toFixed(4) : 'N/A'} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Backing:</span>
                                  <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourDiscountFromBacking !== null ? (yourDiscountFromBacking * 100).toFixed(2) + '%' : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Mint:</span>
                                  <span className={`font-medium ${yourDiscountFromMint !== null ? (yourDiscountFromMint > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourDiscountFromMint !== null ? (yourDiscountFromMint * 100).toFixed(2) + '%' : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Market Price:</span>
                                  <span className={`font-medium ${yourPriceInHEX !== null && sellStats.token.priceHEX > 0 ?
                                    ((yourPriceInHEX - sellStats.token.priceHEX) / sellStats.token.priceHEX > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourPriceInHEX !== null && sellStats.token.priceHEX > 0 ?
                                      (() => {
                                        const marketDiff = (yourPriceInHEX - sellStats.token.priceHEX) / sellStats.token.priceHEX;
                                        return marketDiff > 0 ?
                                          `${(marketDiff * 100).toFixed(2)}%` :
                                          `${Math.abs(marketDiff * 100).toFixed(2)}%`;
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

                            // Use the calculated OTC price
                            const yourPriceInHEX = calculateOtcPriceInHex;

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
                                  <span className="text-gray-400">Progress:</span>
                                  <span className="text-white">{(buyStats.dates.progressPercentage * 100).toFixed(1)}%</span>
                                </div>
                                                                <div className="flex justify-between">
                                                                  
                                  <span className="text-gray-400">Current Market Price:</span>
                                  <span className="text-white">{buyStats.token.priceHEX.toFixed(4)} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Backing per Token:</span>
                                  <span className="text-white">{buyStats.token.backingPerToken.toFixed(4)} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Market Discount / Premium from Backing:</span>
                                  <span className={`font-medium ${buyStats.token.discountFromBacking > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {(buyStats.token.discountFromBacking * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Current Mint Price:</span>
                                  <span className="text-white">1 HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Market Discount / Premium from Mint:</span>
                                  <span className={`font-medium ${buyStats.token.discountFromMint > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {(buyStats.token.discountFromMint * 100).toFixed(2)}%
                                  </span>
                                </div>


                                {/* Subtle divider */}
                                <div className="border-t border-white/10 my-3"></div>

                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your OTC Price:</span>
                                  <span className="text-white">{yourPriceInHEX ? yourPriceInHEX.toFixed(4) : 'N/A'} HEX</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Market Price:</span>
                                  <span className={`font-medium ${yourPriceInHEX !== null && buyStats.token.priceHEX > 0 ?
                                    ((yourPriceInHEX - buyStats.token.priceHEX) / buyStats.token.priceHEX > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourPriceInHEX !== null && buyStats.token.priceHEX > 0 ?
                                      (() => {
                                        const marketDiff = (yourPriceInHEX - buyStats.token.priceHEX) / buyStats.token.priceHEX;
                                        return (marketDiff * 100).toFixed(2) + '%';
                                      })() : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Mint:</span>
                                  <span className={`font-medium ${yourDiscountFromMint !== null ? (yourDiscountFromMint > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourDiscountFromMint !== null ? (yourDiscountFromMint * 100).toFixed(2) + '%' : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Your Discount / Premium from Backing:</span>
                                  <span className={`font-medium ${yourDiscountFromBacking !== null ? (yourDiscountFromBacking > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                    {yourDiscountFromBacking !== null ? (yourDiscountFromBacking * 100).toFixed(2) + '%' : 'N/A'}
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

            {/* Error Display */}
            {orderError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-red-400 text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{orderError}</p>
              </div>
            )}

            {/* Same Token Warning */}
            {sellToken && buyToken && sellToken.address === buyToken.address && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Cannot trade {sellToken.ticker} for {buyToken.ticker}. Please select different tokens for your offer and ask.
                </p>
              </div>
            )}

            {/* Approval Error Display */}
            {approvalError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-red-400 text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{approvalError}</p>
              </div>
            )}



            {/* Approval Status Info */}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleClose}
                disabled={isCreatingOrder}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={needsApproval && tokenNeedsApproval ? handleApproveToken : handleCreateDeal}
                disabled={!sellToken || !buyToken || !sellAmount || !buyAmount || !!isCreatingOrder || !!isApproving || !isWalletConnected || (sellToken && buyToken && sellToken.address === buyToken.address)}
                className={`px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${needsApproval && tokenNeedsApproval
                    ? isApproving
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-white/80'
                    : 'bg-white text-black hover:bg-gray-200'
                  }`}
              >
                {isCreatingOrder ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Order...</span>
                  </div>
                ) : isApproving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    <span>APPROVING & CREATING DEAL...</span>
                  </div>
                ) : needsApproval && tokenNeedsApproval ? (
                  `APPROVE & CREATE DEAL`
                ) : (
                  'CREATE DEAL'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="Premium Data Access"
        description="Get access to advanced token analytics and market insights"
        price="$99"
        contactUrl="https://x.com/hexgeta"
      />
    </AnimatePresence>
  );
}
