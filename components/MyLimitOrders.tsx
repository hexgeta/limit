'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Order {
  id: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  fillStatus: number;
  otcVsMarket: string;
  status: string;
  expires: string;
  orderId: number;
}

interface MyLimitOrdersProps {
  refreshTrigger?: number;
}

export function MyLimitOrders({ refreshTrigger }: MyLimitOrdersProps) {
  const { address, isConnected } = useAccount();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for now - replace with actual data fetching
  const mockOrders: Order[] = [
    {
      id: '1',
      sellToken: 'MAXI',
      buyToken: 'HEX',
      sellAmount: '1.50',
      buyAmount: '1',
      fillStatus: 100,
      otcVsMarket: '-40%',
      status: 'Completed',
      expires: '3 Oct 25',
      orderId: 360,
    },
    {
      id: '2',
      sellToken: 'MAXI',
      buyToken: 'PLS',
      sellAmount: '2.50',
      buyAmount: '5.10',
      fillStatus: 100,
      otcVsMarket: '-99%',
      status: 'Completed',
      expires: '3 Oct 25',
      orderId: 356,
    },
  ];

  useEffect(() => {
    if (isConnected && address) {
      // Fetch user's orders
      setOrders(mockOrders);
    }
  }, [isConnected, address, refreshTrigger]);

  if (!isConnected) {
    return (
      <div className="bg-black/80 backdrop-blur-sm border-2 border-[#00D9FF] rounded-lg p-12 text-center shadow-[0_0_30px_rgba(0,217,255,0.3)]">
        <p className="text-[#00D9FF]">Connect your wallet to view your orders</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-black/80 backdrop-blur-sm border-2 border-[#00D9FF] rounded-lg p-12 text-center shadow-[0_0_30px_rgba(0,217,255,0.3)]">
        <p className="text-[#00D9FF]">No orders yet. Create your first limit order above!</p>
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-sm border-2 border-[#39FF14] rounded-lg overflow-hidden shadow-[0_0_30px_rgba(57,255,20,0.3)]">
      <div className="p-6 border-b-2 border-[#39FF14]/30">
        <h3 className="text-xl font-bold text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]">MY ORDERS</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#39FF14]/30">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">SOLD</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">BOUGHT</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">FILL STATUS %</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">OTC VS MARKET</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">OTC VS BACKING</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">STATUS</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">EXPIRES ↓</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#00D9FF]">ORDER ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[#39FF14]/20 hover:bg-[#39FF14]/10 transition-all"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-[#39FF14] font-medium">${parseFloat(order.sellAmount) * 0.0104}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-[#FF0080] border border-[#FF0080] shadow-[0_0_10px_rgba(255,0,128,0.5)] flex items-center justify-center text-xs text-black font-bold">
                        M
                      </div>
                      <span className="text-sm text-[#00D9FF]">{order.sellToken}</span>
                      <span className="text-sm text-[#39FF14]">{order.sellAmount}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-[#39FF14] font-medium">${parseFloat(order.buyAmount) * 0.006316}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-[#FF0080] border border-[#FF0080] shadow-[0_0_10px_rgba(255,0,128,0.5)] flex items-center justify-center text-xs text-black font-bold">
                        H
                      </div>
                      <span className="text-sm text-[#00D9FF]">{order.buyToken}</span>
                      <span className="text-sm text-[#39FF14]">{order.buyAmount}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#00D9FF] font-semibold">{order.fillStatus}%</span>
                    <div className="w-full bg-black border border-[#00D9FF]/30 rounded-full h-2">
                      <div
                        className="bg-[#00D9FF] h-2 rounded-full shadow-[0_0_10px_rgba(0,217,255,0.6)]"
                        style={{ width: `${order.fillStatus}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`font-medium ${order.otcVsMarket.startsWith('-') ? 'text-[#FF0080]' : 'text-[#39FF14]'}`}>
                      {order.otcVsMarket}
                    </span>
                    <span className="text-xs text-[#00D9FF]/70">discount</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#00D9FF]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm border-2 border-[#00D9FF] text-[#00D9FF] bg-[#00D9FF]/10 font-medium shadow-[0_0_10px_rgba(0,217,255,0.3)]">
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[#00D9FF]">{order.expires}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[#00D9FF] font-bold">#{order.orderId}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

