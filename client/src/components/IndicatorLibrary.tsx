import React, { useState, useEffect } from 'react';
import { CandleData } from '../types/trading';
import { calculateAllIndicators, analyzeSignals, IndicatorConfig, IndicatorSuite, SignalSummary } from '../utils/indicators';
import { Activity, TrendingUp, TrendingDown, BarChart3, Volume2, Zap, Settings } from 'lucide-react';

interface IndicatorLibraryProps {
  candles: CandleData[];
  symbol: string;
}

export function IndicatorLibrary({ candles, symbol }: IndicatorLibraryProps) {
  const [config, setConfig] = useState<IndicatorConfig>({
    // Default configuration - enable key indicators
    rsi: { period: 14 },
    macd: { fast: 12, slow: 26, signal: 9 },
    bollingerBands: { period: 20, stdDev: 2 },
    stochastic: { kPeriod: 14, dPeriod: 3 },
    atr: { period: 14 },
    obv: true,
    vwap: true,
    parabolicSAR: { acceleration: 0.02, maximum: 0.2 },
    cci: { period: 20 },
    mfi: { period: 14 }
  });
  
  const [indicators, setIndicators] = useState<IndicatorSuite>({});
  const [signalSummary, setSignalSummary] = useState<SignalSummary | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'momentum' | 'trend' | 'volume' | 'volatility'>('all');

  useEffect(() => {
    if (candles.length >= 50) {
      const calculatedIndicators = calculateAllIndicators(candles, config);
      setIndicators(calculatedIndicators);
      
      const summary = analyzeSignals(calculatedIndicators);
      setSignalSummary(summary);
    }
  }, [candles, config]);

  const categories = [
    { id: 'all' as const, name: 'All', icon: Activity },
    { id: 'momentum' as const, name: 'Momentum', icon: Zap },
    { id: 'trend' as const, name: 'Trend', icon: TrendingUp },
    { id: 'volume' as const, name: 'Volume', icon: Volume2 },
    { id: 'volatility' as const, name: 'Volatility', icon: BarChart3 }
  ];

  const getIndicatorsByCategory = () => {
    const momentum = ['rsi', 'stochastic', 'williamsR', 'roc', 'cci', 'mfi'];
    const trend = ['macd', 'bollingerBands', 'atr', 'parabolicSAR', 'ichimoku', 'adx'];
    const volume = ['obv', 'vwap', 'adLine', 'cmf', 'vroc', 'pvt'];
    const volatility = ['bbWidth', 'keltnerChannels', 'donchianChannels', 'atrPercent', 'volatilityIndex', 'chaikinVolatility'];
    
    switch (selectedCategory) {
      case 'momentum': return momentum;
      case 'trend': return trend;
      case 'volume': return volume;
      case 'volatility': return volatility;
      default: return [...momentum, ...trend, ...volume, ...volatility];
    }
  };

  const renderIndicatorValue = (name: string, data: any) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
    
    const latest = Array.isArray(data) ? data[data.length - 1] : data;
    
    if (name === 'stochastic') {
      // Add null checks for stochastic data
      if (!latest.k || !latest.d || latest.k.length === 0 || latest.d.length === 0) {
        return (
          <div className="text-gray-400 text-sm">
            No data available
          </div>
        );
      }
      
      const k = latest.k[latest.k.length - 1];
      const d = latest.d[latest.d.length - 1];
      
      // Additional check to ensure k and d have value property and are not NaN
      if (!k || !d || typeof k.value !== 'number' || typeof d.value !== 'number' || isNaN(k.value) || isNaN(d.value)) {
        return (
          <div className="text-gray-400 text-sm">
            Invalid data format
          </div>
        );
      }
      
      return (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">%K:</span>
            <span className="text-white font-mono">{k.value.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">%D:</span>
            <span className="text-white font-mono">{d.value.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    
    if (latest.values) {
      // Multi-value indicator
      return (
        <div className="space-y-1">
          {Object.entries(latest.values).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400 capitalize">{key}:</span>
              <span className="text-white font-mono">
                {typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    // Single value indicator - add null check for value property and NaN check
    if (!latest || typeof latest.value !== 'number' || isNaN(latest.value)) {
      return (
        <div className="text-gray-400 text-sm">
          No data available
        </div>
      );
    }
    
    return (
      <div className="text-white font-mono text-lg">
        {latest.value.toFixed(2)}
      </div>
    );
  };

  const getSignalColor = (signal?: string) => {
    switch (signal) {
      case 'buy': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'sell': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getSignalIcon = (signal?: string) => {
    switch (signal) {
      case 'buy': return <TrendingUp size={16} />;
      case 'sell': return <TrendingDown size={16} />;
      default: return <Activity size={16} />;
    }
  };

  if (candles.length < 50) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <div className="text-lg mb-2">Insufficient Data</div>
          <div className="text-sm">Need at least 50 candles for indicator analysis</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Activity className="text-blue-400 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-white">Technical Indicators Library</h3>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Settings size={16} className="mr-2" />
            Config
          </button>
        </div>

        {/* Signal Summary */}
        {signalSummary && (
          <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Signal Summary</h4>
              <div className={`flex items-center px-3 py-1 rounded-full border ${getSignalColor(signalSummary.overallSignal)}`}>
                {getSignalIcon(signalSummary.overallSignal)}
                <span className="ml-2 font-bold">{signalSummary.overallSignal.toUpperCase()}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-green-400 font-bold text-lg">{signalSummary.bullishSignals}</div>
                <div className="text-gray-400">Bullish</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-lg">{signalSummary.bearishSignals}</div>
                <div className="text-gray-400">Bearish</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 font-bold text-lg">{signalSummary.neutralSignals}</div>
                <div className="text-gray-400">Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-bold text-lg">{(signalSummary.confidence * 100).toFixed(0)}%</div>
                <div className="text-gray-400">Confidence</div>
              </div>
            </div>
            
            {(signalSummary.strongestBullish || signalSummary.strongestBearish) && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex justify-between text-xs">
                  {signalSummary.strongestBullish && (
                    <div className="text-green-400">
                      Strongest Bull: {signalSummary.strongestBullish.indicator} ({(signalSummary.strongestBullish.strength * 100).toFixed(0)}%)
                    </div>
                  )}
                  {signalSummary.strongestBearish && (
                    <div className="text-red-400">
                      Strongest Bear: {signalSummary.strongestBearish.indicator} ({(signalSummary.strongestBearish.strength * 100).toFixed(0)}%)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Filter */}
        <div className="flex space-x-2">
          {categories.map(category => {
            const Icon = category.icon;
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
                <Icon size={14} className="mr-1" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getIndicatorsByCategory().map(indicatorName => {
            const data = indicators[indicatorName as keyof IndicatorSuite];
            if (!data) return null;

            const latest = Array.isArray(data) ? data[data.length - 1] : data;
            const signal = latest?.signal || 'neutral';
            const strength = latest?.strength || 0;

            return (
              <div key={indicatorName} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-white font-medium capitalize">
                    {indicatorName.replace(/([A-Z])/g, ' $1').trim()}
                  </h5>
                  <div className={`flex items-center px-2 py-1 rounded text-xs ${getSignalColor(signal)}`}>
                    {getSignalIcon(signal)}
                    <span className="ml-1">{signal.toUpperCase()}</span>
                  </div>
                </div>
                
                {renderIndicatorValue(indicatorName, data)}
                
                {strength > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Strength</span>
                      <span>{(strength * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-gray-600 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${signal === 'buy' ? 'bg-green-400' : signal === 'sell' ? 'bg-red-400' : 'bg-gray-400'}`}
                        style={{ width: `${strength * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-t border-gray-700 p-6">
          <h4 className="text-white font-medium mb-4">Indicator Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add configuration controls here */}
            <div className="text-gray-400 text-sm">
              Configuration panel coming soon...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}