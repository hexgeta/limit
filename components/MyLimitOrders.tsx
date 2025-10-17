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
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
        <p className="text-gray-400">Connect your wallet to view your orders</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
        <p className="text-gray-400">No orders yet. Create your first limit order above!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <h3 className="text-xl font-bold text-white">My Orders</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Sold</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Bought</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Fill Status %</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">OTC vs Market Price</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">OTC vs Backing Price</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Expires ↓</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-white font-medium">${parseFloat(order.sellAmount) * 0.0104}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white font-bold">
                        M
                      </div>
                      <span className="text-sm text-gray-400">{order.sellToken}</span>
                      <span className="text-sm text-white">{order.sellAmount}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-white font-medium">${parseFloat(order.buyAmount) * 0.006316}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-xs text-white font-bold">
                        H
                      </div>
                      <span className="text-sm text-gray-400">{order.buyToken}</span>
                      <span className="text-sm text-white">{order.buyAmount}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-white">{order.fillStatus}%</span>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${order.fillStatus}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`font-medium ${order.otcVsMarket.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>
                      {order.otcVsMarket}
                    </span>
                    <span className="text-xs text-gray-500">discount</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm border border-blue-400 text-blue-400 bg-blue-400/10">
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white">{order.expires}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white">{order.orderId}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

