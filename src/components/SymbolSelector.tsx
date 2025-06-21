import React, { useState } from 'react';
import { TradingPair } from '../types/trading';
import { TRADING_PAIRS, CATEGORIES } from '../data/tradingPairs';
import { Search, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { realDataService } from '../utils/realDataService';

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function SymbolSelector({ selectedSymbol, onSymbolChange }: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredPairs = TRADING_PAIRS.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pair.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || pair.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedPair = TRADING_PAIRS.find(pair => pair.symbol === selectedSymbol);
  const marketData = realDataService.getMarketData(selectedSymbol);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-left transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {selectedPair?.category === 'crypto' ? '₿' : 
             selectedPair?.category === 'forex' ? '💱' : 
             selectedPair?.category === 'commodities' ? '🥇' : '📈'}
          </div>
          <div>
            <div className="text-white font-semibold">{selectedPair?.symbol || selectedSymbol}</div>
            <div className="text-gray-400 text-sm">{selectedPair?.name}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {marketData && (
            <div className="text-right">
              <div className="text-white font-mono">
                ${marketData.price.toLocaleString('en-US', { 
                  minimumFractionDigits: selectedPair?.tickSize.toString().split('.')[1]?.length || 2,
                  maximumFractionDigits: selectedPair?.tickSize.toString().split('.')[1]?.length || 2
                })}
              </div>
              <div className={`text-sm flex items-center ${marketData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {marketData.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="ml-1">{marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%</span>
              </div>
            </div>
          )}
          <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Search and Category Filter */}
          <div className="p-4 border-b border-gray-700">
            <div className="relative mb-3">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
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

          {/* Symbol List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredPairs.map(pair => {
              const data = realDataService.getMarketData(pair.symbol);
              return (
                <button
                  key={pair.symbol}
                  onClick={() => {
                    onSymbolChange(pair.symbol);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors ${
                    selectedSymbol === pair.symbol ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {pair.category === 'crypto' ? '₿' : 
                       pair.category === 'forex' ? '💱' : 
                       pair.category === 'commodities' ? '🥇' : '📈'}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{pair.symbol}</div>
                      <div className="text-gray-400 text-sm">{pair.name}</div>
                    </div>
                  </div>
                  
                  {data && (
                    <div className="text-right">
                      <div className="text-white font-mono text-sm">
                        ${data.price.toLocaleString('en-US', { 
                          minimumFractionDigits: pair.tickSize.toString().split('.')[1]?.length || 2,
                          maximumFractionDigits: pair.tickSize.toString().split('.')[1]?.length || 2
                        })}
                      </div>
                      <div className={`text-xs ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {filteredPairs.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No symbols found matching your criteria
            </div>
          )}
        </div>
      )}
    </div>
  );
}