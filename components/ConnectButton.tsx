'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'

export const ConnectButton = () => {
  const { isConnected, address } = useAccount()
  const { open } = useAppKit()

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
      >
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => open()}
        className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
      >
        Connect Wallet
      </button>
      <w3m-wallet-guide />
    </div>
  )
}
