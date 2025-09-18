'use client';

import { useState } from 'react';
import { OpenPositionsTable } from '@/components/OpenPositionsTable';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <OpenPositionsTable />
      </div>
    </main>
  );
} 