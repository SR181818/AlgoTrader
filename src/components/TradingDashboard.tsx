import React, { useState, useEffect } from 'react';
import { StrategyRunner, StrategySignal } from '../trading/StrategyRunner';
import { OrderExecutor, Position } from '../trading/OrderExecutor';
import { RiskManager } from '../trading/RiskManager';
import { Backtester, BacktestConfig, BacktestResult } from '../trading/Backtester';
import { NotificationService } from '../services/NotificationService';
import { binanceWebSocketService } from '../services/BinanceWebSocketService';
import { CandleData } from '../types/trading';
import { PnLGauge } from './dashboard/PnLGauge';
import { OpenPositionsTable } from './dashboard/OpenPositionsTable';
import { SignalEventLog } from './dashboard/SignalEventLog';
import { SettingsPanel } from './dashboard/SettingsPanel';
import { Play, Pause, Square, BarChart3, Settings, TestTube } from 'lucide-react';

interface TradingDashboardProps {
  symbol: string;
  timeframe: string;
}

export function TradingDashboard({ symbol, timeframe }: TradingDashboardProps) {
  // Trading system instances
  const [strategyRunner] = useState(() => new StrategyRunner(StrategyRunner.createDefaultStrategy()));
  const [orderExecutor] = useState(() => new OrderExecutor({
    paperTrading: true,
    exchange: 'binance',
    testnet: true,
    defaultOrderType: 'market',
    slippageTolerance: 0.1,
    maxOrderSize: 1000,
    enableStopLoss: true,
    enableTakeProfit: true,
  }));
  const [riskManager] = useState(() => new RiskManager({
    maxRiskPerTrade: 0.02,
    maxDailyDrawdown: 0.05,
    maxOpenPositions: 5,
    maxCorrelatedPositions: 2,
    minRiskRewardRatio: 2,
    maxLeverage: 3,
    emergencyStopLoss: 0.10,
    cooldownPeriod: 60,
  }, 10000));
  const [notificationService] = useState(() => new NotificationService(
    { enabled: false, address: '' },
    { enabled: false, botToken: '', chatId: '' },
    { enabled: false, url: '' }
  ));

  // State
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  const [strategySignals, setStrategySignals] = useState<StrategySignal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accountBalance, setAccountBalance] = useState(10000);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showBacktest, setShowBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // WebSocket connection
  useEffect(() => {
    if (isLiveTrading) {
      const subscription = binanceWebSocketService.subscribeToCandleStream(symbol, timeframe)
        .subscribe({
          next: (candle: CandleData) => {
            strategyRunner.updateCandle(candle);
          },
          error: (error) => {
            console.error('WebSocket error:', error);
            notificationService.sendNotification({
              type: 'alert',
              title: 'Connection Error',
              message: 'Lost connection to market data feed',
              priority: 'high',
              timestamp: Date.now(),
            });
          }
        });

      return () => subscription.unsubscribe();
    }
  }, [isLiveTrading, symbol, timeframe]);

  // Strategy signals subscription
  useEffect(() => {
    const subscription = strategyRunner.getStrategySignals().subscribe(signal => {
      setStrategySignals(prev => [signal, ...prev.slice(0, 99)]);
      
      // Execute trade if live trading is enabled
      if (isLiveTrading && signal.type !== 'HOLD') {
        handleStrategySignal(signal);
      }
    });

    return () => subscription.unsubscribe();
  }, [isLiveTrading]);

  // Order executor subscriptions
  useEffect(() => {
    const orderSub = orderExecutor.getOrderUpdates().subscribe(order => {
      console.log('Order update:', order);
    });

    const positionSub = orderExecutor.getPositionUpdates().subscribe(position => {
      setPositions(prev => {
        const updated = prev.filter(p => p.symbol !== position.symbol);
        return [...updated, position];
      });
    });

    const balanceSub = orderExecutor.getBalanceUpdates().subscribe(balance => {
      const usdtBalance = balance.USDT || 0;
      setAccountBalance(usdtBalance);
      setTotalPnL(usdtBalance - 10000);
    });

    return () => {
      orderSub.unsubscribe();
      positionSub.unsubscribe();
      balanceSub.unsubscribe();
    };
  }, []);

  const handleStrategySignal = async (signal: StrategySignal) => {
    try {
      // Risk assessment
      const riskAssessment = riskManager.assessTradeRisk(
        signal.metadata.symbol || symbol,
        signal.type === 'LONG' ? 'buy' : 'sell',
        1, // Temporary size for assessment
        signal.price,
        signal.metadata.stopLoss || signal.price * 0.98,
        signal.metadata.takeProfit
      );

      if (!riskAssessment.approved) {
        console.log('Trade rejected by risk manager:', riskAssessment.restrictions);
        return;
      }

      // Execute order
      const orderIntent = {
        id: `signal_${Date.now()}`,
        signal,
        symbol: signal.metadata.symbol || symbol,
        side: signal.type === 'LONG' ? 'buy' : 'sell' as 'buy' | 'sell',
        amount: riskAssessment.positionSize.recommendedSize,
        price: signal.price,
        stopLoss: signal.metadata.stopLoss,
        takeProfit: signal.metadata.takeProfit,
        timestamp: Date.now(),
      };

      await orderExecutor.executeOrder(orderIntent);

      // Send notification
      notificationService.sendNotification({
        type: 'trade',
        title: 'Trade Executed',
        message: `${signal.type} signal executed for ${symbol}`,
        data: { signal, orderIntent },
        priority: 'medium',
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Failed to execute trade:', error);
    }
  };

  const startLiveTrading = () => {
    setIsLiveTrading(true);
    notificationService.sendNotification({
      type: 'alert',
      title: 'Live Trading Started',
      message: 'Automated trading is now active',
      priority: 'high',
      timestamp: Date.now(),
    });
  };

  const stopLiveTrading = () => {
    setIsLiveTrading(false);
    notificationService.sendNotification({
      type: 'alert',
      title: 'Live Trading Stopped',
      message: 'Automated trading has been disabled',
      priority: 'medium',
      timestamp: Date.now(),
    });
  };

  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const config: BacktestConfig = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
        initialBalance: 10000,
        strategy: StrategyRunner.createDefaultStrategy(),
        riskConfig: riskManager.getRiskConfig(),
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
        replaySpeed: 100,
        commission: 0.001,
        slippage: 0.001,
      };

      const backtester = new Backtester(config);
      
      // Generate sample data for demo
      const sampleData: CandleData[] = [];
      const basePrice = 45000;
      for (let i = 0; i < 1000; i++) {
        const timestamp = config.startDate.getTime() + (i * 15 * 60 * 1000);
        const price = basePrice + (Math.random() - 0.5) * 1000;
        sampleData.push({
          timestamp,
          open: price,
          high: price * 1.01,
          low: price * 0.99,
          close: price,
          volume: 100 + Math.random() * 1000,
        });
      }

      backtester.loadData(sampleData);
      const result = await backtester.startBacktest();
      setBacktestResult(result);
      setShowBacktest(true);

    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  const currentPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Trading Control Panel</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              <Settings size={16} className="mr-2" />
              Settings
            </button>
            <button
              onClick={runBacktest}
              disabled={isBacktesting}
              className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <TestTube size={16} className="mr-2" />
              {isBacktesting ? 'Running...' : 'Backtest'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {!isLiveTrading ? (
            <button
              onClick={startLiveTrading}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              Start Live Trading
            </button>
          ) : (
            <button
              onClick={stopLiveTrading}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
            >
              <Square size={16} className="mr-2" />
              Stop Trading
            </button>
          )}

          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
            isLiveTrading ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
          }`}>
            {isLiveTrading ? 'LIVE' : 'STOPPED'}
          </div>

          <div className="text-sm text-gray-400">
            Symbol: <span className="text-white font-mono">{symbol}</span>
          </div>
          <div className="text-sm text-gray-400">
            Timeframe: <span className="text-white font-mono">{timeframe}</span>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* P&L and Positions */}
        <div className="xl:col-span-2 space-y-6">
          <PnLGauge 
            currentPnL={currentPnL}
            dailyPnL={dailyPnL}
            totalPnL={totalPnL}
            accountBalance={accountBalance}
          />
          
          <OpenPositionsTable 
            positions={positions}
            onClosePosition={(symbol) => {
              console.log('Close position for:', symbol);
            }}
          />
        </div>

        {/* Signal Log */}
        <div>
          <SignalEventLog signals={strategySignals} />
        </div>
      </div>

      {/* Backtest Results Modal */}
      {showBacktest && backtestResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Backtest Results</h2>
              <button
                onClick={() => setShowBacktest(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Total Return</div>
                <div className={`text-lg font-bold ${backtestResult.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {backtestResult.totalReturn >= 0 ? '+' : ''}${backtestResult.totalReturn.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {backtestResult.totalReturnPercent.toFixed(2)}%
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                <div className="text-lg font-bold text-white">
                  {backtestResult.sharpeRatio.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Max Drawdown</div>
                <div className="text-lg font-bold text-red-400">
                  -{backtestResult.maxDrawdownPercent.toFixed(2)}%
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Win Rate</div>
                <div className="text-lg font-bold text-white">
                  {backtestResult.winRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white font-medium mb-2">Trade Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Trades:</span>
                    <span className="text-white">{backtestResult.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winning Trades:</span>
                    <span className="text-green-400">{backtestResult.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losing Trades:</span>
                    <span className="text-red-400">{backtestResult.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit Factor:</span>
                    <span className="text-white">{backtestResult.profitFactor.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">Risk Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Calmar Ratio:</span>
                    <span className="text-white">{backtestResult.calmarRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sortino Ratio:</span>
                    <span className="text-white">{backtestResult.sortinoRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time in Market:</span>
                    <span className="text-white">{backtestResult.timeInMarket.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(settings) => {
          notificationService.updateConfig(
            settings.email,
            settings.telegram,
            settings.webhook
          );
        }}
      />
    </div>
  );
}