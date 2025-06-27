import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Activity,
  CheckCircle,
  Settings,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  finalEquity: number;
  initialBalance: number;
  equity: Array<{ timestamp: number; value: number }>;
  trades: Array<{
    id: string;
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    type: 'long' | 'short';
  }>;
}

interface StrategyConfig {
  name: string;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  emaShort: number;
  emaLong: number;
  stopLoss: number;
  takeProfit: number;
}

export default function BacktestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [initialBalance, setInitialBalance] = useState(10000);
  const [strategy, setStrategy] = useState<StrategyConfig>({
    name: 'RSI + MACD Strategy',
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    emaShort: 12,
    emaLong: 26,
    stopLoss: 0.02,
    takeProfit: 0.03,
  });

  // Generate sample market data
  const generateSampleData = (symbol: string, timeframe: string): CandleData[] => {
    const data: CandleData[] = [];
    const now = Date.now();
    const timeframeMs = getTimeframeMs(timeframe);
    const count = 1000; // Generate 1000 candles
    
    let basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 1.5;
    let currentTime = now - (count * timeframeMs);
    
    for (let i = 0; i < count; i++) {
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility * basePrice;
      const open = basePrice;
      const close = Math.max(basePrice * 0.1, basePrice + change);
      
      // Create realistic OHLC
      const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
      const low = Math.min(open, close) - Math.random() * basePrice * 0.01;
      const volume = 100 + Math.random() * 500;
      
      data.push({
        timestamp: currentTime,
        open,
        high,
        low,
        close,
        volume,
      });
      
      basePrice = close;
      currentTime += timeframeMs;
    }
    
    console.log(`Generated ${data.length} candles for ${symbol} (${timeframe})`);
    return data;
  };

  const getTimeframeMs = (timeframe: string): number => {
    const map: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return map[timeframe] || 60 * 60 * 1000;
  };

  // Technical indicators
  const calculateRSI = (prices: number[], period: number = 14): number[] => {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  };

  const calculateEMA = (prices: number[], period: number): number[] => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  };

  // Backtesting engine
  const runBacktest = async (): Promise<void> => {
    if (candles.length === 0) {
      setError('No market data available');
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress(0);
    setResults(null);

    try {
      console.log(`Starting backtest with ${candles.length} candles`);
      
      const closePrices = candles.map(c => c.close);
      const rsi = calculateRSI(closePrices, strategy.rsiPeriod);
      const emaShort = calculateEMA(closePrices, strategy.emaShort);
      const emaLong = calculateEMA(closePrices, strategy.emaLong);
      
      let balance = initialBalance;
      let position: { size: number; entryPrice: number; entryTime: number; type: 'long' | 'short' } | null = null;
      const trades: BacktestResult['trades'] = [];
      const equity: Array<{ timestamp: number; value: number }> = [];
      
      let maxEquity = balance;
      let maxDrawdown = 0;
      let winningTrades = 0;
      let totalPnL = 0;
      
      // Simulate backtest with progress updates
      for (let i = Math.max(strategy.rsiPeriod, strategy.emaLong); i < candles.length; i++) {
        const candle = candles[i];
        const currentRSI = rsi[i - strategy.rsiPeriod] || 50;
        const currentEMAShort = emaShort[i] || candle.close;
        const currentEMALong = emaLong[i] || candle.close;
        
        // Update progress
        const progressPercent = (i / candles.length) * 100;
        setProgress(progressPercent);
        
        // Entry conditions
        if (!position) {
          // Long entry: RSI oversold + EMA short > EMA long
          if (currentRSI < strategy.rsiOversold && currentEMAShort > currentEMALong) {
            const positionSize = balance * 0.95; // Use 95% of balance
            position = {
              size: positionSize / candle.close,
              entryPrice: candle.close,
              entryTime: candle.timestamp,
              type: 'long'
            };
            console.log(`Long entry at ${candle.close} (RSI: ${currentRSI.toFixed(2)})`);
          }
          // Short entry: RSI overbought + EMA short < EMA long
          else if (currentRSI > strategy.rsiOverbought && currentEMAShort < currentEMALong) {
            const positionSize = balance * 0.95;
            position = {
              size: positionSize / candle.close,
              entryPrice: candle.close,
              entryTime: candle.timestamp,
              type: 'short'
            };
            console.log(`Short entry at ${candle.close} (RSI: ${currentRSI.toFixed(2)})`);
          }
        }
        
        // Exit conditions
        if (position) {
          let exitTriggered = false;
          let exitReason = '';
          
          if (position.type === 'long') {
            const pnlPercent = (candle.close - position.entryPrice) / position.entryPrice;
            
            // Stop loss or take profit
            if (pnlPercent <= -strategy.stopLoss) {
              exitTriggered = true;
              exitReason = 'Stop Loss';
            } else if (pnlPercent >= strategy.takeProfit) {
              exitTriggered = true;
              exitReason = 'Take Profit';
            } else if (currentRSI > strategy.rsiOverbought) {
              exitTriggered = true;
              exitReason = 'RSI Signal';
            }
          } else {
            const pnlPercent = (position.entryPrice - candle.close) / position.entryPrice;
            
            // Stop loss or take profit for short
            if (pnlPercent <= -strategy.stopLoss) {
              exitTriggered = true;
              exitReason = 'Stop Loss';
            } else if (pnlPercent >= strategy.takeProfit) {
              exitTriggered = true;
              exitReason = 'Take Profit';
            } else if (currentRSI < strategy.rsiOversold) {
              exitTriggered = true;
              exitReason = 'RSI Signal';
            }
          }
          
          if (exitTriggered) {
            const pnl = position.type === 'long' 
              ? (candle.close - position.entryPrice) * position.size
              : (position.entryPrice - candle.close) * position.size;
            
            balance += pnl;
            totalPnL += pnl;
            
            if (pnl > 0) winningTrades++;
            
            trades.push({
              id: `trade_${trades.length + 1}`,
              entryTime: position.entryTime,
              exitTime: candle.timestamp,
              entryPrice: position.entryPrice,
              exitPrice: candle.close,
              quantity: position.size,
              pnl,
              type: position.type
            });
            
            console.log(`${position.type} exit at ${candle.close} - PnL: $${pnl.toFixed(2)} (${exitReason})`);
            position = null;
          }
        }
        
        // Track equity and drawdown
        const currentEquity = position 
          ? balance + (position.type === 'long' 
              ? (candle.close - position.entryPrice) * position.size
              : (position.entryPrice - candle.close) * position.size)
          : balance;
        
        equity.push({ timestamp: candle.timestamp, value: currentEquity });
        
        if (currentEquity > maxEquity) {
          maxEquity = currentEquity;
        }
        
        const drawdown = (maxEquity - currentEquity) / maxEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        
        // Add small delay to show progress
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Calculate final metrics
      const totalReturn = (balance - initialBalance) / initialBalance;
      const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
      
      const winningTradePnL = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
      const losingTradePnL = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = losingTradePnL > 0 ? winningTradePnL / losingTradePnL : winningTradePnL;
      
      const dailyReturns = equity.map((e, i) => 
        i === 0 ? 0 : (e.value - equity[i-1].value) / equity[i-1].value
      ).filter(r => r !== 0);
      
      const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
      const stdReturn = Math.sqrt(
        dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
      );
      const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0;
      
      const result: BacktestResult = {
        totalReturn,
        totalReturnPercent: totalReturn * 100,
        sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
        maxDrawdown,
        maxDrawdownPercent: maxDrawdown * 100,
        winRate,
        profitFactor,
        totalTrades: trades.length,
        winningTrades,
        losingTrades: trades.length - winningTrades,
        averageWin: winningTrades > 0 ? winningTradePnL / winningTrades : 0,
        averageLoss: (trades.length - winningTrades) > 0 ? losingTradePnL / (trades.length - winningTrades) : 0,
        largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0,
        largestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0,
        finalEquity: balance,
        initialBalance,
        equity,
        trades
      };
      
      console.log('Backtest completed:', result);
      setResults(result);
      setProgress(100);
      
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(`Backtest failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Load data when symbol or timeframe changes
  useEffect(() => {
    setError(null);
    setResults(null);
    try {
      const data = generateSampleData(selectedSymbol, timeframe);
      setCandles(data);
    } catch (err: any) {
      setError(`Failed to generate data: ${err.message}`);
    }
  }, [selectedSymbol, timeframe]);

  // Auto-run backtest when data is ready
  useEffect(() => {
    if (candles.length > 0 && !isRunning) {
      // Auto-run backtest after data loads
      setTimeout(() => {
        runBacktest();
      }, 1000);
    }
  }, [candles]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const chartData = useMemo(() => {
    if (!results?.equity) return [];
    return results.equity.map((e, index) => ({
      time: index,
      equity: e.value,
      date: new Date(e.timestamp).toLocaleDateString()
    }));
  }, [results]);

  const downloadResults = () => {
    if (!results) return;
    
    const csvContent = [
      "Trade,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,PnL,Type",
      ...results.trades.map(trade =>
        [
          trade.id,
          new Date(trade.entryTime).toISOString(),
          new Date(trade.exitTime).toISOString(),
          trade.entryPrice.toFixed(2),
          trade.exitPrice.toFixed(2),
          trade.quantity.toFixed(6),
          trade.pnl.toFixed(2),
          trade.type
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_results_${selectedSymbol}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Backtesting Dashboard</h1>
        <div className="flex items-center space-x-4">
          {isRunning && (
            <div className="flex items-center text-blue-400">
              <Activity size={16} className="mr-2 animate-pulse" />
              <span>Running backtest...</span>
            </div>
          )}
          {results && !isRunning && (
            <div className="flex items-center text-green-400">
              <CheckCircle size={16} className="mr-2" />
              <span>Backtest completed</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Market Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Symbol</label>
              <select 
                value={selectedSymbol} 
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="ADA/USDT">ADA/USDT</option>
                <option value="SOL/USDT">SOL/USDT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timeframe</label>
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Initial Balance ($)</label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Strategy Parameters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">RSI Period</label>
              <input
                type="number"
                value={strategy.rsiPeriod}
                onChange={(e) => setStrategy({...strategy, rsiPeriod: parseInt(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">RSI Oversold</label>
              <input
                type="number"
                value={strategy.rsiOversold}
                onChange={(e) => setStrategy({...strategy, rsiOversold: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">RSI Overbought</label>
              <input
                type="number"
                value={strategy.rsiOverbought}
                onChange={(e) => setStrategy({...strategy, rsiOverbought: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stop Loss (%)</label>
              <input
                type="number"
                step="0.01"
                value={strategy.stopLoss * 100}
                onChange={(e) => setStrategy({...strategy, stopLoss: parseFloat(e.target.value) / 100})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                disabled={isRunning}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing candles...</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Return</p>
                  <p className={`text-xl font-bold ${results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(results.totalReturnPercent)}
                  </p>
                </div>
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Max Drawdown</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatPercentage(results.maxDrawdownPercent)}
                  </p>
                </div>
                <TrendingDown className="text-red-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Win Rate</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatPercentage(results.winRate * 100)}
                  </p>
                </div>
                <Target className="text-blue-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Trades</p>
                  <p className="text-xl font-bold text-white">
                    {results.totalTrades}
                  </p>
                </div>
                <BarChart3 className="text-purple-400" size={24} />
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Equity Curve</h3>
              <button
                onClick={downloadResults}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
              >
                <Download size={16} className="mr-2" />
                Download Results
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Equity']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <span className="text-gray-400 text-sm">Sharpe Ratio</span>
              </div>
              <span className="text-xl font-bold text-white">
                {results.sharpeRatio.toFixed(2)}
              </span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                <span className="text-gray-400 text-sm">Avg Win</span>
              </div>
              <span className="text-xl font-bold text-white">
                {formatCurrency(results.averageWin)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Controls */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Manual Controls</h3>
        <div className="flex space-x-4">
          <button
            onClick={runBacktest}
            disabled={isRunning || candles.length === 0}
            className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <Play size={20} className="mr-2" />
            {isRunning ? 'Running...' : 'Run Backtest'}
          </button>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Data: {candles.length} candles</span>
            <span>Symbol: {selectedSymbol}</span>
            <span>Timeframe: {timeframe}</span>
          </div>
        </div>
      </div>
    </div>
  );
}