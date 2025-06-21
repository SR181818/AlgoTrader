import React from 'react';
import { TradingSignal } from '../types/trading';
import { ArrowUpCircle, ArrowDownCircle, Minus, Target, Shield } from 'lucide-react';

interface SignalCardProps {
  signal: TradingSignal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const getSignalColor = () => {
    switch (signal.signal) {
      case 'buy': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'sell': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };
  
  const getSignalIcon = () => {
    switch (signal.signal) {
      case 'buy': return <ArrowUpCircle size={24} />;
      case 'sell': return <ArrowDownCircle size={24} />;
      default: return <Minus size={24} />;
    }
  };
  
  const getSignalText = () => {
    switch (signal.signal) {
      case 'buy': return 'LONG';
      case 'sell': return 'SHORT';
      default: return 'HOLD';
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Current Signal</h3>
        <div className={`flex items-center px-3 py-1 rounded-full border ${getSignalColor()}`}>
          {getSignalIcon()}
          <span className="ml-2 font-bold">{getSignalText()}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-gray-400 text-sm">Entry Price</div>
          <div className="text-white font-mono">
            ${signal.entry_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm">Confidence</div>
          <div className="text-white font-semibold">
            {(signal.confidence * 100).toFixed(0)}%
          </div>
        </div>
        
        <div className="flex items-center">
          <Shield size={16} className="text-red-400 mr-2" />
          <div>
            <div className="text-gray-400 text-sm">Stop Loss</div>
            <div className="text-red-400 font-mono text-sm">
              ${signal.stop_loss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Target size={16} className="text-green-400 mr-2" />
          <div>
            <div className="text-gray-400 text-sm">Take Profit</div>
            <div className="text-green-400 font-mono text-sm">
              ${signal.take_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-4">
        <div className="text-gray-400 text-sm mb-2">Analysis</div>
        <div className="space-y-1">
          {signal.reasoning.map((reason, index) => (
            <div key={index} className="text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
              • {reason}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}