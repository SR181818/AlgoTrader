import React, { useState, useEffect } from 'react';
import { MarketData } from '../types/trading';
import { realDataService } from '../utils/realDataService';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'crypto' | 'forex' | 'commodities'>('crypto');

  useEffect(() => {
    const updateMarketData = () => {
      setMarketData(realDataService.getAllMarketData());
    };

    // Initial load
    updateMarketData();

    // Update every 10 seconds
    const interval = setInterval(updateMarketData, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredData = marketData.filter(data => {
    if (selectedCategory === 'crypto') return data.symbol.includes('USDT');
    if (selectedCategory === 'forex') return !data.symbol.includes('USDT') && !data.symbol.startsWith('XAU') && !data.symbol.startsWith('XAG') && !data.symbol.startsWith('WTI');
    if (selectedCategory === 'commodities') return data.symbol.startsWith('XAU') || data.symbol.startsWith('XAG') || data.symbol.startsWith('WTI');
    return true;
  }).slice(0, 8);

  const categories = [
    { id: 'crypto' as const, name: 'Crypto', icon: '₿' },
    { id: 'forex' as const, name: 'Forex', icon: '💱' },
    { id: 'commodities' as const, name: 'Commodities', icon: '🥇' }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Activity className="text-blue-400 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-white">Live Market Overview</h3>
          <div className="ml-3 text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
            Real Live Data
          </div>
        </div>
        
        <div className="flex space-x-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredData.map(data => (
          <div key={data.symbol} className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{data.symbol}</div>
                <div className="text-gray-400 text-xs">
                  Vol: {data.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  {data.spread && (
                    <span className="ml-2">
                      Spread: {data.spread.toFixed(data.symbol.includes('JPY') ? 3 : 5)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white font-mono text-sm">
                  ${data.price.toLocaleString('en-US', { 
                    minimumFractionDigits: data.symbol.includes('JPY') ? 3 : 
                                          data.symbol.includes('USDT') ? 2 : 5,
                    maximumFractionDigits: data.symbol.includes('JPY') ? 3 : 
                                          data.symbol.includes('USDT') ? 2 : 5
                  })}
                </div>
                <div className={`text-xs flex items-center justify-end ${
                  data.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {data.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span className="ml-1">{data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%</span>
                </div>
              </div>
            </div>
            
            {data.bid && data.ask && (
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>Bid: ${data.bid.toFixed(data.symbol.includes('JPY') ? 3 : 5)}</span>
                <span>Ask: ${data.ask.toFixed(data.symbol.includes('JPY') ? 3 : 5)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredData.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">Loading market data...</div>
          <div className="text-sm">Connecting to live data sources</div>
        </div>
      )}
    </div>
  );
}