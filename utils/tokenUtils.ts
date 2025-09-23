import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { MORE_COINS } from '@/constants/more-coins';

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
    'INC': '/coin-logos/INC.svg',
    'PCOCK': '/coin-logos/PCOCK.svg',
    'HTT3000': '/coin-logos/HTT3000.svg',
    'HTT5000': '/coin-logos/HTT5000.svg',
    'HTT7000': '/coin-logos/HTT7000.svg',
    'ALAMO': '/coin-logos/ALAMO.svg',
    'BRIAH': '/coin-logos/BRIAH.svg',
    'weHEX': '/coin-logos/weHEX.svg',
    'WPLS': '/coin-logos/WPLS.svg',
    'weWETH': '/coin-logos/weWETH.svg',
    'weDAI': '/coin-logos/weDAI.svg',
    'weUSDC': '/coin-logos/weUSDC.svg',
    'weUSDT': '/coin-logos/weUSDT.svg',
    'HDRN': '/coin-logos/HDRN.svg',
    'ICSA': '/coin-logos/ICSA.svg',
    'COM': '/coin-logos/COM.svg',
    'YEP': '/coin-logos/YEP.svg',
    'EDAI': '/coin-logos/EDAI.svg',
    'eDAI': '/coin-logos/EDAI.svg',
    'DAI': '/coin-logos/weDAI.svg', // DAI uses weDAI logo
    'weWETH': '/coin-logos/weWETH.svg',
    'WPLS': '/coin-logos/WPLS.svg',
    'INC': '/coin-logos/INC.svg',
    'PCOCK': '/coin-logos/PCOCK.svg',
    'HTT3000': '/coin-logos/HTT3000.svg',
    'HTT5000': '/coin-logos/HTT5000.svg',
    'HTT7000': '/coin-logos/HTT7000.svg',
    'ALAMO': '/coin-logos/ALAMO.svg',
    'BRIAH': '/coin-logos/BRIAH.svg',
    'HDRN': '/coin-logos/HDRN.svg',
    'ICSA': '/coin-logos/ICSA.svg',
    'COM': '/coin-logos/COM.svg',
  };
  
  return logoMap[ticker] || '/coin-logos/default.svg';
}

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
// This maps contract token indices to actual token addresses
export function getTokenInfoByIndex(index: number) {
  // Map contract token indices to actual token addresses
  // Based on the contract's whitelist order
  const contractTokenMap: Record<number, string> = {
    0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX
    1: '0xefd766ccb38eaf1dfd701853bfce31359239f305', // weDAI
    2: '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140', // LUCKY
    3: '0xf55cd1e399e1cc3d95303048897a680be3313308', // TRIO
    4: '0xe9f84d418b008888a992ff8c6d22389c2c3504e0', // BASE
    5: '0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89', // weDECI
    6: '0x8924f56df76ca9e7babb53489d7bef4fb7caff19', // weLUCKY
    7: '0x0f3c6134f4022d85127476bc4d3787860e5c5569', // weTRIO
    8: '0xda073388422065fe8d3b5921ec2ae475bae57bed', // weBASE
    9: '0x57fde0a71132198BBeC939B98976993d8D89D225', // weHEX
    10: '0x000000000000000000000000000000000000dEaD', // PLS (native)
    11: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
    12: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX
    13: '0x6b32022693210cd2cfc466b9ac0085de8fc34ea6', // DECI
  };
  
  const address = contractTokenMap[index];
  if (address) {
    const tokenInfo = getTokenInfo(address);
    return {
      ...tokenInfo,
      address: address
    };
  }
  
  return {
    address: '0x0000000000000000000000000000000000000000',
    ticker: 'UNKNOWN',
    name: 'Unknown Token',
    logo: '/coin-logos/default.svg',
    decimals: 18
  };
}

// Function to parse token amount to wei based on token decimals
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const cleanAmount = amount.replace(/,/g, '');
  const [integerPart, decimalPart = ''] = cleanAmount.split('.');
  
  // Pad decimal part to match token decimals
  const paddedDecimalPart = decimalPart.padEnd(decimals, '0').slice(0, decimals);
  
  // Combine integer and decimal parts
  const fullAmount = integerPart + paddedDecimalPart;
  
  return BigInt(fullAmount);
}

// Function to format token amount from wei based on token decimals
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const amountStr = amount.toString();
  
  if (amountStr.length <= decimals) {
    // Amount is less than 1 token
    const paddedAmount = amountStr.padStart(decimals, '0');
    const decimalPart = paddedAmount.slice(-decimals);
    return `0.${decimalPart}`.replace(/\.?0+$/, '') || '0';
  }
  
  const integerPart = amountStr.slice(0, -decimals);
  const decimalPart = amountStr.slice(-decimals);
  
  // Remove trailing zeros from decimal part
  const trimmedDecimalPart = decimalPart.replace(/0+$/, '');
  
  if (trimmedDecimalPart === '') {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedDecimalPart}`;
}
