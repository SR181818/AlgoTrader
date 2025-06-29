import React from 'react';
import LiveTradingStrategy from '@/components/LiveTradingStrategy';

export default function LiveTradingPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Live Trading</h1>
        <p className="text-muted-foreground">Create and manage your automated trading strategies</p>
      </div>
      
      <LiveTradingStrategy />
    </div>
  );
}