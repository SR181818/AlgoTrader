import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { runBacktest, getDefaultStrategyParams, BacktestResult, StrategyParams } from '../services/backtest';
import { CandleData } from '../types/trading';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, BarChart3 } from 'lucide-react';

interface BacktestPanelProps {
  candles: CandleData[];
  symbol: string;
  timeframe: string;
}

export function BacktestPanel({ candles, symbol, timeframe }: BacktestPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(getDefaultStrategyParams());
  const [strategyType, setStrategyType] = useState<'ma_crossover' | 'rsi'>('ma_crossover');

  const runTest = async () => {
    if (candles.length < 50) {
      setError('Not enough candle data for backtesting. Need at least 50 candles.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update strategy type in params
      const params = { ...strategyParams, strategy_type: strategyType };
      const backtestResult = await runBacktest(candles, params, symbol, timeframe);
      setResult(backtestResult);
    } catch (err) {
      setError(`Backtest failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
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
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Python-Powered Backtesting</h2>

      {/* Strategy Configuration */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Strategy Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Strategy Type</label>
            <select
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value as 'ma_crossover' | 'rsi')}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="ma_crossover">Moving Average Crossover</option>
              <option value="rsi">RSI Strategy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Initial Capital</label>
            <input
              type="number"
              value={strategyParams.initial_capital}
              onChange={(e) => setStrategyParams({...strategyParams, initial_capital: parseFloat(e.target.value)})}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        {strategyType === 'ma_crossover' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Fast MA Window</label>
              <input
                type="number"
                value={strategyParams.fast_window}
                onChange={(e) => setStrategyParams({...strategyParams, fast_window: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slow MA Window</label>
              <input
                type="number"
                value={strategyParams.slow_window}
                onChange={(e) => setStrategyParams({...strategyParams, slow_window: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
          </div>
        )}

        {strategyType === 'rsi' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">RSI Window</label>
              <input
                type="number"
                value={strategyParams.rsi_window}
                onChange={(e) => setStrategyParams({...strategyParams, rsi_window: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Oversold Level</label>
              <input
                type="number"
                value={strategyParams.rsi_oversold}
                onChange={(e) => setStrategyParams({...strategyParams, rsi_oversold: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Overbought Level</label>
              <input
                type="number"
                value={strategyParams.rsi_overbought}
                onChange={(e) => setStrategyParams({...strategyParams, rsi_overbought: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Stop Loss (%)</label>
            <input
              type="number"
              step="0.01"
              value={strategyParams.stop_loss_pct}
              onChange={(e) => setStrategyParams({...strategyParams, stop_loss_pct: parseFloat(e.target.value)})}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Take Profit (%)</label>
            <input
              type="number"
              step="0.01"
              value={strategyParams.take_profit_pct}
              onChange={(e) => setStrategyParams({...strategyParams, take_profit_pct: parseFloat(e.target.value)})}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Commission (%)</label>
            <input
              type="number"
              step="0.001"
              value={strategyParams.commission_pct}
              onChange={(e) => setStrategyParams({...strategyParams, commission_pct: parseFloat(e.target.value)})}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={runTest}
            disabled={isLoading || candles.length < 50}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Running Backtest...
              </>
            ) : (
              <>
                <Activity size={16} className="mr-2" />
                Run Backtest
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-start">
          <AlertTriangle className="mr-2 mt-0.5 flex-shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Backtest Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-gray-400 text-sm">Total Return</div>
                    <div className={`text-2xl font-bold ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(result.total_return)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatPercent(result.total_return_pct)}
                    </div>
                  </div>
                  {result.total_return >= 0 ? 
                    <TrendingUp className="text-green-400" size={24} /> :
                    <TrendingDown className="text-red-400" size={24} />
                  }
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-white">
                      {result.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>
                  <BarChart3 className="text-blue-400" size={24} />
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-gray-400 text-sm">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-400">
                      -{result.max_drawdown_pct.toFixed(2)}%
                    </div>
                  </div>
                  <AlertTriangle className="text-red-400" size={24} />
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-gray-400 text-sm">Win Rate</div>
                    <div className="text-2xl font-bold text-white">
                      {result.win_rate.toFixed(1)}%
                    </div>
                  </div>
                  <CheckCircle className="text-green-400" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Equity Curve</h3>
            <div className="h-80 bg-gray-700/30 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                    itemStyle={{ color: '#60A5FA' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#60A5FA" 
                    strokeWidth={2}
                    dot={false}
                    name="Equity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-medium mb-3">Trade Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Trades:</span>
                  <span className="text-white">{result.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Winning Trades:</span>
                  <span className="text-green-400">{result.winning_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Losing Trades:</span>
                  <span className="text-red-400">{result.losing_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Profit Factor:</span>
                  <span className="text-white">{result.profit_factor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Win:</span>
                  <span className="text-green-400">{formatCurrency(result.avg_win)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Loss:</span>
                  <span className="text-red-400">{formatCurrency(Math.abs(result.avg_loss))}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-white font-medium mb-3">Performance Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Execution Time:</span>
                  <span className="text-white">{result.execution_time.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Largest Win:</span>
                  <span className="text-green-400">{formatCurrency(result.largest_win)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Largest Loss:</span>
                  <span className="text-red-400">{formatCurrency(Math.abs(result.largest_loss))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Symbol:</span>
                  <span className="text-white">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeframe:</span>
                  <span className="text-white">{timeframe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data Points:</span>
                  <span className="text-white">{candles.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Recent Trades</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400 font-medium">Side</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Entry Price</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Exit Price</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Quantity</th>
                    <th className="text-right p-3 text-gray-400 font-medium">P&L</th>
                    <th className="text-right p-3 text-gray-400 font-medium">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.slice(-10).reverse().map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-white font-mono">{formatCurrency(trade.entryPrice)}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-white font-mono">
                          {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-white font-mono">{trade.quantity.toFixed(4)}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className={`font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(trade.pnl)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className={`font-mono ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercent(trade.pnlPercent)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}