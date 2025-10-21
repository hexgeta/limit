'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black bg-blur-[1.65px] px-4 md:px-8 py-8 pb-12 md:pb-8 border-t border-[#00D9FF]/20 relative z-[100]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Info Column */}
          <div>
            <h3 className="text-s font-semibold mb-2 text-[#00D9FF]">
              Limit Pro {CURRENT_YEAR}
            </h3>
            <p className="text-sm text-[#00D9FF]/70">
              PulseChain Limit Orders
            </p>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-s font-semibold mb-2 text-[#00D9FF]">
              Legal
            </h4>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-sm text-[#00D9FF]/70 hover:text-[#00D9FF] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-and-conditions" 
                  className="text-sm text-[#00D9FF]/70 hover:text-[#00D9FF] transition-colors"
                >
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
