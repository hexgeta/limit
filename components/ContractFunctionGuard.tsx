'use client'

import React from 'react';
import { useContractWhitelist, WhitelistedWriteFunction } from '@/hooks/contracts/useContractWhitelist';

interface ContractFunctionGuardProps {
  children: React.ReactNode;
  functionName?: string;
  fallback?: React.ReactNode;
}

/**
 * Component that guards contract function execution
 * Only renders children when wallet is connected
 */
export function ContractFunctionGuard({ 
  children, 
  functionName, 
  fallback 
}: ContractFunctionGuardProps) {
  const { isWalletConnected, isWriteFunctionWhitelisted, isReadFunction } = useContractWhitelist();

  // If a specific function is provided, check if it's whitelisted for write operations
  if (functionName && !isWriteFunctionWhitelisted(functionName) && !isReadFunction(functionName)) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">
          Function "{functionName}" is not whitelisted for execution.
        </p>
      </div>
    );
  }

  // For read functions, no wallet connection required
  if (functionName && isReadFunction(functionName)) {
    return <>{children}</>;
  }

  // If wallet is not connected, show fallback or default message
  if (!isWalletConnected) {
    return fallback || (
      <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-sm">
          Please connect your wallet to execute contract functions.
        </p>
      </div>
    );
  }

  // Wallet is connected and function is whitelisted (if specified)
  return <>{children}</>;
}

/**
 * Hook that provides a guard function for contract operations
 */
export function useContractGuard() {
  const { isWalletConnected, isWriteFunctionWhitelisted, isReadFunction } = useContractWhitelist();

  const guardFunction = (functionName?: string) => {
    if (functionName && !isWriteFunctionWhitelisted(functionName) && !isReadFunction(functionName)) {
      throw new Error(`Function "${functionName}" is not whitelisted for execution.`);
    }

    // For write functions, wallet connection is required
    if (functionName && isWriteFunctionWhitelisted(functionName) && !isWalletConnected) {
      throw new Error('Wallet not connected. Please connect your wallet to execute contract functions.');
    }

    return true;
  };

  return {
    guardFunction,
    isWalletConnected,
    isWriteFunctionWhitelisted,
    isReadFunction,
  };
}
