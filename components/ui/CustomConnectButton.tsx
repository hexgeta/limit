'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useState, useEffect } from 'react';

function ConnectButtonInner() {
  const { isConnected, address } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      open();
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-100 transition-colors duration-200"
      style={{ fontFamily: "'Persephone', ui-sans-serif, system-ui, sans-serif" }}
    >
      {isConnected ? (
        <span>Disconnect {formatAddress(address!)}</span>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
  );
}

export function CustomConnectButton() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <button
        className="px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-100 transition-colors duration-200"
        style={{ fontFamily: "'Persephone', ui-sans-serif, system-ui, sans-serif" }}
        disabled
      >
        <span>Loading...</span>
      </button>
    );
  }

  return <ConnectButtonInner />;
}
