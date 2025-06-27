import React from 'react';
import { BarChart3, TrendingUp, Shield, Zap } from 'lucide-react';

export default function PlatformOverview() {
  return (
    <div className="py-16 bg-gray-800">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Platform Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="p-4 bg-blue-600 rounded-lg inline-block mb-4">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
            <p className="text-gray-400">Real-time market analysis with technical indicators</p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-green-600 rounded-lg inline-block mb-4">
              <TrendingUp size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Strategy Builder</h3>
            <p className="text-gray-400">Create and backtest custom trading strategies</p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-purple-600 rounded-lg inline-block mb-4">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Blockchain Security</h3>
            <p className="text-gray-400">Secure access with blockchain authentication</p>
          </div>
          
          <div className="text-center">
            <div className="p-4 bg-yellow-600 rounded-lg inline-block mb-4">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Data</h3>
            <p className="text-gray-400">Live market data and instant notifications</p>
          </div>
        </div>
      </div>
    </div>
  );
}