import { TOKEN_CONSTANTS } from '@/constants/crypto';

// Create a map of token addresses to token info
const TOKEN_MAP = new Map(
  TOKEN_CONSTANTS.map(token => [
    token.a.toLowerCase(),
    {
      ticker: token.ticker,
      name: token.name,
      decimals: token.decimals,
      logo: getTokenLogo(token.ticker)
    }
  ])
);

// Function to get token logo URL based on ticker
function getTokenLogo(ticker: string): string {
  const logoMap: Record<string, string> = {
    // Base tokens
    'PLS': '/coin-logos/PLS.svg',
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
  };
  
  return logoMap[ticker] || '/coin-logos/default.svg';
}

// Function to get token info by address
export function getTokenInfo(address: string) {
  const tokenInfo = TOKEN_MAP.get(address.toLowerCase());
  if (tokenInfo) {
    return tokenInfo;
  }
  
  // Fallback for unknown tokens
  return {
    ticker: formatAddress(address),
    name: 'Unknown Token',
    decimals: 18,
    logo: 'https://via.placeholder.com/24x24/666666/ffffff?text=?'
  };
}

// Function to format address for display
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    return getTokenInfo(address);
  }
  
  return {
    ticker: `Token #${index}`,
    name: `Token #${index}`,
    decimals: 18,
    logo: 'https://via.placeholder.com/24x24/666666/ffffff?text=?'
  };
}
