import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StrategyConfig, StrategyRule } from '../../trading/StrategyRunner';
import { 
  Activity, 
  BarChart3, 
  Filter, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Volume2 
} from 'lucide-react';

interface IndicatorPanelProps {
  onAddIndicator: (rule: StrategyRule) => void;
  strategy: StrategyConfig;
}

// Define indicator categories
const INDICATOR_CATEGORIES = [
  { id: 'all', name: 'All', icon: Activity },
  { id: 'trend', name: 'Trend', icon: TrendingUp },
  { id: 'momentum', name: 'Momentum', icon: Zap },
  { id: 'volume', name: 'Volume', icon: Volume2 },
  { id: 'volatility', name: 'Volatility', icon: BarChart3 },
];

// Define available indicators
const AVAILABLE_INDICATORS = [
  {
    id: 'ema_crossover',
    name: 'EMA Crossover',
    description: 'Detects when fast EMA crosses above/below slow EMA',
    category: 'trend',
    parameters: {
      fastPeriod: { name: 'Fast Period', type: 'number', default: 12, min: 2, max: 50 },
      slowPeriod: { name: 'Slow Period', type: 'number', default: 26, min: 5, max: 200 }
    }
  },
  {
    id: 'rsi_overbought',
    name: 'RSI Overbought/Oversold',
    description: 'Identifies when RSI enters overbought or oversold territory',
    category: 'momentum',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 50 },
      overbought: { name: 'Overbought Level', type: 'number', default: 70, min: 50, max: 90 },
      oversold: { name: 'Oversold Level', type: 'number', default: 30, min: 10, max: 50 }
    }
  },
  {
    id: 'macd_signal',
    name: 'MACD Signal Cross',
    description: 'Detects when MACD line crosses signal line',
    category: 'momentum',
    parameters: {
      fastPeriod: { name: 'Fast Period', type: 'number', default: 12, min: 2, max: 50 },
      slowPeriod: { name: 'Slow Period', type: 'number', default: 26, min: 5, max: 200 },
      signalPeriod: { name: 'Signal Period', type: 'number', default: 9, min: 2, max: 50 }
    }
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands',
    description: 'Identifies when price touches or crosses Bollinger Bands',
    category: 'volatility',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 5, max: 100 },
      stdDev: { name: 'Standard Deviation', type: 'number', default: 2, min: 1, max: 4 }
    }
  },
  {
    id: 'volume_spike',
    name: 'Volume Spike',
    description: 'Detects unusual volume activity',
    category: 'volume',
    parameters: {
      threshold: { name: 'Threshold', type: 'number', default: 2, min: 1.5, max: 5 },
      lookback: { name: 'Lookback Period', type: 'number', default: 20, min: 5, max: 100 }
    }
  },
  {
    id: 'atr_stop_loss',
    name: 'ATR Stop Loss',
    description: 'Dynamic stop loss based on Average True Range',
    category: 'exit',
    parameters: {
      period: { name: 'ATR Period', type: 'number', default: 14, min: 5, max: 50 },
      multiplier: { name: 'Multiplier', type: 'number', default: 2, min: 1, max: 5 }
    }
  },
  {
    id: 'take_profit',
    name: 'Take Profit',
    description: 'Exit when price reaches target profit level',
    category: 'exit',
    parameters: {
      target: { name: 'Target (%)', type: 'number', default: 5, min: 1, max: 20 }
    }
  },
  {
    id: 'time_filter',
    name: 'Time Filter',
    description: 'Only trade during specific hours',
    category: 'filter',
    parameters: {
      startHour: { name: 'Start Hour', type: 'number', default: 9, min: 0, max: 23 },
      endHour: { name: 'End Hour', type: 'number', default: 17, min: 0, max: 23 }
    }
  },
  {
    id: 'stochastic_cross',
    name: 'Stochastic Cross',
    description: 'Stochastic K crosses D line',
    category: 'momentum',
    parameters: {
      kPeriod: { name: 'K Period', type: 'number', default: 14, min: 5, max: 50 },
      dPeriod: { name: 'D Period', type: 'number', default: 3, min: 1, max: 10 },
      slowing: { name: 'Slowing', type: 'number', default: 3, min: 1, max: 10 }
    }
  },
  {
    id: 'adx_trend_strength',
    name: 'ADX Trend Strength',
    description: 'Measures trend strength using ADX',
    category: 'trend',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 5, max: 50 },
      threshold: { name: 'Threshold', type: 'number', default: 25, min: 15, max: 50 }
    }
  }
];

export function IndicatorPanel({ onAddIndicator, strategy }: IndicatorPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Filter indicators based on search and category
  const filteredIndicators = AVAILABLE_INDICATORS.filter(indicator => {
    const matchesSearch = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         indicator.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || indicator.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleAddIndicator = (indicator: any) => {
    // Create a new rule from the indicator
    const newRule: StrategyRule = {
      id: `${indicator.id}_${Date.now()}`,
      name: indicator.name,
      description: indicator.description,
      category: indicator.category === 'exit' ? 'exit' : 
                indicator.category === 'filter' ? 'filter' : 'entry',
      weight: 0.5,
      enabled: true,
      evaluate: (signals, candle, context) => {
        // This is a placeholder function that would be replaced with actual logic
        return { 
          signal: 'neutral', 
          confidence: 0.5, 
          reasoning: `${indicator.name} evaluation` 
        };
      }
    };
    
    onAddIndicator(newRule);
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trend':
        return <TrendingUp size={16} />;
      case 'momentum':
        return <Zap size={16} />;
      case 'volume':
        return <Volume2 size={16} />;
      case 'volatility':
        return <BarChart3 size={16} />;
      case 'exit':
        return <TrendingDown size={16} />;
      case 'filter':
        return <Filter size={16} />;
      default:
        return <Activity size={16} />;
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Indicators</h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search indicators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {INDICATOR_CATEGORIES.map(category => {
            const CategoryIcon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <CategoryIcon size={14} className="mr-1" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {filteredIndicators.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-lg mb-2">No Indicators Found</div>
            <div className="text-sm">Try adjusting your search or filter</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIndicators.map(indicator => (
              <motion.div
                key={indicator.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleAddIndicator(indicator)}
                draggable
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div className="p-1.5 rounded mr-2 bg-gray-600">
                      {getCategoryIcon(indicator.category)}
                    </div>
                    <h4 className="font-medium text-sm">{indicator.name}</h4>
                  </div>
                  <div className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                    {indicator.category}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{indicator.description}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}