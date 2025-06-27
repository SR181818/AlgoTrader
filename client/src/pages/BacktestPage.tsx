import React, { useState, useEffect } from 'react';
import { Play, Pause, BarChart3, TrendingUp, Calendar, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { BacktestDashboard } from '../components/BacktestDashboard';
import { EquityCurveChart } from '../components/EquityCurveChart';
import { BinanceMarketData } from '../services/BinanceMarketData';
import { Backtester, BacktestConfig, BacktestResult } from '../trading/Backtester';
import { CandleData } from '../types/market';

export default function BacktestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [marketData] = useState(new BinanceMarketData());
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistoricalData();
  }, [selectedSymbol, timeframe]);

  const loadHistoricalData = async () => {
    try {
      setError(null);
      const historicalCandles = await marketData.getHistoricalData(selectedSymbol, timeframe, 500);
      setCandles(historicalCandles);
    } catch (err: any) {
      setError('Failed to load historical data: ' + err.message);
    }
  };

  const runBacktest = async (config: BacktestConfig) => {
    if (candles.length === 0) {
      setError('No historical data available');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const backtester = new Backtester();
      const backtestResults = await backtester.runBacktest(candles, config);
      setResults(backtestResults);
    } catch (err: any) {
      setError('Backtest failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Backtesting Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedSymbol} 
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Strategy Configuration */}
        <div className="xl:col-span-2">
          <BacktestDashboard 
            onResultsGenerated={runBacktest}
          />
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Data Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white font-medium">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timeframe:</span>
                <span className="text-white font-medium">{timeframe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Candles:</span>
                <span className="text-white font-medium">{candles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${candles.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {candles.length > 0 ? 'Ready' : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          {results && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Return:</span>
                  <span className={`font-medium ${results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(results.totalReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Drawdown:</span>
                  <span className="text-red-400 font-medium">
                    {formatPercentage(results.maxDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sharpe Ratio:</span>
                  <span className="text-white font-medium">
                    {results.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="text-blue-400 font-medium">
                    {formatPercentage(results.winRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Trades:</span>
                  <span className="text-white font-medium">{results.totalTrades}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="mt-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Equity Curve</h3>
            <EquityCurveChart results={results} />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Final Equity</span>
              </div>
              <span className="text-xl font-bold text-white">
                {formatCurrency(results.finalEquity)}
              </span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Profit Factor</span>
              </div>
              <span className="text-xl font-bold text-white">
                {results.profitFactor.toFixed(2)}
              </span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Avg Trade</span>
              </div>
              <span className="text-xl font-bold text-white">
                {formatCurrency(results.averageTradeReturn)}
              </span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                <span className="text-gray-400 text-sm">Duration</span>
              </div>
              <span className="text-xl font-bold text-white">
                {Math.round(results.duration / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}