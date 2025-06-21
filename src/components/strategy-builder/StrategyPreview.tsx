import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StrategyConfig } from '../../trading/StrategyRunner';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign 
} from 'lucide-react';

interface StrategyPreviewProps {
  strategy: StrategyConfig;
}

export function StrategyPreview({ strategy }: StrategyPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  
  useEffect(() => {
    // Simulate loading test results
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      // Generate mock test results
      const mockResults = generateMockResults(strategy);
      setTestResults(mockResults);
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [strategy, selectedTimeframe, selectedSymbol]);
  
  const generateMockResults = (strategy: StrategyConfig) => {
    // This would be replaced with actual backtesting logic
    const totalTrades = 50 + Math.floor(Math.random() * 50);
    const winRate = 40 + Math.floor(Math.random() * 40);
    const winningTrades = Math.floor(totalTrades * (winRate / 100));
    const losingTrades = totalTrades - winningTrades;
    
    const profitFactor = 1 + Math.random() * 2;
    const sharpeRatio = 0.5 + Math.random() * 2;
    const maxDrawdown = 5 + Math.random() * 15;
    
    const initialBalance = 10000;
    const finalBalance = initialBalance * (1 + (Math.random() * 0.5));
    const totalReturn = finalBalance - initialBalance;
    const totalReturnPercent = (totalReturn / initialBalance) * 100;
    
    // Generate equity curve points
    const equityCurve = [];
    let balance = initialBalance;
    
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.4) * 200; // Slightly biased towards positive
      balance += change;
      equityCurve.push(balance);
    }
    
    // Generate recent trades
    const trades = [];
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'];
    const now = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const isWin = Math.random() > 0.4;
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const entryPrice = 1000 + Math.random() * 50000;
      const pnlPercent = isWin ? (1 + Math.random() * 5) : -(1 + Math.random() * 3);
      const pnl = (entryPrice * pnlPercent) / 100;
      
      trades.push({
        id: `trade_${i}`,
        symbol,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        entryTime: now - (i * 3600000) - Math.random() * 3600000,
        exitTime: now - (i * 3600000),
        entryPrice,
        exitPrice: entryPrice * (1 + pnlPercent / 100),
        pnl,
        pnlPercent
      });
    }
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      initialBalance,
      finalBalance,
      totalReturn,
      totalReturnPercent,
      equityCurve,
      trades
    };
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Strategy Preview & Testing</h2>
          <p className="text-gray-400 text-sm">Test your strategy against historical data</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="SOL/USDT">SOL/USDT</option>
            <option value="ADA/USDT">ADA/USDT</option>
          </select>
          
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          >
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
          
          <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors">
            <Play size={16} className="mr-2" />
            Run Test
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-300">Running strategy test...</p>
        </div>
      ) : testResults ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">Total Return</div>
                  <div className={`text-2xl font-bold ${testResults.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(testResults.totalReturn)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatPercent(testResults.totalReturnPercent)}
                  </div>
                </div>
                {testResults.totalReturn >= 0 ? 
                  <TrendingUp className="text-green-400" size={24} /> :
                  <TrendingDown className="text-red-400" size={24} />
                }
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">Win Rate</div>
                  <div className="text-2xl font-bold text-white">
                    {testResults.winRate}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {testResults.winningTrades} / {testResults.totalTrades} trades
                  </div>
                </div>
                <CheckCircle className="text-blue-400" size={24} />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">Profit Factor</div>
                  <div className="text-2xl font-bold text-white">
                    {testResults.profitFactor.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Sharpe: {testResults.sharpeRatio.toFixed(2)}
                  </div>
                </div>
                <DollarSign className="text-yellow-400" size={24} />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-400">
                    {testResults.maxDrawdown.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    Recovery time: 14d
                  </div>
                </div>
                <AlertCircle className="text-red-400" size={24} />
              </div>
            </motion.div>
          </div>
          
          {/* Equity Curve */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-700/50 rounded-lg p-4"
          >
            <h3 className="text-lg font-medium mb-4">Equity Curve</h3>
            <div className="h-64 w-full">
              <div className="relative h-full">
                {/* Simplified equity curve visualization */}
                <div className="absolute inset-0 flex items-end">
                  {testResults.equityCurve.map((value: number, index: number) => {
                    const height = ((value - Math.min(...testResults.equityCurve)) / 
                                   (Math.max(...testResults.equityCurve) - Math.min(...testResults.equityCurve))) * 100;
                    
                    return (
                      <div 
                        key={index}
                        className="flex-1 mx-px"
                        style={{ height: `${height}%` }}
                      >
                        <div 
                          className={`w-full h-full ${
                            value >= testResults.initialBalance ? 'bg-blue-500/50' : 'bg-red-500/50'
                          }`}
                        ></div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Initial balance line */}
                <div 
                  className="absolute w-full border-t border-dashed border-gray-500"
                  style={{ 
                    bottom: `${((testResults.initialBalance - Math.min(...testResults.equityCurve)) / 
                             (Math.max(...testResults.equityCurve) - Math.min(...testResults.equityCurve))) * 100}%` 
                  }}
                >
                  <div className="absolute right-0 -top-4 text-xs text-gray-400">
                    Initial: {formatCurrency(testResults.initialBalance)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Recent Trades */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-700/50 rounded-lg overflow-hidden"
          >
            <div className="p-4 border-b border-gray-600">
              <h3 className="text-lg font-medium">Recent Trades</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Entry Price</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Exit Price</th>
                    <th className="text-right p-4 text-gray-400 font-medium">P&L</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.trades.map((trade: any) => (
                    <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="font-medium">{trade.symbol}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono">{formatCurrency(trade.entryPrice)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono">{formatCurrency(trade.exitPrice)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={`font-mono ${
                          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(trade.pnl)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatPercent(trade.pnlPercent)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end text-gray-400 text-sm">
                          <Clock size={14} className="mr-1" />
                          {new Date(trade.exitTime).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
          <div className="text-lg mb-2">No Test Results</div>
          <div className="text-sm">Run a test to see how your strategy performs</div>
        </div>
      )}
    </div>
  );
}