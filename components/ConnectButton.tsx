'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useTransaction } from '@/context/TransactionContext'
import { DisclaimerDialog } from './DisclaimerDialog'

export const ConnectButton = () => {
  const { isConnected, address } = useAccount()
  const { open } = useAppKit()
  const { isTransactionPending } = useTransaction()
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const handleConnectClick = () => {
    // Check if user has already accepted the disclaimer
    const hasAccepted = localStorage.getItem('disclaimer-accepted')
    
    if (!hasAccepted) {
      // Show disclaimer first
      setShowDisclaimer(true)
    } else {
      // Open wallet modal directly
      open()
    }
  }

  const handleDisclaimerAccept = () => {
    localStorage.setItem('disclaimer-accepted', 'true')
    setShowDisclaimer(false)
    // Open wallet modal after accepting
    open()
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        disabled={isTransactionPending}
        className={`flex items-center justify-center px-4 md:px-8 h-10 font-medium transition-all text-sm md:text-base border ${
          isTransactionPending 
            ? 'bg-gray-900 text-gray-600 border-gray-700 cursor-not-allowed' 
            : 'bg-black/40 text-[#00D9FF] border-[#00D9FF]/30 hover:bg-[#00D9FF]/10'
        }`}
      >
        {isTransactionPending ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent animate-spin"></div>
            <span>Pending...</span>
          </div>
        ) : (
          `${address.slice(0, 6)}...${address.slice(-4)}`
        )}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={handleConnectClick}
        className="flex items-center justify-center px-4 md:px-8 h-10 bg-black/40 text-[#00D9FF] border border-[#00D9FF]/30 font-medium hover:bg-[#00D9FF]/10 transition-all text-sm md:text-base"
      >
        CONNECT WALLET
      </button>
      <DisclaimerDialog 
        open={showDisclaimer}
        onAccept={handleDisclaimerAccept}
      />
    </>
  )
}
