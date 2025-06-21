import React from 'react';
import { TechnicalIndicators } from '../types/trading';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';

interface IndicatorPanelProps {
  indicators: TechnicalIndicators | null;
  currentPrice: number;
}

export function IndicatorPanel({ indicators, currentPrice }: IndicatorPanelProps) {
  if (!indicators) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400">
          Loading indicators...
        </div>
      </div>
    );
  }
  
  const getBBPositionColor = (position: string) => {
    switch (position) {
      case 'above_upper': return 'text-red-400';
      case 'at_upper': return 'text-red-300';
      case 'at_lower': return 'text-green-300';
      case 'below_lower': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStochZoneColor = (zone: string) => {
    switch (zone) {
      case 'overbought': return 'text-red-400';
      case 'oversold': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <Activity className="text-blue-400 mr-2" size={20} />
        <h3 className="text-lg font-semibold text-white">Technical Indicators</h3>
      </div>
      
      <div className="space-y-4">
        {/* Bollinger Bands */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BarChart3 size={16} className="text-purple-400 mr-2" />
            <span className="text-white font-medium">Bollinger Bands</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-gray-400">Upper</div>
              <div className="text-red-400 font-mono">
                {indicators.bb.upper.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Middle</div>
              <div className="text-yellow-400 font-mono">
                {indicators.bb.middle.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Lower</div>
              <div className="text-green-400 font-mono">
                {indicators.bb.lower.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-400 text-xs">Position: </span>
            <span className={`text-xs font-semibold ${getBBPositionColor(indicators.bb.position)}`}>
              {indicators.bb.position.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* MACD */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp size={16} className="text-blue-400 mr-2" />
            <span className="text-white font-medium">MACD (34,144,9)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-400">MACD Line</div>
              <div className="text-blue-400 font-mono">
                {indicators.macd.macdLine.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Signal</div>
              <div className="text-orange-400 font-mono">
                {indicators.macd.signalLine.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-gray-400 text-xs">Histogram: </div>
            <div className={`font-mono text-sm ${indicators.macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {indicators.macd.histogram.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Trend: <span className="text-white">{indicators.macd.trend.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        
        {/* Stochastic RSI */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Activity size={16} className="text-green-400 mr-2" />
            <span className="text-white font-medium">Stochastic RSI</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-400">%K</div>
              <div className="text-cyan-400 font-mono">
                {indicators.stochRsi.k.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">%D</div>
              <div className="text-pink-400 font-mono">
                {indicators.stochRsi.d.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="text-gray-400 text-xs">Zone: </span>
              <span className={`text-xs font-semibold ${getStochZoneColor(indicators.stochRsi.zone)}`}>
                {indicators.stochRsi.zone.toUpperCase()}
              </span>
            </div>
            {indicators.stochRsi.cross !== 'none' && (
              <div>
                <span className="text-gray-400 text-xs">Cross: </span>
                <span className={`text-xs font-semibold ${indicators.stochRsi.cross === 'bullish_cross' ? 'text-green-400' : 'text-red-400'}`}>
                  {indicators.stochRsi.cross.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* RSI */}
        {indicators.rsi && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">RSI (14)</span>
              <div className={`font-mono text-lg ${
                indicators.rsi < 30 ? 'text-green-400' : 
                indicators.rsi > 70 ? 'text-red-400' : 'text-gray-300'
              }`}>
                {indicators.rsi.toFixed(2)}
              </div>
            </div>
            <div className="mt-2 bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  indicators.rsi < 30 ? 'bg-green-400' : 
                  indicators.rsi > 70 ? 'bg-red-400' : 'bg-blue-400'
                }`}
                style={{ width: `${indicators.rsi}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}