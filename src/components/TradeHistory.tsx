import React from 'react';
import { Trade } from '../types/trading';
import { ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const activeTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status !== 'open').slice(-10); // Last 10 closed trades
  
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100 : 0;
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Trading Performance</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{activeTrades.length}</div>
            <div className="text-gray-400 text-sm">Active Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnL.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Total P&L</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{winRate.toFixed(0)}%</div>
            <div className="text-gray-400 text-sm">Win Rate</div>
          </div>
        </div>
      </div>
      
      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <div className="p-6 border-b border-gray-700">
          <h4 className="text-white font-medium mb-3">Active Trades</h4>
          <div className="space-y-2">
            {activeTrades.map((trade) => (
              <div key={trade.id} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {trade.signal.signal === 'buy' ? (
                      <ArrowUpCircle size={16} className="text-green-400 mr-2" />
                    ) : (
                      <ArrowDownCircle size={16} className="text-red-400 mr-2" />
                    )}
                    <div>
                      <span className="text-white font-medium">
                        {trade.signal.signal.toUpperCase()}
                      </span>
                      <div className="text-xs text-gray-400">{trade.symbol}</div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    ${trade.signal.entry_price.toFixed(trade.symbol.includes('JPY') ? 3 : 
                      trade.symbol.includes('USDT') ? 2 : 5)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Opened {new Date(trade.entry_time).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Trades */}
      <div className="p-6">
        <h4 className="text-white font-medium mb-3">Recent Trades</h4>
        {closedTrades.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No completed trades yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {closedTrades.reverse().map((trade) => (
              <div key={trade.id} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {trade.signal.signal === 'buy' ? (
                      <ArrowUpCircle size={16} className="text-green-400 mr-2" />
                    ) : (
                      <ArrowDownCircle size={16} className="text-red-400 mr-2" />
                    )}
                    <div>
                      <span className="text-white font-medium">
                        {trade.signal.signal.toUpperCase()}
                      </span>
                      <div className="text-xs text-gray-400">{trade.symbol}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>Entry: ${trade.signal.entry_price.toFixed(trade.symbol.includes('JPY') ? 3 : 
                    trade.symbol.includes('USDT') ? 2 : 5)}</span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {trade.exit_reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}