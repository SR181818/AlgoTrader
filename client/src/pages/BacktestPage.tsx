import React from 'react';
import { Zap, BarChart3, TrendingUp } from 'lucide-react';

export default function BacktestPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Backtesting Dashboard</h1>
        <div className="text-sm text-gray-400">
          Test your strategies against historical data
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Strategy Configuration</h3>
            <Zap className="text-blue-400" size={20} />
          </div>
          <p className="text-gray-400">Configure your trading strategy parameters for backtesting</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Performance Results</h3>
            <BarChart3 className="text-green-400" size={20} />
          </div>
          <p className="text-gray-400">View comprehensive backtest results and metrics</p>
        </div>
      </div>
    </div>
  );
}