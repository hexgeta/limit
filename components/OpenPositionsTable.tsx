'use client';

import { useState } from 'react';
import { useOpenPositions } from '@/hooks/contracts/useOpenPositions';
import { formatEther } from 'viem';

export function OpenPositionsTable() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  const { 
    contractName, 
    contractOwner, 
    contractSymbol, 
    totalSupply, 
    orderCounter,
    allOrders, 
    activeOrders, 
    completedOrders, 
    cancelledOrders, 
    isLoading, 
    error 
  } = useOpenPositions();

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
          <h2 className="text-xl font-bold mb-4">Contract Information</h2>
          <div className="text-red-500">
            <p className="font-semibold mb-2">Unable to connect to the OTC contract</p>
            <p className="text-sm mb-2">Error: {error.message}</p>
            <p className="text-sm text-gray-400 mb-2">
              Contract Address: 0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2
            </p>
            <p className="text-sm text-gray-400 mb-3">
              RPC Endpoint: https://rpc.pulsechain.com
            </p>
            <p className="text-sm text-gray-400 mb-3">
              This could mean:
            </p>
            <ul className="text-sm text-gray-400 ml-4 mb-4">
              <li>• The contract is not deployed at the expected address</li>
              <li>• The contract is not properly initialized</li>
              <li>• There's a network connectivity issue</li>
              <li>• The RPC endpoint is not responding correctly</li>
              <li>• Check the browser console for detailed error messages</li>
            </ul>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
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

  // Get the orders to display based on active tab
  const getDisplayOrders = () => {
    switch (activeTab) {
      case 'active': return activeOrders;
      case 'completed': return completedOrders;
      case 'cancelled': return cancelledOrders;
      default: return allOrders;
    }
  };

  const displayOrders = getDisplayOrders();

  return (
    <div className="w-full max-w-6xl mb-8">
      <div className="bg-white/5 p-6 rounded-lg border-2 border-white/10">
        <h2 className="text-xl font-bold mb-4">All Orders</h2>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({allOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded ${
              activeTab === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded ${
              activeTab === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completed ({completedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2 rounded ${
              activeTab === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cancelled ({cancelledOrders.length})
          </button>
        </div>

        {!displayOrders || displayOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No {activeTab} orders found</p>
            <p className="text-sm text-gray-400 mb-4">
              The contract shows {orderCounter ? orderCounter.toString() : 'unknown'} total orders, but there's a bug in the contract's view functions.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
              <p className="text-yellow-400 text-sm">
                <strong>Contract Issue:</strong> The `_viewUserOrdersWithStatus` function has a bug on line 711 
                where it checks `userOrders[index].status` instead of `orders[_user][index].status`.
              </p>
            </div>
          </div>
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
                {displayOrders.map((order, index) => (
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
                        {order.orderDetailsWithId.orderDetails.buyTokensIndex.map((tokenIndex: bigint, idx: number) => (
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
