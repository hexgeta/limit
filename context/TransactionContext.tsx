'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface TransactionContextType {
  isTransactionPending: boolean
  setTransactionPending: (pending: boolean) => void
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [isTransactionPending, setIsTransactionPending] = useState(false)

  const setTransactionPending = (pending: boolean) => {
    setIsTransactionPending(pending)
  }

  return (
    <TransactionContext.Provider value={{ isTransactionPending, setTransactionPending }}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransaction() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider')
  }
  return context
}
