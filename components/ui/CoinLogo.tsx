import { cn } from '@/lib/utils'
import { MORE_COINS } from '@/constants/more-coins'

const LOGO_SIZES = {
  sm: 'w-4 h-4',   // 16px
  md: 'w-6 h-6',   // 24px
  lg: 'w-8 h-8',   // 32px
  xl: 'w-10 h-10', // 40px
} as const

interface CoinLogoProps {
  symbol: string
  size?: keyof typeof LOGO_SIZES
  className?: string
  priority?: boolean
  inverted?: boolean
  variant?: 'default' | 'no-bg'
}

export function CoinLogo({ 
  symbol, 
  size = 'md', 
  className,
  priority = false,
  inverted = false,
  variant = 'default'
}: CoinLogoProps) {
  // Remove any 'p' or 'e' prefix from the symbol
  const baseSymbol = symbol.replace(/^[pe]/, '')
  
  // Check MORE_COINS for matching ticker or name
  const moreCoinMatch = MORE_COINS.find(coin => 
    coin.ticker === symbol || 
    coin.ticker === baseSymbol ||
    coin.name === symbol ||
    coin.name === baseSymbol
  )
  
  // Use the matched coin's ticker if found, otherwise use the base symbol
  const logoSymbol = moreCoinMatch ? moreCoinMatch.ticker : baseSymbol
  
  // Special case for ETH with no background
  const logoPath = logoSymbol === 'ETH' && variant === 'no-bg'
    ? '/coin-logos/eth-black-no-bg.svg'
    : `/coin-logos/${logoSymbol}.svg`
  
  return (
    <img
      src={logoPath}
      alt={`${symbol} logo`}
      className={cn(
        LOGO_SIZES[size],
        'object-contain',
        logoSymbol === 'HEX' ? '' : 'rounded-full',
        inverted ? 'brightness-0 invert' : '',
        className
      )}
      loading={priority ? 'eager' : 'lazy'}
      onError={(e) => {
        // Fallback to a white dollar sign icon
        e.currentTarget.style.display = 'none'
        const fallback = document.createElement('div')
        fallback.className = cn(
          LOGO_SIZES[size],
          'bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold',
          logoSymbol === 'HEX' ? '' : 'rounded-full',
          className
        )
        fallback.textContent = '$'
        e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget)
      }}
    />
  )
} 