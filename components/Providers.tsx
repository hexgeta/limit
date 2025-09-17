'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/utils/swr-config'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiConfig } from 'wagmi'
import { pulsechain } from 'wagmi/chains'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
// import { ThemeProvider } from '@/components/ui/theme-provider'
// import { Toaster } from '@/components/ui/toaster'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Web3Modal config that creates the AppKit-like interface
const metadata = {
  name: 'OTC Max',
  description: 'OTC Trading on PulseChain',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://otc-max.com',
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

// Create Web3Modal - this generates the appkit-connect-button
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false,
  enableOnramp: false,
  themeMode: 'dark'
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <SWRConfig value={swrConfig}>
          {/* <ThemeProvider> */}
            {children}
            {/* <Toaster /> */}
          {/* </ThemeProvider> */}
        </SWRConfig>
      </WagmiConfig>
    </QueryClientProvider>
  )
} 