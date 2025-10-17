'use client';

import { useState } from 'react';
import { DisclaimerDialog } from '@/components/DisclaimerDialog';
import useToast from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { LimitOrderChart } from '@/components/LimitOrderChart';
import { LimitOrderForm } from '@/components/LimitOrderForm';
import { MyLimitOrders } from '@/components/MyLimitOrders';
import { AsciiNoiseEffect } from '@/components/ui/bg-asiic';

export default function LimitPage() {
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sellTokenAddress, setSellTokenAddress] = useState<string | undefined>();
  const [buyTokenAddress, setBuyTokenAddress] = useState<string | undefined>();

  return (
    <>
      <DisclaimerDialog />
      {/* ASCII Background Effect */}
      <div className="fixed inset-0 w-full h-full z-0">
        <AsciiNoiseEffect />
      </div>
      <main className="relative flex min-h-screen flex-col items-center z-10">
        {/* Hero Section */}
        <div className="w-full px-2 md:px-8 mt-24 mb-6">

        </div>

        {/* Chart and Form Section */}
        <div className="w-full px-2 md:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chart - Takes up 2 columns */}
              <div className="lg:col-span-2">
                <LimitOrderChart 
                  sellTokenAddress={sellTokenAddress}
                  buyTokenAddress={buyTokenAddress}
                />
              </div>
              
              {/* Order Form - Takes up 1 column */}
              <div className="lg:col-span-1">
                <LimitOrderForm
                  onTokenChange={(sell, buy) => {
                    setSellTokenAddress(sell);
                    setBuyTokenAddress(buy);
                  }}
                  onTransactionStart={() => setIsTransactionLoading(true)}
                  onTransactionEnd={() => setIsTransactionLoading(false)}
                  onTransactionSuccess={(message, txHash) => {
                    toast({
                      title: "Transaction Successful!",
                      description: message || "Your order has been created successfully.",
                      variant: "success",
                      action: txHash ? (
                        <ToastAction
                          altText="View transaction"
                          onClick={() => window.open(`https://otter.pulsechain.com/tx/${txHash}`, '_blank')}
                        >
                          View TX
                        </ToastAction>
                      ) : undefined,
                    });
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  onTransactionError={(error) => {
                    toast({
                      title: "Transaction Failed",
                      description: error || "An error occurred while creating your order.",
                      variant: "destructive",
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* My Orders Table */}
        <div className="w-full px-2 md:px-8 mt-8 mb-8">
          <div className="max-w-[1400px] mx-auto">
            <MyLimitOrders refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </>
  );
}

