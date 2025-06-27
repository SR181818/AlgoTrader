import React, { useState } from 'react';
import { StrategySignal } from '../../trading/StrategyRunner';
import { TrendingUp, TrendingDown, Minus, Filter, Clock } from 'lucide-react';

interface SignalEventLogProps {
  signals: StrategySignal[];
  maxItems?: number;
}

export function SignalEventLog({ signals, maxItems = 50 }: SignalEventLogProps) {
  const [filter, setFilter] = useState<'all' | 'LONG' | 'SHORT' | 'HOLD'>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const filteredSignals = signals
    .filter(signal => filter === 'all' || signal.type === filter)
    .slice(0, maxItems)
    .sort((a, b) => b.timestamp - a.timestamp);

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'LONG': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'SHORT': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'LONG': return <TrendingUp size={16} />;
      case 'SHORT': return <TrendingDown size={16} />;
      default: return <Minus size={16} />;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG': return 'text-green-400';
      case 'MODERATE': return 'text-yellow-400';
      case 'WEAK': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Signal Event Log</h3>
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600"
            >
              <option value="all">All Signals</option>
              <option value="LONG">Long Only</option>
              <option value="SHORT">Short Only</option>
              <option value="HOLD">Hold Only</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Signal List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredSignals.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-lg mb-2">No Signals</div>
            <div className="text-sm">Strategy signals will appear here</div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredSignals.map((signal, index) => (
              <div key={`${signal.timestamp}-${index}`} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center px-2 py-1 rounded border ${getSignalColor(signal.type)}`}>
                      {getSignalIcon(signal.type)}
                      <span className="ml-1 font-bold text-xs">{signal.type}</span>
                    </div>
                    
                    <div className="text-white font-medium">
                      {signal.metadata.symbol}
                    </div>
                    
                    <div className={`text-xs font-medium ${getStrengthColor(signal.strength)}`}>
                      {signal.strength}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-white font-mono">
                      {formatPrice(signal.price)}
                    </div>
                    <div className="text-gray-400">
                      {formatTime(signal.timestamp)}
                    </div>
                    <button
                      onClick={() => setShowDetails(showDetails === `${signal.timestamp}-${index}` ? null : `${signal.timestamp}-${index}`)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {showDetails === `${signal.timestamp}-${index}` ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Signal Details */}
                {showDetails === `${signal.timestamp}-${index}` && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400 mb-2">Signal Details</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Confidence:</span>
                            <span className="text-white">{(signal.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Timeframe:</span>
                            <span className="text-white">{signal.metadata.timeframe}</span>
                          </div>
                          {signal.metadata.stopLoss && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Stop Loss:</span>
                              <span className="text-red-400">{formatPrice(signal.metadata.stopLoss)}</span>
                            </div>
                          )}
                          {signal.metadata.takeProfit && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Take Profit:</span>
                              <span className="text-green-400">{formatPrice(signal.metadata.takeProfit)}</span>
                            </div>
                          )}
                          {signal.metadata.riskReward && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Risk/Reward:</span>
                              <span className="text-white">1:{signal.metadata.riskReward.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-400 mb-2">Reasoning</div>
                        <div className="space-y-1">
                          {signal.reasoning.map((reason, idx) => (
                            <div key={idx} className="text-xs text-gray-300 bg-gray-600/50 px-2 py-1 rounded">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Indicator Values */}
                    {signal.indicators.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="text-gray-400 mb-2 text-sm">Active Indicators</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {signal.indicators.map((indicator, idx) => (
                            <div key={idx} className="bg-gray-600/30 rounded px-2 py-1">
                              <div className="text-xs text-gray-400">{indicator.name}</div>
                              <div className="text-xs text-white font-mono">
                                {typeof indicator.value === 'number' 
                                  ? indicator.value.toFixed(4)
                                  : 'Complex'
                                }
                              </div>
                              <div className={`text-xs ${
                                indicator.signal === 'buy' ? 'text-green-400' :
                                indicator.signal === 'sell' ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {indicator.signal.toUpperCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}