'use client';

import { useState } from 'react';
import { OTCTrading } from '@/components/OTCTrading';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <WalletConnect />
        <OTCTrading />
      </div>
    </main>
  );
}

function WalletConnect() {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-4">Choose your preferred wallet to connect</p>
      </div>
      
      {/* Web3Modal Connect Button - this creates the appkit-connect-button */}
      <div className="flex justify-center">
        <w3m-button />
      </div>
    </div>
  );
} 