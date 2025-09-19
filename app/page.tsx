'use client';

import { useState } from 'react';
import { OpenPositionsTable } from '@/components/OpenPositionsTable';
import { CreatePositionModal } from '@/components/CreatePositionModal';

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* Hero Section */}
      <div className="w-full px-8 py-8 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl py-8 mx-auto text-center">
          <h2 className="text-4xl md:text-2xl text-gray-300 mb-4">
            Trade Pooled HEX Stake Tokens OTC
          </h2>
          <p className="text-md text-gray-400 max-w-2xl mx-auto mb-8">
            Buy and sell pooled HEX stake tokens. Peer-to-peer. At scale. On your terms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
              Connect Wallet
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 border border-white text-white rounded-full font-semibold hover:bg-white hover:text-black transition-colors"
            >
              Open Position
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-8 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
          </div>
          <OpenPositionsTable />
        </div>
      </div>

      {/* Create Position Modal */}
      <CreatePositionModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </main>
  );
} 