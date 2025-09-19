'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black/60 px-8 py-8 border-t border-[rgba(255,255,255,0.2)] relative z-[100]">
      <div className="max-w-[1200px] mx-auto">
        <h3 className="text-s font-semibold mb-2">
          AgoráX {CURRENT_YEAR}
        </h3>
        <p className="text-sm text-[rgb(153,153,153)]">
          OTC Platform for Pooled HEX Stake Tokens
        </p>
      </div>
    </footer>
  );
};

export default Footer;
