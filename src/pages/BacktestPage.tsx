import React from 'react';
import { BacktestDashboard } from '../components/BacktestDashboard';

export default function BacktestPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Backtesting Dashboard</h1>
        <div className="text-sm text-gray-400">
          Test your strategies against historical data
        </div>
      </div>
      
      <BacktestDashboard />
    </div>
  );
}