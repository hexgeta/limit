'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  price?: string;
  contactUrl?: string;
  partyBalance?: number;
  teamBalance?: number;
  requiredParty?: number;
  requiredTeam?: number;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  title = "Premium Analytics",
  description = "Get access to advanced token analytics for $99",
  price = "$99",
  contactUrl = "https://x.com/hexgeta",
  partyBalance = 0,
  teamBalance = 0,
  requiredParty = 50000,
  requiredTeam = 50000
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black opacity-100 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4"
        style={{ backgroundColor: '#000000' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mb-4">
            <Lock className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {description}
            </p>
          </div>
        
          {/* Token Balance Display */}
          <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Your $PARTY:</span>
              <div className="text-right">
                <span className={`font-medium ${partyBalance >= requiredParty ? 'text-green-400' : 'text-white'}`}>
                  {Math.floor(partyBalance).toLocaleString()}
                </span>
                <span className="text-gray-500 text-xs ml-1">/ {requiredParty.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Your $TEAM:</span>
              <div className="text-right">
                <span className={`font-medium ${teamBalance >= requiredTeam ? 'text-green-400' : 'text-white'}`}>
                  {Math.floor(teamBalance).toLocaleString()}
                </span>
                <span className="text-gray-500 text-xs ml-1">/ {requiredTeam.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                window.open('https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x4581AF35199BBde87a89941220e04E27ce4b0099', '_blank');
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Buy PARTY
            </button>
            <button
              onClick={() => {
                window.open('https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0xb7c9e99da8a857ce576a830a9c19312114d9de02', '_blank');
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Buy TEAM
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaywallModal;
