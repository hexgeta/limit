'use client'

import Link from 'next/link';
import { ConnectButton } from './ConnectButton';
import { NotificationBell } from './NotificationBell';

const NavBar = () => {
  return (
    <nav className="w-full bg-black bg-blur-[6.65px] px-8 py-4 fixed top-0 left-0 right-0 z-[100] border-b-2 border-[#00D9FF] shadow-[0_0_20px_rgba(0,217,255,0.5)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-[#00D9FF] font-bold text-xl md:text-3xl">
          AgoráX
        </Link>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 