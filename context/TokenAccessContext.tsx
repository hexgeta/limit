'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { PAYWALL_ENABLED } from '@/config/paywall';

interface TokenAccessState {
  hasTokenAccess: boolean;
  partyBalance: number;
  teamBalance: number;
  isChecking: boolean;
  error: string | null;
  checkAccess: () => Promise<void>;
}

const TokenAccessContext = createContext<TokenAccessState | undefined>(undefined);

// Session storage key for caching
const SESSION_STORAGE_KEY = 'token_access_validation';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedValidation {
  hasAccess: boolean;
  partyBalance: number;
  teamBalance: number;
  timestamp: number;
  address: string;
}

export function TokenAccessProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [hasTokenAccess, setHasTokenAccess] = useState(false);
  const [partyBalance, setPartyBalance] = useState(0);
  const [teamBalance, setTeamBalance] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have a valid cached result for this address
  const getCachedValidation = (userAddress: string): CachedValidation | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!cached) return null;

      const parsed: CachedValidation = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
      const isDifferentAddress = parsed.address.toLowerCase() !== userAddress.toLowerCase();

      if (isExpired || isDifferentAddress) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  // Cache the validation result
  const setCachedValidation = (validation: Omit<CachedValidation, 'timestamp' | 'address'>, userAddress: string) => {
    if (typeof window === 'undefined') return;

    try {
      const cacheData: CachedValidation = {
        ...validation,
        timestamp: Date.now(),
        address: userAddress
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cacheData));
    } catch (err) {
    }
  };

  const checkAccess = async () => {
    if (!address || !isConnected) {
      setHasTokenAccess(false);
      setPartyBalance(0);
      setTeamBalance(0);
      return;
    }

    if (!PAYWALL_ENABLED) {
      setHasTokenAccess(true);
      return;
    }

    // Check cache first
    const cached = getCachedValidation(address);
    if (cached) {
      setHasTokenAccess(cached.hasAccess);
      setPartyBalance(cached.partyBalance);
      setTeamBalance(cached.teamBalance);
      return;
    }

    // No cache, make API call
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/validate-token-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const data = await response.json();

      setHasTokenAccess(data.hasAccess);
      setPartyBalance(data.partyBalance);
      setTeamBalance(data.teamBalance);

      // Cache the result
      setCachedValidation(
        {
          hasAccess: data.hasAccess,
          partyBalance: data.partyBalance,
          teamBalance: data.teamBalance,
        },
        address
      );


    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setHasTokenAccess(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Check access when address changes or on mount
  useEffect(() => {
    checkAccess();
  }, [address, isConnected]);

  const value: TokenAccessState = {
    hasTokenAccess,
    partyBalance,
    teamBalance,
    isChecking,
    error,
    checkAccess,
  };

  return (
    <TokenAccessContext.Provider value={value}>
      {children}
    </TokenAccessContext.Provider>
  );
}

export function useTokenAccess() {
  const context = useContext(TokenAccessContext);
  if (context === undefined) {
    throw new Error('useTokenAccess must be used within a TokenAccessProvider');
  }
  return context;
}

