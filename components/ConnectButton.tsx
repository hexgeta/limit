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
    <button
      onClick={() => open()}
      className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
    >
      Connect Wallet
    </button>
  )
}
