'use client';

import { useOpenPositions } from '@/hooks/contracts/useOpenPositions';
import { formatEther } from 'viem';

export function OpenPositionsTable() {
  const { allOrders, isLoading, error } = useOpenPositions();

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mb-8">
        <div className="bg-white/5 p-6 rounded-lg border-2 border-white/10">
          <h2 className="text-xl font-bold mb-4">Open Positions</h2>
          <p className="text-gray-500">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mb-8">
        <div className="bg-white/5 p-6 rounded-lg border-2 border-white/10">
          <h2 className="text-xl font-bold mb-4">Open Positions</h2>
          <p className="text-red-500">Error loading positions: {error.message}</p>
        </div>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Cancelled';
      case 2: return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-green-400';
      case 1: return 'text-red-400';
      case 2: return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full max-w-6xl mb-8">
      <div className="bg-white/5 p-6 rounded-lg border-2 border-white/10">
        <h2 className="text-xl font-bold mb-4">Open Positions</h2>
        
        {!allOrders || allOrders.length === 0 ? (
          <p className="text-gray-500">No active positions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-2">Order ID</th>
                  <th className="text-left py-3 px-2">Owner</th>
                  <th className="text-left py-3 px-2">Sell Token</th>
                  <th className="text-left py-3 px-2">Sell Amount</th>
                  <th className="text-left py-3 px-2">Buy Tokens</th>
                  <th className="text-left py-3 px-2">Remaining %</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order, index) => (
                  <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-3 px-2 font-mono">
                      {order.orderDetailsWithId.orderId.toString()}
                    </td>
                    <td className="py-3 px-2 font-mono">
                      {formatAddress(order.userDetails.orderOwner)}
                    </td>
                    <td className="py-3 px-2 font-mono">
                      {formatAddress(order.orderDetailsWithId.orderDetails.sellToken)}
                    </td>
                    <td className="py-3 px-2">
                      {formatEther(order.orderDetailsWithId.orderDetails.sellAmount)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1">
                        {order.orderDetailsWithId.orderDetails.buyTokensIndex.map((tokenIndex, idx) => (
                          <div key={idx} className="text-xs">
                            Token #{tokenIndex.toString()}: {formatEther(order.orderDetailsWithId.orderDetails.buyAmounts[idx])}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {((Number(order.orderDetailsWithId.remainingExecutionPercentage) / 1e18) * 100).toFixed(2)}%
                    </td>
                    <td className={`py-3 px-2 ${getStatusColor(order.orderDetailsWithId.status)}`}>
                      {getStatusText(order.orderDetailsWithId.status)}
                    </td>
                    <td className="py-3 px-2">
                      {formatTimestamp(Number(order.orderDetailsWithId.orderDetails.expirationTime))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
