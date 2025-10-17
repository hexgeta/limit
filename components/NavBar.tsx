'use client'

import Link from 'next/link';
import { ConnectButton } from './ConnectButton';

const NavBar = () => {
  return (
    <nav className="w-full bg-black/60 px-8 py-4 top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl md:text-3xl">
          Limit Pro
        </Link>
        <div className="flex items-center space-x-6">
          <Link 
            href="/limit" 
            className="text-gray-300 hover:text-white transition-colors text-sm md:text-base font-medium"
          >
            Limit Orders
          </Link>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 