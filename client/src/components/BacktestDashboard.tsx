import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Backtester,
  BacktestConfig,
  BacktestResult,
  BacktestProgress,
} from "../trading/Backtester";
import { StrategyRunner } from "../trading/StrategyRunner";
import { CandleData } from "../types/trading";
import {
  Upload,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
} from "lucide-react";
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

interface BacktestDashboardProps {
  onResultsGenerated?: (results: BacktestResult) => void;
}

export function BacktestDashboard({
  onResultsGenerated,
}: BacktestDashboardProps) {
  const [backtester, setBacktester] = useState<Backtester | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [csvData, setCsvData] = useState<string>("");
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
    symbol: "BTC/USDT",
    timeframe: "15m",
    epochs: 100,
  });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const getStrategyByName = (name: string) => {
    switch (name) {
      case "trend_following":
        return StrategyRunner.createTrendFollowingStrategy();
      case "default":
      default:
        return StrategyRunner.createDefaultStrategy();
    }
  };

  const getTimeframeInMs = (timeframe: string): number => {
    const timeframeMap: { [key: string]: number } = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };
    return timeframeMap[timeframe] || 15 * 60 * 1000; // Default to 15 minutes
  };

  const generateSampleData = (): CandleData[] => {
    const data: CandleData[] = [];
    const startTime =
      config.startDate?.getTime() || Date.now() - 1000 * 60 * 60 * 24 * 30; // 30 days ago
    const endTime = config.endDate?.getTime() || Date.now();
    const timeframeMs = getTimeframeInMs(config.timeframe || "15m");

    let currentPrice = 50000; // Starting BTC price
    let currentTime = startTime;

    while (currentTime <= endTime) {
      // More realistic price movement with volatility clustering
      const hourOfDay = new Date(currentTime).getHours();
      const volatilityMultiplier = hourOfDay >= 9 && hourOfDay <= 16 ? 1.5 : 1; // Higher volatility during trading hours

      const change =
        (Math.random() - 0.5) * currentPrice * 0.015 * volatilityMultiplier;
      const open = currentPrice;
      const close = Math.max(100, currentPrice + change); // Prevent negative prices

      // Create realistic OHLC
      const direction = close > open ? 1 : -1;
      const highExtra =
        Math.random() * currentPrice * 0.008 * Math.abs(direction);
      const lowExtra =
        Math.random() * currentPrice * 0.008 * Math.abs(direction);

      const high = Math.max(open, close) + highExtra;
      const low = Math.min(open, close) - lowExtra;
      const volume = 50 + Math.random() * 200; // More realistic volume

      data.push({
        timestamp: currentTime,
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
      currentTime += timeframeMs;
    }

    setSampleData(data);
    setSampleDataGenerated(true);
    console.log(
      `Generated ${data.length} sample candles from ${new Date(startTime)} to ${new Date(endTime)}`,
    );
    return data;
  };

  const runBacktestWithInstance = async (backtesterInstance: Backtester) => {
    console.log("Running backtest with instance:", backtesterInstance);
    if (!backtesterInstance) {
      console.error("Backtester instance is null or undefined");
      setError("Backtester not initialized - please wait for initialization to complete");
      return;
    }

    try {
      setIsLoading(true);
      setIsRunning(true);
      setResults(null);
      setError(null);

      // Load data into backtester
      let dataToUse: CandleData[];
      if (csvData) {
        // Parse CSV data (implement parseCsvData if needed)
        dataToUse = [];
      } else if (sampleDataGenerated && sampleData.length > 0) {
        // Use generated sample data
        dataToUse = sampleData;
      } else {
        // Generate sample data if none exists
        dataToUse = generateSampleData();
      }

      if (dataToUse.length === 0) {
        throw new Error("No data available for backtesting");
      }

      // Load data into backtester
      backtesterInstance.loadData(dataToUse);

      // Run backtest
      const result = await backtesterInstance.startBacktest();

      setResults(result);

      if (onResultsGenerated) {
        onResultsGenerated(result);
      }
    } catch (error) {
      console.error("Backtest failed:", error);
      setError(
        `Backtest failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  };

  // Initialize backtester when config changes
  useEffect(() => {
    const initializeBacktester = async () => {
      try {
        if (config.startDate && config.endDate && config.initialBalance) {
          const strategy = getStrategyByName(selectedStrategy);

          const backtestConfig: BacktestConfig = {
            startDate: config.startDate,
            endDate: config.endDate,
            initialBalance: config.initialBalance,
            strategy: strategy,
            riskConfig: {
              maxRiskPerTrade: 0.02,
              maxDrawdown: 0.05,
              maxPositions: 5,
              maxLeverage: 3,
              emergencyStopLoss: 0.1,
              dailyLossLimit: 0.1,
              correlationLimit: 0.8,
            },
            executorConfig: {
              paperTrading: true,
              exchange: "binance",
              testnet: true,
              defaultOrderType: "market",
              slippageTolerance: 0.1,
              maxOrderSize: 1000,
              enableStopLoss: true,
              enableTakeProfit: true,
              enablePartialFills: true,
              orderTimeout: 30000,
              retryAttempts: 3,
              retryDelay: 1000,
            },
            replaySpeed: config.replaySpeed || 100,
            commission: config.commission || 0.001,
            slippage: config.slippage || 0.001,
            symbol: config.symbol || "BTC/USDT",
            timeframe: config.timeframe || "15m",
            epochs: config.epochs || 100,
          };

          console.log("Initializing Backtester with config:", backtestConfig);
          const newBacktester = new Backtester(backtestConfig);
          
          // Set the backtester in state
          setBacktester(newBacktester);
          setError(null);

          // Subscribe to progress updates
          newBacktester.getProgressUpdates().subscribe(setProgress);

          // Automatically run backtest when strategy or config changes
          setTimeout(async () => {
            await runBacktestWithInstance(newBacktester);
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to initialize Backtester:", error);
        setError(`Failed to initialize backtester: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    initializeBacktester();

    return () => {
      if (backtester) {
        backtester.dispose();
      }
    };
  }, [config, selectedStrategy]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!results?.trades) return [];

    let equity = 10000;
    return results.trades.map((trade: any, index: number) => {
      equity += trade.pnl || 0;
      return {
        trade: index + 1,
        equity: equity,
        pnl: trade.pnl || 0,
        date: new Date(trade.exitTime).toLocaleDateString(),
      };
    });
  }, [results]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        setCsvData(csv);
        setSampleDataGenerated(false);
        setSampleData([]);
      };
      reader.readAsText(file);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const csvContent = [
      "Trade,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,PnL,Type",
      ...results.trades.map((trade: any) =>
        [
          trade.id,
          new Date(trade.entryTime).toISOString(),
          new Date(trade.exitTime).toISOString(),
          trade.entryPrice,
          trade.exitPrice,
          trade.quantity,
          trade.pnl,
          trade.type,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_results_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Backtest Dashboard</h2>
        
        {/* Status Display */}
        <div className="flex items-center space-x-4">
          {isRunning && (
            <div className="flex items-center text-blue-400">
              <Activity size={16} className="mr-2 animate-pulse" />
              <span>Running backtest automatically...</span>
            </div>
          )}
          {results && !isRunning && (
            <div className="flex items-center text-green-400">
              <CheckCircle size={16} className="mr-2" />
              <span>Backtest completed</span>
            </div>
          )}
          {!csvData && !sampleDataGenerated && !isRunning && (
            <span className="text-yellow-400 text-sm">
              Generating sample data and running backtest...
            </span>
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

      {/* Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Strategy Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Strategy</label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="default">Multi-Indicator Confluence</option>
                <option value="trend_following">Trend Following</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Initial Balance</label>
                <input
                  type="number"
                  value={config.initialBalance}
                  onChange={(e) => setConfig({...config, initialBalance: parseFloat(e.target.value)})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Commission (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={config.commission}
                  onChange={(e) => setConfig({...config, commission: parseFloat(e.target.value)})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Data Source</h3>
          <div className="space-y-4">
            <label
              htmlFor="csv-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
            >
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                <span className="text-sm text-gray-400">
                  Upload CSV data or use generated sample data
                </span>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  try {
                    generateSampleData();
                  } catch (error) {
                    setError(
                      `Failed to generate sample data: ${error instanceof Error ? error.message : String(error)}`,
                    );
                  }
                }}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <BarChart3 size={16} className="mr-2" />
                Generate Sample Data
              </button>
              
              {results && (
                <button
                  onClick={downloadResults}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Download Results
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {progress && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-400 mt-4">
              <div>Current Equity: ${progress.currentEquity.toFixed(2)}</div>
              <div>Drawdown: {(progress.currentDrawdown * 100).toFixed(2)}%</div>
              <div>Trades: {progress.tradesExecuted}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Return</p>
                  <p className={`text-xl font-bold ${results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(results.totalReturn * 100).toFixed(2)}%
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
                    {(results.maxDrawdown * 100).toFixed(2)}%
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
                    {(results.winRate * 100).toFixed(1)}%
                  </p>
                </div>
                <Target className="text-blue-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Sharpe Ratio</p>
                  <p className="text-xl font-bold text-purple-400">
                    {results.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="text-purple-400" size={24} />
              </div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
            <div ref={chartContainerRef} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="trade" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
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
        </div>
      )}
    </div>
  );
}