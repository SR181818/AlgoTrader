import React, { useState, useEffect, useRef } from 'react';
import { Backtester, BacktestConfig, BacktestResult, BacktestProgress } from '../trading/Backtester';
import { StrategyRunner } from '../trading/StrategyRunner';
import { CandleData } from '../types/trading';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Download, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';

interface BacktestDashboardProps {
  onResultsGenerated?: (results: BacktestResult) => void;
}

export function BacktestDashboard({ onResultsGenerated }: BacktestDashboardProps) {
  const [backtester, setBacktester] = useState<Backtester | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [sampleDataGenerated, setSampleDataGenerated] = useState(false);
  const [sampleData, setSampleData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("default");
  const [config, setConfig] = useState<Partial<BacktestConfig>>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    initialBalance: 10000,
    replaySpeed: 100,
    commission: 0.001,
    slippage: 0.001,
    symbol: 'BTC/USDT',
    timeframe: '15m',
    epochs: 100
  });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Initialize backtester when config changes
  useEffect(() => {
    if (config.startDate && config.endDate && config.initialBalance) {
      const strategy = getStrategyByName(selectedStrategy);
      
      const backtestConfig: BacktestConfig = {
        startDate: config.startDate,
        endDate: config.endDate,
        initialBalance: config.initialBalance,
        strategy: strategy,
        riskConfig: {
          maxRiskPerTrade: 0.02,
          maxDailyDrawdown: 0.05,
          maxOpenPositions: 5,
          maxCorrelatedPositions: 2,
          minRiskRewardRatio: 2,
          maxLeverage: 3,
          emergencyStopLoss: 0.10,
          cooldownPeriod: 60,
        },
        executorConfig: {
          paperTrading: true,
          exchange: 'binance',
          testnet: true,
          defaultOrderType: 'market',
          slippageTolerance: 0.1,
          maxOrderSize: 1000,
          enableStopLoss: true,
          enableTakeProfit: true,
        },
        replaySpeed: config.replaySpeed || 100,
        commission: config.commission || 0.001,
        slippage: config.slippage || 0.001,
        symbol: config.symbol || 'BTC/USDT',
        timeframe: config.timeframe || '15m',
        epochs: config.epochs || 100
      };

      const newBacktester = new Backtester(backtestConfig);
      setBacktester(newBacktester);

      // Subscribe to progress updates
      newBacktester.getProgressUpdates().subscribe(setProgress);

      return () => {
        newBacktester.dispose();
      };
    }
  }, [config, selectedStrategy]);

  // Initialize chart when results are available
  useEffect(() => {
    if (results && chartContainerRef.current) {
      // Clear previous chart
      chartContainerRef.current.innerHTML = '';
      
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: '#1f2937' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        rightPriceScale: {
          borderColor: '#4b5563',
        },
        timeScale: {
          borderColor: '#4b5563',
        },
      });
      
      // Add equity curve series
      const equitySeries = chart.addLineSeries({
        color: '#60A5FA',
        lineWidth: 2,
        title: 'Equity',
      });
      
      // Add drawdown series
      const drawdownSeries = chart.addLineSeries({
        color: '#EF4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'Drawdown',
        priceScaleId: 'drawdown',
      });
      
      // Configure drawdown scale
      chart.priceScale('drawdown').applyOptions({
        position: 'right',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      // Prepare data with unique timestamps
      const equityData = results.equity.map((point, index) => ({
        time: Math.floor(point.timestamp / 1000) + index, // Add index to ensure unique timestamps
        value: point.value,
      }));
      
      // Calculate drawdown series
      let peak = config.initialBalance || 10000;
      const drawdownData = results.equity.map((point, index) => {
        if (point.value > peak) peak = point.value;
        const drawdownPercent = ((peak - point.value) / peak) * 100;
        return {
          time: Math.floor(point.timestamp / 1000) + index, // Add index to ensure unique timestamps
          value: drawdownPercent,
        };
      });
      
      // Set data
      equitySeries.setData(equityData);
      drawdownSeries.setData(drawdownData);
      
      // Fit content
      chart.timeScale().fitContent();
      
      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      });
      
      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current);
      }
      
      return () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    }
  }, [results, config.initialBalance]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        setCsvData(csv);
        setSampleDataGenerated(false); // Reset sample data flag when CSV is loaded
        setSampleData([]);
      };
      reader.readAsText(file);
    }
  };

  const generateSampleData = (): CandleData[] => {
    // Generate sample OHLCV data for demonstration
    const sampleData: CandleData[] = [];
    let basePrice = 45000;
    const startTime = config.startDate?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    try {
      for (let i = 0; i < (config.epochs || 100) * 10; i++) {
        const timestamp = startTime + (i * 15 * 60 * 1000); // 15-minute intervals
        const volatility = 0.002;
        const priceChange = (Math.random() - 0.5) * volatility;
        
        const open = basePrice;
        basePrice = basePrice * (1 + priceChange);
        const close = basePrice;
        const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
        const volume = 100 + Math.random() * 1000;

        // Validate the candle data
        if (isNaN(timestamp) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
          console.warn(`Invalid candle data at index ${i}:`, { timestamp, open, high, low, close, volume });
          continue;
        }

        sampleData.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume
        });
      }

      console.log('Sample data generated:', sampleData.length, 'candles');
      setSampleDataGenerated(true);
      setSampleData(sampleData);
      setCsvData(''); // Clear CSV data when sample data is generated
      
      return sampleData;
    } catch (error) {
      console.error('Error generating sample data:', error);
      throw new Error(`Failed to generate sample data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startBacktest = async () => {
    if (!backtester) {
      setError('Backtester not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setIsRunning(true);
      setResults(null);
      setError(null);
      
      // Load data into backtester
      if (csvData) {
        backtester.loadData(csvData);
      } else if (sampleDataGenerated && sampleData.length > 0) {
        backtester.loadData(sampleData);
      } else {
        // Generate sample data if none exists
        const data = generateSampleData();
        backtester.loadData(data);
      }
      
      // Run backtest
      const result = await backtester.startBacktest();
      
      setResults(result);
      
      if (onResultsGenerated) {
        onResultsGenerated(result);
      }
    } catch (error) {
      console.error('Backtest failed:', error);
      setError(`Backtest failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  };

  const pauseBacktest = () => {
    if (backtester) {
      if (isPaused) {
        backtester.resume();
        setIsPaused(false);
      } else {
        backtester.pause();
        setIsPaused(true);
      }
    }
  };

  const stopBacktest = () => {
    if (backtester) {
      backtester.stop();
      setIsRunning(false);
      setIsPaused(false);
      setProgress(null);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const csvContent = [
      'Trade ID,Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,PnL,PnL %,Commission,Duration (ms)',
      ...results.trades.map(trade => [
        trade.id,
        trade.symbol,
        trade.side,
        new Date(trade.entryTime).toISOString(),
        trade.exitTime ? new Date(trade.exitTime).toISOString() : '',
        trade.entryPrice,
        trade.exitPrice || '',
        trade.quantity,
        trade.pnl || '',
        trade.pnlPercent || '',
        trade.commission,
        trade.duration || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Get strategy by name
  const getStrategyByName = (name: string) => {
    switch (name) {
      case "trend_following":
        return StrategyRunner.createTrendFollowingStrategy();
      case "default":
      default:
        return StrategyRunner.createDefaultStrategy();
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Backtest Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Symbol</label>
            <select
              value={config.symbol || 'BTC/USDT'}
              onChange={(e) => setConfig(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="SOL/USDT">SOL/USDT</option>
              <option value="ADA/USDT">ADA/USDT</option>
              <option value="DOT/USDT">DOT/USDT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Timeframe</label>
            <select
              value={config.timeframe || '15m'}
              onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value="default">Multi-Indicator Confluence</option>
              <option value="trend_following">Trend Following</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={config.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Initial Balance</label>
            <input
              type="number"
              value={config.initialBalance || 10000}
              onChange={(e) => setConfig(prev => ({ ...prev, initialBalance: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Replay Speed</label>
            <select
              value={config.replaySpeed || 100}
              onChange={(e) => setConfig(prev => ({ ...prev, replaySpeed: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            >
              <option value={1}>1x (Real-time)</option>
              <option value={10}>10x</option>
              <option value={50}>50x</option>
              <option value={100}>100x</option>
              <option value={1000}>1000x (Max)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Commission (%)</label>
            <input
              type="number"
              step="0.001"
              value={config.commission || 0.001}
              onChange={(e) => setConfig(prev => ({ ...prev, commission: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Slippage (%)</label>
            <input
              type="number"
              step="0.001"
              value={config.slippage || 0.001}
              onChange={(e) => setConfig(prev => ({ ...prev, slippage: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        {/* Data Upload */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Historical Data (CSV or Generate Sample)</label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer transition-colors"
            >
              <Upload size={16} className="mr-2" />
              Upload CSV
            </label>
            <button
              onClick={() => {
                try {
                  const data = generateSampleData();
                  setSampleData(data);
                } catch (error) {
                  setError(`Failed to generate sample data: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              <BarChart3 size={16} className="mr-2" />
              Generate Sample Data
            </button>
            {csvData && (
              <span className="text-green-400 text-sm">✓ CSV data loaded</span>
            )}
            {sampleDataGenerated && !csvData && (
              <span className="text-purple-400 text-sm">✓ Sample data generated ({sampleData.length} candles)</span>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          {!isRunning ? (
            <button
              onClick={startBacktest}
              disabled={!backtester || isLoading || (!csvData && !sampleDataGenerated)}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              {isLoading ? 'Loading...' : 'Start Backtest'}
            </button>
          ) : (
            <>
              <button
                onClick={pauseBacktest}
                className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors"
              >
                {isPaused ? <Play size={16} className="mr-2" /> : <Pause size={16} className="mr-2" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={stopBacktest}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                <Square size={16} className="mr-2" />
                Stop
              </button>
            </>
          )}
          {!csvData && !sampleDataGenerated && (
            <span className="text-yellow-400 text-sm">Please upload CSV data or generate sample data first</span>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            <AlertTriangle size={16} className="inline-block mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Backtest Progress</h3>
            <div className="text-sm text-gray-400">
              {progress.processedCandles} / {progress.totalCandles} candles
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress.progress.toFixed(1)}%</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Current Date</div>
              <div className="text-white font-mono text-sm">
                {progress.currentDate.toLocaleDateString()}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Current Equity</div>
              <div className="text-white font-mono">
                {formatCurrency(progress.currentEquity)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Drawdown</div>
              <div className={`font-mono ${progress.currentDrawdown < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {formatPercent(progress.currentDrawdown * 100)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Trades</div>
              <div className="text-white font-mono">
                {progress.tradesExecuted}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Backtest Results</h3>
              <button
                onClick={downloadResults}
                className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <Download size={16} className="mr-2" />
                Download CSV
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-sm">Total Return</div>
                    <div className={`text-2xl font-bold ${results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(results.totalReturn)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatPercent(results.totalReturnPercent)}
                    </div>
                  </div>
                  {results.totalReturn >= 0 ? 
                    <TrendingUp className="text-green-400" size={24} /> :
                    <TrendingDown className="text-red-400" size={24} />
                  }
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-white">
                      {results.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <BarChart3 className="text-blue-400" size={24} />
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-sm">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-400">
                      -{results.maxDrawdownPercent.toFixed(2)}%
                    </div>
                  </div>
                  <AlertTriangle className="text-red-400" size={24} />
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-sm">Win Rate</div>
                    <div className="text-2xl font-bold text-white">
                      {results.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <Target className="text-green-400" size={24} />
                </div>
              </div>
            </div>

            {/* Equity Curve Chart */}
            <div className="h-96" ref={chartContainerRef}></div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="text-white font-medium mb-3">Trade Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Trades:</span>
                    <span className="text-white">{results.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winning Trades:</span>
                    <span className="text-green-400">{results.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losing Trades:</span>
                    <span className="text-red-400">{results.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit Factor:</span>
                    <span className="text-white">{results.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average Win:</span>
                    <span className="text-green-400">{formatCurrency(results.averageWin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average Loss:</span>
                    <span className="text-red-400">{formatCurrency(-results.averageLoss)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Risk Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Calmar Ratio:</span>
                    <span className="text-white">{results.calmarRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sortino Ratio:</span>
                    <span className="text-white">{results.sortinoRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Largest Win:</span>
                    <span className="text-green-400">{formatCurrency(results.largestWin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Largest Loss:</span>
                    <span className="text-red-400">{formatCurrency(results.largestLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Consecutive Wins:</span>
                    <span className="text-white">{results.consecutiveWins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Consecutive Losses:</span>
                    <span className="text-white">{results.consecutiveLosses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time in Market:</span>
                    <span className="text-white">{results.timeInMarket.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Entry</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Exit</th>
                    <th className="text-right p-4 text-gray-400 font-medium">P&L</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {results.trades.slice(-10).reverse().map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="text-white font-medium">{trade.symbol}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white font-mono">{formatCurrency(trade.entryPrice)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white font-mono">
                          {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={`font-mono ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                        </div>
                        {trade.pnlPercent && (
                          <div className="text-xs text-gray-400">
                            {formatPercent(trade.pnlPercent)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-gray-400 text-sm">
                          {trade.duration ? `${Math.round(trade.duration / (1000 * 60))}m` : '-'}
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