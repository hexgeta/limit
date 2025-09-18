'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black/60 px-8 py-8 border-t border-[rgba(255,255,255,0.2)] relative z-[100]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">
            AgoráX {CURRENT_YEAR}
          </h3>
          <p className="text-sm text-[rgb(153,153,153)]">
            OTC Platform for Pooled HEX Stake Tokens
          </p>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Platform</h3>
          <ul className="text-sm space-y-1">
            <li><Link href="/" className="text-[rgb(153,153,153)] hover:text-gray-300">Trade OTC</Link></li>
            <li><Link href="/" className="text-[rgb(153,153,153)] hover:text-gray-300">Open Positions</Link></li>
            <li><Link href="/" className="text-[rgb(153,153,153)] hover:text-gray-300">How It Works</Link></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Resources</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://hex.com" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">HEX.com</a></li>
            <li><a href="https://pulsechain.com" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">PulseChain</a></li>
            <li><a href="https://docs.agorax.com" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Documentation</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Community</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://x.com/agorax" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Twitter</a></li>
            <li><a href="https://t.me/agorax" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Telegram</a></li>
            <li><a href="https://discord.gg/agorax" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Discord</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
