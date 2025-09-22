'use client'

import React, { useState } from 'react';
import { useContractWhitelist } from '@/hooks/contracts/useContractWhitelist';
import { ContractFunctionGuard } from './ContractFunctionGuard';

/**
 * Demo component showing how to use the contract whitelist system
 */
export function ContractFunctionDemo() {
  const { 
    getWhitelistedWriteFunctions,
    getReadFunctions,
    isWalletConnected, 
    address,
    executeWriteFunction 
  } = useContractWhitelist();
  
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionArgs, setFunctionArgs] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const whitelistedWriteFunctions = getWhitelistedWriteFunctions();
  const readFunctions = getReadFunctions();
  const allFunctions = [...whitelistedWriteFunctions, ...readFunctions];

  const handleExecuteFunction = async () => {
    if (!selectedFunction) return;

    setIsExecuting(true);
    setResult('');

    try {
      // Parse arguments (simple JSON parsing for demo)
      let args: any[] = [];
      if (functionArgs.trim()) {
        try {
          args = JSON.parse(functionArgs);
        } catch (e) {
          throw new Error('Invalid JSON format for arguments');
        }
      }

      const txResult = await executeWriteFunction(
        selectedFunction as any,
        args
      );

      setResult(`Transaction successful: ${txResult}`);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Contract Function Whitelist Demo</h3>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 rounded-lg bg-gray-800">
        <p className="text-sm text-gray-300">
          <span className="font-semibold">Wallet Status:</span>{' '}
          {isWalletConnected ? (
            <span className="text-green-400">
              Connected ({address?.slice(0, 6)}...{address?.slice(-4)})
            </span>
          ) : (
            <span className="text-red-400">Not Connected</span>
          )}
        </p>
        <p className="text-sm text-gray-300 mt-1">
          <span className="font-semibold">Write Functions:</span> {whitelistedWriteFunctions.length} | 
          <span className="font-semibold"> Read Functions:</span> {readFunctions.length}
        </p>
      </div>

      {/* Function Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Function:
        </label>
        <select
          value={selectedFunction}
          onChange={(e) => setSelectedFunction(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
        >
          <option value="">Select a function...</option>
          <optgroup label="Write Functions (Requires Wallet)">
            {whitelistedWriteFunctions.map((func) => (
              <option key={func} value={func}>
                {func}
              </option>
            ))}
          </optgroup>
          <optgroup label="Read Functions (No Wallet Required)">
            {readFunctions.map((func) => (
              <option key={func} value={func}>
                {func}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Arguments Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Function Arguments (JSON array):
        </label>
        <textarea
          value={functionArgs}
          onChange={(e) => setFunctionArgs(e.target.value)}
          placeholder='["arg1", "arg2", 123]'
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white h-20"
        />
      </div>

      {/* Execute Button */}
      <ContractFunctionGuard functionName={selectedFunction}>
        <button
          onClick={handleExecuteFunction}
          disabled={!selectedFunction || isExecuting}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium"
        >
          {isExecuting ? 'Executing...' : 'Execute Function'}
        </button>
      </ContractFunctionGuard>

      {/* Result */}
      {result && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800">
          <p className="text-sm text-gray-300">
            <span className="font-semibold">Result:</span>
          </p>
          <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}

      {/* Function Lists */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-white mb-3">Write Functions (Requires Wallet):</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {whitelistedWriteFunctions.map((func) => (
            <div
              key={func}
              className={`p-2 rounded text-xs font-mono ${
                selectedFunction === func
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setSelectedFunction(func)}
            >
              {func}
            </div>
          ))}
        </div>
        
        <h4 className="text-lg font-semibold text-white mb-3">Read Functions (No Wallet Required):</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {readFunctions.map((func) => (
            <div
              key={func}
              className={`p-2 rounded text-xs font-mono ${
                selectedFunction === func
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setSelectedFunction(func)}
            >
              {func}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
