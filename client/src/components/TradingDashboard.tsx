import React, { useState, useEffect } from 'react';
import { StrategyRunner, StrategySignal } from '../trading/StrategyRunner';
import { OrderExecutor, Position, Order } from '../trading/OrderExecutor';
import { RiskManager } from '../trading/RiskManager';
import { CandleData, TradingSignal, Trade, MarketData } from '../types/trading';
import { realDataService } from '../utils/realDataService';
import { manualTradingService } from '../services/ManualTradingService';
import { PnLGauge } from './dashboard/PnLGauge';
import { OpenPositionsTable } from './dashboard/OpenPositionsTable';
import { SignalEventLog } from './dashboard/SignalEventLog';
import { SettingsPanel } from './dashboard/SettingsPanel';
import { TradingBot } from './TradingBot';
import { TradingBotConfig } from '../services/TradingBotService';
import { Play, Pause, Square, BarChart3, Settings, TestTube, AlertTriangle, Zap } from 'lucide-react';
import { useMetrics } from '../monitoring/MetricsProvider';

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

  // State
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  const [strategySignals, setStrategySignals] = useState<StrategySignal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountBalance, setAccountBalance] = useState(10000);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [manualTradingPnL, setManualTradingPnL] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTradingBot, setShowTradingBot] = useState(false);
  const [manualOrderAmount, setManualOrderAmount] = useState(0.001);
  const [manualOrderSide, setManualOrderSide] = useState<'buy' | 'sell'>('buy');
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  
  // Trading bot configuration
  const tradingBotConfig: TradingBotConfig = {
    exchange: 'binance',
    testnet: true,
    tradingEnabled: false,
    symbols: [symbol],
    maxPositions: 3,
    maxLeverage: 1,
    riskPerTrade: 0.02,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.04
  };
  
  // Get metrics hook
  const { 
    recordSignal, 
    recordTrade, 
    recordCandleData, 
    setSystemHealth 
  } = useMetrics();

  // Subscribe to live data for selected symbol and timeframe
  useEffect(() => {
    const handleDataUpdate = (update: any) => {
      if (update.type === 'market_data') {
        setMarketData(update.data);
        setSystemHealth(true); // Update system health status
      } else if (update.type === 'candle_data') {
        setCandleData(update.data);
        
        // Record candle data for metrics
        if (update.data.length > 0) {
          const latestCandle = update.data[update.data.length - 1];
          const latencyMs = Date.now() - latestCandle.timestamp;
          recordCandleData(symbol, timeframe, 'realtime', latestCandle, latencyMs);
          
          // Update strategy with new candle when live trading is enabled
          if (isLiveTrading) {
            strategyRunner.updateCandle(latestCandle);
          }
        }
      }
    };

    realDataService.subscribe(symbol, timeframe, handleDataUpdate);
    
    return () => {
      realDataService.unsubscribe(symbol, timeframe, handleDataUpdate);
    };
  }, [symbol, timeframe, isLiveTrading, recordCandleData, setSystemHealth, strategyRunner]);

  // Strategy signals subscription
  useEffect(() => {
    const subscription = strategyRunner.getStrategySignals().subscribe(signal => {
      setStrategySignals(prev => [signal, ...prev.slice(0, 99)]);
      
      // Record signal metrics
      const startTime = performance.now();
      const latencyMs = performance.now() - startTime;
      recordSignal({
        signal: signal.type === 'LONG' ? 'buy' : signal.type === 'SHORT' ? 'sell' : 'hold',
        ticker: symbol,
        timeframe,
        entry_price: signal.price,
        stop_loss: signal.metadata.stopLoss || signal.price * 0.98,
        take_profit: signal.metadata.takeProfit || signal.price * 1.02,
        confidence: signal.confidence,
        timestamp: signal.timestamp,
        indicators: {} as any,
        reasoning: signal.reasoning
      }, latencyMs);
      
      // Execute trade if live trading is enabled
      if (isLiveTrading && signal.type !== 'HOLD') {
        handleStrategySignal(signal);
      }
    });

    return () => subscription.unsubscribe();
  }, [isLiveTrading, recordSignal, symbol, timeframe]);

  // Order executor subscriptions
  useEffect(() => {
    const orderSub = orderExecutor.getOrderUpdates().subscribe(order => {
      setOrders(prev => {
        const updated = prev.filter(o => o.id !== order.id);
        return [...updated, order].sort((a, b) => b.timestamp - a.timestamp);
      });
    });

    const positionSub = orderExecutor.getPositionUpdates().subscribe(position => {
      setPositions(prev => {
        const updated = prev.filter(p => p.symbol !== position.symbol);
        return [...updated, position];
      });
    });

    const balanceSub = orderExecutor.getBalanceUpdates().subscribe(balance => {
      const usdtBalance = balance.USDT?.total || 0;
      setAccountBalance(usdtBalance);
      setTotalPnL(usdtBalance - 10000);
    });

    // Load manual trading data from localStorage and ManualTradingService
    const loadManualOrders = () => {
      try {
        // Load from localStorage (legacy format)
        const storedOrders = JSON.parse(localStorage.getItem('manualTradingOrders') || '[]');
        
        // Load from ManualTradingService (new format)
        const manualTrades = manualTradingService.getCurrentTrades();
        
        // Convert manual trades to order format
        const manualOrders = manualTrades.map((trade: any) => ({
          id: trade.id,
          timestamp: trade.timestamp,
          executedAmount: trade.quantity,
          executedPrice: trade.fillPrice || trade.price,
          status: trade.status,
          fees: 0,
          intent: {
            symbol: trade.symbol,
            side: trade.side,
            amount: trade.quantity,
            price: trade.price,
            signal: {
              type: trade.side === 'buy' ? 'LONG' : 'SHORT',
              strength: 'STRONG',
              confidence: 1,
              price: trade.price,
              timestamp: trade.timestamp,
              reasoning: ['Manual trade'],
              indicators: [],
              metadata: { symbol: trade.symbol, timeframe: 'manual' }
            }
          }
        }));
        
        // Merge legacy orders with new manual orders
        const legacyOrders = storedOrders.map((order: any) => ({
          ...order,
          timestamp: order.timestamp,
          executedAmount: order.quantity,
          executedPrice: order.fillPrice || order.price,
          status: order.status,
          fees: 0,
          intent: {
            symbol: order.symbol,
            side: order.side,
            amount: order.quantity,
            price: order.price,
            signal: {
              type: order.side === 'buy' ? 'LONG' : 'SHORT',
              strength: 'STRONG',
              confidence: 1,
              price: order.price,
              timestamp: order.timestamp,
              reasoning: ['Manual trade (legacy)'],
              indicators: [],
              metadata: { symbol: order.symbol, timeframe: 'manual' }
            }
          }
        }));
        
        const allManualOrders = [...manualOrders, ...legacyOrders];
        
        setOrders(prev => {
          // Merge manual orders with existing strategy orders, avoiding duplicates
          const existingIds = new Set(prev.map(o => o.id));
          const newManualOrders = allManualOrders.filter((o: any) => !existingIds.has(o.id));
          return [...prev, ...newManualOrders].sort((a, b) => b.timestamp - a.timestamp);
        });
      } catch (error) {
        console.warn('Failed to load manual trading orders:', error);
      }
    };

    loadManualOrders();

    // Subscribe to manual trading PnL
    const manualPnLSub = manualTradingService.getPnL().subscribe(setManualTradingPnL);

    // Listen for storage changes to update orders in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'manualTradingOrders') {
        loadManualOrders();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      orderSub.unsubscribe();
      positionSub.unsubscribe();
      balanceSub.unsubscribe();
      manualPnLSub.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleStrategySignal = async (signal: StrategySignal) => {
    try {
      if (!marketData) {
        setError("Cannot execute trade: No market data available");
        return;
      }
      
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
        setError(`Trade rejected by risk manager: ${riskAssessment.restrictions.join(', ')}`);
        return;
      }

      // Execute order
      const orderIntent = {
        id: `signal_${Date.now()}`,
        signal,
        symbol: signal.metadata.symbol || symbol,
        side: signal.type === 'LONG' ? 'buy' : 'sell' as 'buy' | 'sell',
        amount: riskAssessment.positionSize.recommendedSize || 0.01, // Use recommended size or fallback
        price: signal.price,
        stopLoss: signal.metadata.stopLoss,
        takeProfit: signal.metadata.takeProfit,
        timestamp: Date.now()
      };

      const order = await orderExecutor.executeOrder(orderIntent);
      
      // Record trade metrics
      recordTrade({
        id: order.id,
        symbol: order.intent.symbol,
        timeframe,
        signal: {
          signal: signal.type === 'LONG' ? 'buy' : signal.type === 'SHORT' ? 'sell' : 'hold',
          ticker: symbol,
          timeframe,
          entry_price: signal.price,
          stop_loss: signal.metadata.stopLoss || signal.price * 0.98,
          take_profit: signal.metadata.takeProfit || signal.price * 1.02,
          confidence: signal.confidence,
          timestamp: signal.timestamp,
          indicators: {} as any,
          reasoning: signal.reasoning
        },
        status: 'open',
        entry_time: Date.now(),
        size: order.executedAmount * order.executedPrice
      });
      
      setError(null);
    } catch (error) {
      console.error('Failed to execute trade:', error);
      setError(`Failed to execute trade: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startLiveTrading = () => {
    setIsLiveTrading(true);
  };

  const stopLiveTrading = () => {
    setIsLiveTrading(false);
  };

  const handleClosePosition = async (symbol: string) => {
    try {
      const position = positions.find(p => p.symbol === symbol);
      if (!position) {
        setError(`Position not found for ${symbol}`);
        return;
      }
      
      // Create a signal for closing the position
      const closeSignal: StrategySignal = {
        type: position.side === 'long' ? 'SHORT' : 'LONG', // Opposite direction to close
        strength: 'STRONG',
        confidence: 1,
        price: position.currentPrice,
        timestamp: Date.now(),
        reasoning: ['Manual position close'],
        indicators: [],
        metadata: {
          symbol: position.symbol,
          timeframe,
          entryConditions: ['Manual close'],
          exitConditions: ['Manual close']
        }
      };
      
      // Execute order to close position
      const orderIntent = {
        id: `close_${Date.now()}`,
        signal: closeSignal,
        symbol: position.symbol,
        side: position.side === 'long' ? 'sell' : 'buy' as 'buy' | 'sell',
        amount: position.amount,
        price: position.currentPrice,
        timestamp: Date.now()
      };
      
      await orderExecutor.executeOrder(orderIntent);
      setError(null);
    } catch (error) {
      console.error('Failed to close position:', error);
      setError(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleManualOrder = async () => {
    try {
      if (!marketData) {
        setError("Cannot execute trade: No market data available");
        return;
      }

      setIsExecutingOrder(true);
      
      // Create a signal for manual order
      const manualSignal: StrategySignal = {
        type: manualOrderSide === 'buy' ? 'LONG' : 'SHORT',
        strength: 'STRONG',
        confidence: 1,
        price: marketData.price,
        timestamp: Date.now(),
        reasoning: ['Manual order execution'],
        indicators: [],
        metadata: {
          symbol,
          timeframe,
          entryConditions: ['Manual entry'],
          exitConditions: []
        }
      };
      
      // Execute order
      const orderIntent = {
        id: `manual_${Date.now()}`,
        signal: manualSignal,
        symbol,
        side: manualOrderSide,
        amount: manualOrderAmount,
        price: marketData.price,
        timestamp: Date.now()
      };
      
      const order = await orderExecutor.executeOrder(orderIntent);
      console.log('Manual order executed:', order);
      
      // Record trade metrics
      recordTrade({
        id: order.id,
        symbol: order.intent.symbol,
        timeframe,
        signal: {
          signal: manualOrderSide,
          ticker: symbol,
          timeframe,
          entry_price: marketData.price,
          stop_loss: marketData.price * (manualOrderSide === 'buy' ? 0.98 : 1.02),
          take_profit: marketData.price * (manualOrderSide === 'buy' ? 1.02 : 0.98),
          confidence: 1,
          timestamp: Date.now(),
          indicators: {} as any,
          reasoning: ['Manual order']
        },
        status: 'open',
        entry_time: Date.now(),
        size: order.executedAmount * order.executedPrice
      });
      
      setError(null);
    } catch (error) {
      console.error('Failed to execute manual order:', error);
      setError(`Failed to execute manual order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecutingOrder(false);
    }
  };

  // Calculate total PnL including positions and manual trading
  const positionsPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const currentPnL = positionsPnL + manualTradingPnL;
  
  // Update daily PnL to include manual trading changes
  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    // Calculate daily change in manual trading PnL
    const manualTrades = manualTradingService.getCurrentTrades();
    const todayManualPnL = manualTrades
      .filter(trade => trade.timestamp >= startOfDay.getTime() && trade.status === 'filled')
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    setDailyPnL(todayManualPnL + positionsPnL);
  }, [manualTradingPnL, positionsPnL]);

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
          
          <button
            onClick={() => setShowTradingBot(!showTradingBot)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors ml-auto"
          >
            <Zap size={16} className="mr-2" />
            {showTradingBot ? 'Hide Trading Bot' : 'Show Trading Bot'}
          </button>
        </div>
        
        {/* Manual Order Form */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Manual Order Execution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Amount ({symbol.split('/')[0]})</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={manualOrderAmount}
                onChange={(e) => setManualOrderAmount(parseFloat(e.target.value))}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Side</label>
              <select
                value={manualOrderSide}
                onChange={(e) => setManualOrderSide(e.target.value as 'buy' | 'sell')}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Market Price</label>
              <div className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600">
                {marketData ? `$${marketData.price.toLocaleString()}` : 'Loading...'}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleManualOrder}
                disabled={isExecutingOrder || !marketData}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
              >
                {isExecutingOrder ? 'Executing...' : 'Execute Order'}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start">
            <AlertTriangle className="text-red-400 mt-0.5 mr-3 flex-shrink-0" size={18} />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Trading Bot */}
      {showTradingBot && (
        <TradingBot 
          initialConfig={tradingBotConfig}
          onSignalProcessed={(signal, order) => {
            console.log('Signal processed:', signal, 'Order:', order);
          }}
        />
      )}

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
            onClosePosition={handleClosePosition}
          />
          
          {/* Orders Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
              <div className="text-sm text-gray-400 mt-1">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-lg mb-2">No Orders</div>
                  <div className="text-sm">Your orders will appear here</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                      <th className="text-center p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-4">
                          <div className="text-white font-medium">{order.intent.symbol}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.intent.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                          }`}>
                            {order.intent.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-white font-mono">{order.executedAmount.toFixed(4)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-white font-mono">${order.executedPrice.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === 'filled' ? 'bg-green-600/20 text-green-400' :
                            order.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                            'bg-yellow-600/20 text-yellow-400'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-gray-400 text-sm">
                            {new Date(order.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Signal Log */}
        <div>
          <SignalEventLog signals={strategySignals} />
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(settings) => {
          console.log('Settings saved:', settings);
          setShowSettings(false);
        }}
        initialSettings={{
          email: {
            enabled: false,
            address: '',
            signals: true,
            trades: true,
            alerts: true,
          },
          telegram: {
            enabled: false,
            botToken: '',
            chatId: '',
            signals: true,
            trades: true,
            alerts: true,
          },
          webhook: {
            enabled: false,
            url: '',
            signals: true,
            trades: true,
            alerts: true,
          },
          sound: {
            enabled: true,
            volume: 50,
          },
        }}
      />
    </div>
  );
}