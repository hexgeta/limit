'use client'

import { wagmiAdapter, projectId, networks } from '@/config/appkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { useAppKitScrollLock } from '@/hooks/useAppKitScrollLock'

// Set up queryClient
const queryClient = new QueryClient()

// Set up metadata
const metadata = {
  name: 'OTC Max - PulseChain Trading',
  description: 'Over-the-counter trading platform for PulseChain tokens',
  url: 'https://otc.lookintomaxi.com',
  icons: ['https://otc.lookintomaxi.com/favicon.png']
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'dark',
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  },
  themeVariables: {
    '--w3m-accent': '#9333ea', // Purple accent to match your theme
    '--w3m-border-radius-master': '8px',
    '--w3m-background-color': 'rgba(0, 0, 0, 0.5)', // Dark backdrop
    '--w3m-backdrop-filter': 'blur(4px)', // Blur effect
    '--w3m-z-index': '9999', // Higher than navbar and footer
  },
  // Ensure Rabby wallet is included and prominent
  includeWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rabby Wallet
    'c286eebc742a537cd1d6818363e9dc53b21759a1e8e5d9b263d0c03ec7703576', // WalletConnect
  ]
})

function AppKitProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)
  
  // Temporarily disable scroll lock to debug
  // useAppKitScrollLock()

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default AppKitProvider
