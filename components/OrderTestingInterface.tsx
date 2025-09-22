'use client'

import React, { useState } from 'react';
import { useContractWhitelist } from '@/hooks/contracts/useContractWhitelist';
import { ContractFunctionGuard } from './ContractFunctionGuard';

export function OrderTestingInterface() {
  const { 
    placeOrder, 
    executeOrder, 
    isWalletConnected, 
    address 
  } = useContractWhitelist();

  const [createOrderData, setCreateOrderData] = useState({
    sellToken: '0x000000000000000000000000000000000000dEaD',
    sellAmount: '1000000000000000000',
    buyTokensIndex: [1],
    buyAmounts: ['500000000000000000'],
    expirationTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  });

  const [executeOrderData, setExecuteOrderData] = useState({
    orderId: '1',
    buyTokenIndexInOrder: '0',
    buyAmount: '250000000000000000'
  });

  const [createResult, setCreateResult] = useState<string>('');
  const [executeResult, setExecuteResult] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleCreateOrder = async () => {
    setIsCreating(true);
    setCreateResult('');

    try {
      const orderDetails = {
        sellToken: createOrderData.sellToken as `0x${string}`,
        sellAmount: BigInt(createOrderData.sellAmount),
        buyTokensIndex: createOrderData.buyTokensIndex.map(Number),
        buyAmounts: createOrderData.buyAmounts.map(BigInt),
        expirationTime: BigInt(createOrderData.expirationTime)
      };

      const txResult = await placeOrder(orderDetails, BigInt(createOrderData.sellAmount));
      setCreateResult(`Order created successfully! Transaction: ${txResult}`);
    } catch (error: any) {
      setCreateResult(`Error creating order: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExecuteOrder = async () => {
    setIsExecuting(true);
    setExecuteResult('');

    try {
      const txResult = await executeOrder(
        BigInt(executeOrderData.orderId),
        BigInt(executeOrderData.buyTokenIndexInOrder),
        BigInt(executeOrderData.buyAmount)
      );
      setExecuteResult(`Order executed successfully! Transaction: ${txResult}`);
    } catch (error: any) {
      setExecuteResult(`Error executing order: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-6">Order Testing Interface</h3>
      
      <div className="mb-6 p-3 rounded-lg bg-gray-800">
        <p className="text-sm text-gray-300">
          <span className="font-semibold">Wallet Status:</span>{' '}
          {isWalletConnected ? (
            <span className="text-green-400">
              Connected ({address?.slice(0, 6)}...{address?.slice(-4)})
            </span>
          ) : (
            <span className="text-red-400">Not Connected - Connect wallet to test functions</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4">Create Order (placeOrder)</h4>
          <p className="text-sm text-gray-400 mb-4">
            Create a new trading order to sell tokens for other tokens
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sell Token Address:
              </label>
              <input
                type="text"
                value={createOrderData.sellToken}
                onChange={(e) => setCreateOrderData({...createOrderData, sellToken: e.target.value})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="0x000000000000000000000000000000000000dEaD (for PLS)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sell Amount (wei):
              </label>
              <input
                type="text"
                value={createOrderData.sellAmount}
                onChange={(e) => setCreateOrderData({...createOrderData, sellAmount: e.target.value})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="1000000000000000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Buy Tokens Index (JSON array):
              </label>
              <input
                type="text"
                value={JSON.stringify(createOrderData.buyTokensIndex)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setCreateOrderData({...createOrderData, buyTokensIndex: parsed});
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="[1]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Buy Amounts (JSON array of wei):
              </label>
              <input
                type="text"
                value={JSON.stringify(createOrderData.buyAmounts)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setCreateOrderData({...createOrderData, buyAmounts: parsed});
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="[\"500000000000000000\"]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiration Time (Unix timestamp):
              </label>
              <input
                type="text"
                value={createOrderData.expirationTime}
                onChange={(e) => setCreateOrderData({...createOrderData, expirationTime: parseInt(e.target.value)})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="1678886400"
              />
            </div>

            <ContractFunctionGuard functionName="placeOrder">
              <button
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {isCreating ? 'Creating Order...' : 'Create Order'}
              </button>
            </ContractFunctionGuard>

            {createResult && (
              <div className="p-3 rounded-lg bg-gray-700">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Result:</span>
                </p>
                <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                  {createResult}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4">Execute Order (executeOrder)</h4>
          <p className="text-sm text-gray-400 mb-4">
            Fulfill an existing order by providing the required tokens
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Order ID:
              </label>
              <input
                type="text"
                value={executeOrderData.orderId}
                onChange={(e) => setExecuteOrderData({...executeOrderData, orderId: e.target.value})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Buy Token Index in Order:
              </label>
              <input
                type="text"
                value={executeOrderData.buyTokenIndexInOrder}
                onChange={(e) => setExecuteOrderData({...executeOrderData, buyTokenIndexInOrder: e.target.value})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Buy Amount (wei):
              </label>
              <input
                type="text"
                value={executeOrderData.buyAmount}
                onChange={(e) => setExecuteOrderData({...executeOrderData, buyAmount: e.target.value})}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="250000000000000000"
              />
            </div>

            <ContractFunctionGuard functionName="executeOrder">
              <button
                onClick={handleExecuteOrder}
                disabled={isExecuting}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {isExecuting ? 'Executing Order...' : 'Execute Order'}
              </button>
            </ContractFunctionGuard>

            {executeResult && (
              <div className="p-3 rounded-lg bg-gray-700">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Result:</span>
                </p>
                <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                  {executeResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-400 mb-2">Testing Instructions:</h5>
        <ul className="text-xs text-blue-300 space-y-1">
          <li>• <strong>Create Order:</strong> Set up a trade to sell PLS for EMAXI (or other tokens)</li>
          <li>• <strong>Execute Order:</strong> Fulfill an existing order by providing the required buy tokens</li>
          <li>• <strong>Token Addresses:</strong> Use 0x000000000000000000000000000000000000dEaD for native PLS</li>
          <li>• <strong>Amounts:</strong> Use wei values (1 PLS = 1000000000000000000 wei)</li>
          <li>• <strong>Expiration:</strong> Set future Unix timestamp (current + 7 days = {Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)})</li>
        </ul>
      </div>
    </div>
  );
}
