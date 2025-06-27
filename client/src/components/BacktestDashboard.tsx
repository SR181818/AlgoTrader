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
          emergencyStopLoss: 0.1,
          cooldownPeriod: 60,
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
        },
        replaySpeed: config.replaySpeed || 100,
        commission: config.commission || 0.001,
        slippage: config.slippage || 0.001,
        symbol: config.symbol || "BTC/USDT",
        timeframe: config.timeframe || "15m",
        epochs: config.epochs || 100,
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

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!results?.trades) return [];

    let equity = 10000;
    return results.trades.map((trade, index) => {
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
        setSampleDataGenerated(false); // Reset sample data flag when CSV is loaded
        setSampleData([]);
      };
      reader.readAsText(file);
    }
  };

  const generateSampleData = () => {
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
    return timeframeMap[timeframe] || 15 * 60 * 1000;
  };

  const startBacktest = async () => {
    if (!backtester) {
      setError("Backtester not initialized");
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
      console.error("Backtest failed:", error);
      setError(
        `Backtest failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      "Trade ID,Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,PnL,PnL %,Commission,Duration (ms)",
      ...results.trades.map((trade) =>
        [
          trade.id,
          trade.symbol,
          trade.side,
          new Date(trade.entryTime).toISOString(),
          trade.exitTime ? new Date(trade.exitTime).toISOString() : "",
          trade.entryPrice,
          trade.exitPrice || "",
          trade.quantity,
          trade.pnl || "",
          trade.pnlPercent || "",
          trade.commission,
          trade.duration || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_results_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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

  const runBacktest = async () => {
    if (!backtester) {
      setError("Backtester not initialized");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setResults(null);
    setError(null);

    try {
      let dataToUse: CandleData[] = [];

      if (csvData) {
        // Use uploaded CSV data
        dataToUse = parseCsvData(csvData);
      } else if (sampleDataGenerated && sampleData.length > 0) {
        // Use generated sample data
        dataToUse = sampleData;
      } else {
        // Generate sample data if none exists
        generateSampleData();
        // Wait for sample data to be set
        await new Promise((resolve) => setTimeout(resolve, 100));
        dataToUse = sampleData;
      }

      if (dataToUse.length === 0) {
        throw new Error("No data available for backtesting");
      }

      console.log(`Loading ${dataToUse.length} candles for backtesting`);

      // Load data into backtester
      backtester.loadData(dataToUse);

      // Initialize indicators for the strategy
      const strategyRunner = (backtester as any).strategyRunner;
      if (strategyRunner && strategyRunner.initializeIndicators) {
        strategyRunner.initializeIndicators(dataToUse);
      }

      console.log("Starting backtest...");

      // Run backtest
      const results = await backtester.startBacktest();
      setResults(results);

      if (onResultsGenerated) {
        onResultsGenerated(results);
      }

      console.log("Backtest completed successfully:", {
        totalTrades: results.totalTrades,
        totalReturn: results.totalReturn,
        winRate: results.winRate,
      });
    } catch (error: any) {
      console.error("Backtest failed:", error);
      setError(error.message || "Backtest failed");
    } finally {
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  // Dummy function to simulate CSV parsing
  const parseCsvData = (csvData: string): CandleData[] => {
    // Implement actual CSV parsing logic here
    // This is a placeholder
    console.log("Parsing CSV data (placeholder)");
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">
          Backtest Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Symbol</label>
            <select
              value={config.symbol || "BTC/USDT"}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, symbol: e.target.value }))
              }
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
            <label className="block text-sm text-gray-300 mb-1">
              Timeframe
            </label>
            <select
              value={config.timeframe || "15m"}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, timeframe: e.target.value }))
              }
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
            <label className="block text-sm text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={config.startDate?.toISOString().split("T")[0] || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  startDate: new Date(e.target.value),
                }))
              }
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate?.toISOString().split("T")[0] || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  endDate: new Date(e.target.value),
                }))
              }
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Initial Balance
            </label>
            <input
              type="number"
              value={config.initialBalance || 10000}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  initialBalance: parseFloat(e.target.value),
                }))
              }
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Replay Speed
            </label>
            <select
              value={config.replaySpeed || 100}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  replaySpeed: parseInt(e.target.value),
                }))
              }
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
            <label className="block text-sm text-gray-300 mb-1">
              Commission (%)
            </label>
            <input
              type="number"
              step="0.001"
              value={config.commission || 0.001}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  commission: parseFloat(e.target.value),
                }))
              }
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Slippage (%)
            </label>
            <input
              type="number"
              step="0.001"
              value={config.slippage || 0.001}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  slippage: parseFloat(e.target.value),
                }))
              }
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
            />
          </div>
        </div>

        {/* Data Upload */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Historical Data (CSV or Generate Sample)
          </label>
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
                  setError(
                    `Failed to generate sample data: ${error instanceof Error ? error.message : String(error)}`,
                  );
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
              <span className="text-purple-400 text-sm">
                ✓ Sample data generated ({sampleData.length} candles)
              </span>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          {!isRunning ? (
            <button
              onClick={runBacktest}
              disabled={
                !backtester || isLoading || (!csvData && !sampleDataGenerated)
              }
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              {isLoading ? "Loading..." : "Start Backtest"}
            </button>
          ) : (
            <>
              <button
                onClick={pauseBacktest}
                className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors"
              >
                {isPaused ? (
                  <Play size={16} className="mr-2" />
                ) : (
                  <Pause size={16} className="mr-2" />
                )}
                {isPaused ? "Resume" : "Pause"}
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
            <span className="text-yellow-400 text-sm">
              Please upload CSV data or generate sample data first
            </span>
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
            <h3 className="text-lg font-semibold text-white">
              Backtest Progress
            </h3>
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
              <div
                className={`font-mono ${progress.currentDrawdown < 0 ? "text-red-400" : "text-gray-400"}`}
              >
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
          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Total Return</div>
                <div
                  className={`text-2xl font-bold ${results.totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {results.totalReturnPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">
                  ${results.totalReturn.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Win Rate</div>
                <div className="text-2xl font-bold text-blue-600">
                  {results.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {results.winningTrades}/{results.totalTrades} trades
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-600">
                  {results.maxDrawdownPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">Peak to trough</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Sharpe Ratio</div>
                <div className="text-2xl font-bold text-purple-600">
                  {results.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  Risk-adjusted return
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
              <CardDescription>
                Portfolio value over time with {results.trades.length} trades
                executed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="trade" stroke="#d1d5db" />
                      <YAxis stroke="#d1d5db" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "6px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Portfolio Value"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trade Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Trades</span>
                  <span className="font-semibold">{results.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span>Winning Trades</span>
                  <span className="text-green-600">
                    {results.winningTrades}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Losing Trades</span>
                  <span className="text-red-600">{results.losingTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Win</span>
                  <span className="text-green-600">
                    ${results.averageWin.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Average Loss</span>
                  <span className="text-red-600">
                    -${results.averageLoss.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Largest Win</span>
                  <span className="text-green-600">
                    ${results.largestWin.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Largest Loss</span>
                  <span className="text-red-600">
                    -${Math.abs(results.largestLoss).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Factor</span>
                  <span className="font-semibold">
                    {results.profitFactor.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Sharpe Ratio</span>
                  <span className="font-semibold">
                    {results.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sortino Ratio</span>
                  <span className="font-semibold">
                    {results.sortinoRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Calmar Ratio</span>
                  <span className="font-semibold">
                    {results.calmarRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Drawdown</span>
                  <span className="text-red-600">
                    {results.maxDrawdownPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Time in Market</span>
                  <span>{results.timeInMarket.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Consecutive Wins</span>
                  <span className="text-green-600">
                    {results.consecutiveWins}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Consecutive Losses</span>
                  <span className="text-red-600">
                    {results.consecutiveLosses}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Trades */}
          {results.trades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Last 10 trades executed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Entry</th>
                        <th className="text-left p-2">Exit</th>
                        <th className="text-left p-2">P&L</th>
                        <th className="text-left p-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.trades
                        .slice(-10)
                        .reverse()
                        .map((trade, index) => (
                          <tr key={trade.id} className="border-b">
                            <td className="p-2">{trade.symbol}</td>
                            <td className="p-2">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  trade.side === "buy"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {trade.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2">
                              ${trade.entryPrice.toFixed(2)}
                            </td>
                            <td className="p-2">
                              ${trade.exitPrice?.toFixed(2) || "-"}
                            </td>
                            <td
                              className={`p-2 ${(trade.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              ${(trade.pnl || 0).toFixed(2)}
                            </td>
                            <td
                              className={`p-2 ${(trade.pnlPercent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {(trade.pnlPercent || 0).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Dummy Card and CardContent components (replace with your actual components if available)
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full">
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col space-y-1.5 p-6">{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-2xl font-semibold leading-none tracking-tight">
      {children}
    </h3>
  );
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6 pt-0">{children}</div>;
}
