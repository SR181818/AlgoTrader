import React, { useState, useEffect } from 'react';
import { binanceMarketData } from '../services/BinanceMarketData';

export function SimpleTradingTest() {
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testPrices = async () => {
      try {
        console.log('Testing price fetching...');
        
        // Test BTC price
        const btc = await binanceMarketData.getCurrentPrice('BTCUSDT');
        setBtcPrice(btc);
        console.log('BTC Price:', btc);
        
        // Test ETH price
        const eth = await binanceMarketData.getCurrentPrice('ETHUSDT');
        setEthPrice(eth);
        console.log('ETH Price:', eth);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Price fetch error:', err);
        setError(`Failed to fetch prices: ${err}`);
        setIsLoading(false);
      }
    };

    testPrices();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold text-black mb-4">Testing Trading Platform</h1>
        <p className="text-gray-600">Loading market data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-black mb-8">Live Trading Platform Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Bitcoin (BTC/USDT)</h2>
          <div className="text-3xl font-bold text-blue-600">${btcPrice.toFixed(2)}</div>
          <p className="text-blue-700 text-sm mt-2">Live price from Binance API</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-2">Ethereum (ETH/USDT)</h2>
          <div className="text-3xl font-bold text-green-600">${ethPrice.toFixed(2)}</div>
          <p className="text-green-700 text-sm mt-2">Live price from Binance API</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Status</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Binance API Connected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Real-time Price Updates</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Trading Platform Ready</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Refresh Prices
        </button>
      </div>
    </div>
  );
}