import React from 'react';
import { BarChart3, Activity, TrendingUp } from 'lucide-react';

export default function TradingDashboardPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
        <div className="text-sm text-gray-400">
          Real-time market analysis
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Market Overview</h3>
            <BarChart3 className="text-blue-400" size={20} />
          </div>
          <p className="text-gray-400">Live market data and analysis tools</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <p className="text-gray-400">Track your trading performance</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active Signals</h3>
            <Activity className="text-yellow-400" size={20} />
          </div>
          <p className="text-gray-400">Real-time trading signals</p>
        </div>
      </div>
    </div>
  );
}