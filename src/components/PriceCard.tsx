import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface PriceCardProps {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

export function PriceCard({ symbol, price, change24h, volume, high24h, low24h }: PriceCardProps) {
  const isPositive = change24h >= 0;
  
  // Determine decimal places based on symbol type
  const getDecimalPlaces = (symbol: string) => {
    if (symbol.includes('JPY')) return 3;
    if (symbol.includes('USDT') || symbol.startsWith('XAU') || symbol.startsWith('XAG') || symbol.startsWith('WTI')) return 2;
    return 5; // Forex pairs
  };

  const decimalPlaces = getDecimalPlaces(symbol);
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{symbol}</h2>
        <div className={`flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <span className="ml-1 font-semibold">{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-3xl font-mono font-bold text-white">
            ${price.toLocaleString('en-US', { 
              minimumFractionDigits: decimalPlaces, 
              maximumFractionDigits: decimalPlaces 
            })}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">24h High</div>
            <div className="text-green-400 font-mono">
              ${high24h.toLocaleString('en-US', { 
                minimumFractionDigits: decimalPlaces, 
                maximumFractionDigits: decimalPlaces 
              })}
            </div>
          </div>
          <div>
            <div className="text-gray-400">24h Low</div>
            <div className="text-red-400 font-mono">
              ${low24h.toLocaleString('en-US', { 
                minimumFractionDigits: decimalPlaces, 
                maximumFractionDigits: decimalPlaces 
              })}
            </div>
          </div>
        </div>
        
        <div className="flex items-center text-gray-400 text-sm">
          <BarChart3 size={16} className="mr-2" />
          <span>Volume: {volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
}