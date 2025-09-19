import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { MORE_COINS } from '@/constants/more-coins';

// Create a map of token addresses to token info from both TOKEN_CONSTANTS and MORE_COINS
const TOKEN_MAP = new Map([
  // Add tokens from TOKEN_CONSTANTS (only if they have an address)
  ...TOKEN_CONSTANTS
    .filter(token => token.a && token.a.trim() !== '')
    .map(token => [
      token.a.toLowerCase(),
      {
        ticker: token.ticker,
        name: token.name,
        decimals: token.decimals,
        logo: getTokenLogo(token.ticker)
      }
    ]),
  // Add contract's native address mapping to PLS
  ['0x000000000000000000000000000000000000dead', {
    ticker: 'PLS',
    name: 'Pulse',
    decimals: 18,
    logo: getTokenLogo('PLS')
  }],
  // Add tokens from MORE_COINS (only if not already in TOKEN_CONSTANTS)
  ...MORE_COINS
    .filter(coin => coin.a && coin.a.trim() !== '' && !TOKEN_CONSTANTS.some(token => token.a && token.a.toLowerCase() === coin.a.toLowerCase()))
    .map(coin => [
      coin.a.toLowerCase(),
      {
        ticker: coin.ticker,
        name: coin.name,
        decimals: coin.decimals,
        logo: getTokenLogo(coin.ticker)
      }
    ])
]);

// Function to get token logo URL based on ticker
function getTokenLogo(ticker: string): string {
  const logoMap: Record<string, string> = {
    // Base tokens
    'PLS': '/coin-logos/PLS.svg',
    'WPLS': '/coin-logos/PLS.svg', // Wrapped PLS uses PLS logo
    'PLSX': '/coin-logos/PLSX.svg',
    'HEX': '/coin-logos/HEX.svg',
    'ETH': '/coin-logos/ETH.svg',
    'BASE': '/coin-logos/BASE.svg',
    'MAXI': '/coin-logos/MAXI.svg',
    'DECI': '/coin-logos/DECI.svg',
    'LUCKY': '/coin-logos/LUCKY.svg',
    'TRIO': '/coin-logos/TRIO.svg',
    
    // Wrapped tokens (we*)
    'weHEX': '/coin-logos/weHEX.svg',
    'weMAXI': '/coin-logos/weMAXI.svg',
    'weDECI': '/coin-logos/weDECI.svg',
    'weLUCKY': '/coin-logos/weLUCKY.svg',
    'weTRIO': '/coin-logos/weTRIO.svg',
    'weBASE': '/coin-logos/weBASE.svg',
    'weUSDC': '/coin-logos/weUSDC.svg',
    'weUSDT': '/coin-logos/weUSDT.svg',
    
    // Pulse versions (p*)
    'pHEX': '/coin-logos/HEX.svg',
    'pMAXI': '/coin-logos/MAXI.svg',
    'pDECI': '/coin-logos/DECI.svg',
    'pLUCKY': '/coin-logos/LUCKY.svg',
    'pTRIO': '/coin-logos/TRIO.svg',
    'pBASE': '/coin-logos/BASE.svg',
    
    // Ethereum versions (e*)
    'eHEX': '/coin-logos/HEX.svg',
    'eMAXI': '/coin-logos/MAXI.svg',
    'eDECI': '/coin-logos/DECI.svg',
    'eLUCKY': '/coin-logos/LUCKY.svg',
    'eTRIO': '/coin-logos/TRIO.svg',
    'eBASE': '/coin-logos/BASE.svg',
    
    // Additional tokens from more-coins.ts
    'BRIBE': '/coin-logos/default.svg', // No BRIBE.svg file exists
    'DARK': '/coin-logos/default.svg', // No DARK.svg file exists
    'OG': '/coin-logos/default.svg', // No OG.svg file exists
  };
  
  return logoMap[ticker] || '/coin-logos/default.svg';
}

// Function to get token info by address
export function getTokenInfo(address: string): {
  ticker: string;
  name: string;
  decimals: number;
  logo: string;
  address: string;
} {
  // Handle native token mapping - contract uses 0xdEaD, frontend uses 0x0
  const normalizedAddress = address.toLowerCase();
  const nativeAddresses = ['0x0', '0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead'];
  
  let searchAddress = normalizedAddress;
  if (nativeAddresses.includes(normalizedAddress)) {
    // Try to find PLS token info using any of the native addresses
    for (const nativeAddr of nativeAddresses) {
      const tokenInfo = TOKEN_MAP.get(nativeAddr);
      if (tokenInfo) {
        return {
          ...tokenInfo,
          address: address // Return the original address passed in
        };
      }
    }
  }
  
  const tokenInfo = TOKEN_MAP.get(searchAddress);
  if (tokenInfo) {
    return {
      ...tokenInfo,
      address: address
    };
  }
  
  // Fallback for unknown tokens
  return {
    ticker: formatAddress(address),
    name: 'Unknown Token',
    decimals: 18,
    logo: '/coin-logos/default.svg',
    address: address
  };
}

// Function to format address for display
export function formatAddress(address: string): string {
  // Format address as '0x...[last 4 characters]'
  if (address.startsWith('0x') && address.length > 6) {
    return `0x...${address.slice(-4)}`;
  }
  return address; // Return original if not a long enough address to truncate
}

// Function to format token ticker for display (convert 'we' to 'e')
export function formatTokenTicker(ticker: string): string {
  // Convert 'we' prefixed tokens to 'e' prefixed for display
  if (ticker.startsWith('we')) {
    return 'e' + ticker.slice(2);
  }
  return ticker;
}

// Function to get token info by index (for buy tokens)
export function getTokenInfoByIndex(index: number) {
  // Map token indices to actual token addresses
  const indexMap: Record<number, string> = {
    0: '0x0', // PLS
    1: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX
    2: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX
    3: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', // INC
    4: '0x57fde0a71132198BBeC939B98976993d8D89D225', // weHEX
    5: '0x352511c9bc5d47dbc122883ed9353e987d10a3ba', // weMAXI
    6: '0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89', // weDECI
    7: '0x8924f56df76ca9e7babb53489d7bef4fb7caff19', // weLUCKY
    8: '0x0f3c6134f4022d85127476bc4d3787860e5c5569', // weTRIO
    9: '0xda073388422065fe8d3b5921ec2ae475bae57bed', // weBASE
  };
  
  const address = indexMap[index];
  if (address) {
    const tokenInfo = getTokenInfo(address);
    return {
      ...tokenInfo,
      address: address
    };
  }
  
  return {
    ticker: `Token #${index}`,
    name: `Token #${index}`,
    decimals: 18,
    logo: '/coin-logos/default.svg',
    address: `0x${index.toString().padStart(40, '0')}` // Fallback address
  };
}
