'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { OpenPositionsTable } from '@/components/OpenPositionsTable';
import { CreatePositionModal } from '@/components/CreatePositionModal';
import { WhitelistDebugger } from '@/components/WhitelistDebugger';

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isConnected } = useAccount();
  
  // Set to false to hide the whitelist debugger
  const SHOW_WHITELIST_DEBUGGER = false;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* Hero Section */}
      <div className="w-full px-8 mt-24 mb-4 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-2xl text-white mb-4">
            Trade Pooled HEX Stake Tokens OTC
          </h2>
          <p className="text-md text-gray-400 max-w-2xl mx-auto mb-4 flex items-center justify-center">
            Peer-to-peer. At scale. On your own terms.
          </p>
          {isConnected && (
            <div className="flex justify-center">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-3 border border-white text-white rounded-full font-semibold transition-colors duration-0 create-deal-button"
              >
                + Create New OTC Deal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-8 py-2">
                <div className="max-w-6xl mx-auto">
                  {SHOW_WHITELIST_DEBUGGER && <WhitelistDebugger />}
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