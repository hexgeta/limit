'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/utils/swr-config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
// import { ThemeProvider } from '@/components/ui/theme-provider'
// import { Toaster } from '@/components/ui/toaster'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [wagmiConfig, setWagmiConfig] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Initialize everything on client side only
  useEffect(() => {
    setIsClient(true)
    
    // Import and configure wagmi only on client side
    const initWagmi = async () => {
      const { defaultWagmiConfig } = await import('@web3modal/wagmi/react/config')
      const { WagmiConfig } = await import('wagmi')
      const { pulsechain } = await import('wagmi/chains')
      const { createWeb3Modal } = await import('@web3modal/wagmi/react')
      
      // Web3Modal config that creates the AppKit-like interface
      const metadata = {
        name: 'OTC Max',
        description: 'OTC Trading on PulseChain',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }

      const config = defaultWagmiConfig({
        chains: [pulsechain],
        projectId,
        metadata,
        auth: {
          email: true,
          socials: ['google', 'x', 'github', 'discord'],
          showWallets: true,
          walletFeatures: true
        }
      })
      
      // Create Web3Modal
      createWeb3Modal({
        wagmiConfig: config,
        projectId,
        enableAnalytics: false,
        enableOnramp: false,
        themeMode: 'dark'
      })
      
      setWagmiConfig(config)
    }
    
    initWagmi()
  }, [])

  // Don't render wagmi providers until client-side
  if (!isClient || !wagmiConfig) {
    return (
      <QueryClientProvider client={queryClient}>
        <SWRConfig value={swrConfig}>
          {children}
        </SWRConfig>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </QueryClientProvider>
  )
} 