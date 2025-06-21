import React, { useState, useEffect } from 'react';
import { CandleData, TradingSignal, Trade, MarketData, TradingConfig } from '../types/trading';
import { calculateIndicators } from '../utils/technicalIndicators';
import { generateSignal } from '../utils/signalGenerator';
import { realDataService } from '../utils/realDataService';
import { TRADING_PAIRS, DEFAULT_CONFIG } from '../data/tradingPairs';
import { SymbolSelector } from '../components/SymbolSelector';
import { TimeframeSelector } from '../components/TimeframeSelector';
import { ConfigPanel } from '../components/ConfigPanel';
import { PriceCard } from '../components/PriceCard';
import { SignalCard } from '../components/SignalCard';
import { IndicatorPanel } from '../components/IndicatorPanel';
import { TradeHistory } from '../components/TradeHistory';
import { PriceChart } from '../components/PriceChart';
import { MarketOverview } from '../components/MarketOverview';
import { TradingDashboard } from '../components/TradingDashboard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { Activity, Zap, BarChart3, Globe, Database, Library, Settings, Bell, Bot } from 'lucide-react';
import { useMetrics } from '../monitoring/MetricsProvider';

export default function TradingDashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedTimeframes, setSelectedTimeframes] = useState(['15m']);
  const [config, setConfig] = useState<TradingConfig>(DEFAULT_CONFIG as TradingConfig);
  const [candleData, setCandleData] = useState<Map<string, Map<string, CandleData[]>>>(new Map());
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [currentSignals, setCurrentSignals] = useState<Map<string, TradingSignal>>(new Map());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [showTradingDashboard, setShowTradingDashboard] = useState(false);
  const [subscription, setSubscription] = useState<{tier: string, active: boolean} | null>(null);
  
  // Get metrics hook
  const { 
    recordSignal, 
    recordTrade, 
    recordCandleData, 
    setSystemHealth 
  } = useMetrics();

  // Load subscription data
  useEffect(() => {
    const userSubscription = localStorage.getItem('userSubscription');
    if (userSubscription) {
      setSubscription(JSON.parse(userSubscription));
    }
  }, []);

  // Subscribe to live data for selected symbol and timeframes
  useEffect(() => {
    const subscriptions: Array<() => void> = [];
    
    selectedTimeframes.forEach(timeframe => {
      const handleDataUpdate = (update: any) => {
        if (update.type === 'market_data') {
          setMarketData(prev => new Map(prev.set(selectedSymbol, update.data)));
          setSystemHealth(true); // Update system health status
        } else if (update.type === 'candle_data') {
          setCandleData(prev => {
            const newData = new Map(prev);
            if (!newData.has(selectedSymbol)) {
              newData.set(selectedSymbol, new Map());
            }
            newData.get(selectedSymbol)!.set(update.timeframe || timeframe, update.data);
            return newData;
          });
          
          // Record candle data for metrics
          if (update.data.length > 0) {
            const latestCandle = update.data[update.data.length - 1];
            const latencyMs = Date.now() - latestCandle.timestamp;
            recordCandleData(selectedSymbol, timeframe, 'realtime', latestCandle, latencyMs);
          }
          
          // Calculate new signal when candle data updates
          if (update.data.length >= 144) {
            const startTime = performance.now();
            const indicators = calculateIndicators(update.data, config);
            if (indicators) {
              const currentPrice = update.data[update.data.length - 1].close;
              const signal = generateSignal(currentPrice, indicators, selectedSymbol, timeframe, config);
              
              const signalKey = `${selectedSymbol}:${timeframe}`;
              setCurrentSignals(prev => new Map(prev.set(signalKey, signal)));
              
              // Record signal metrics
              const latencyMs = performance.now() - startTime;
              recordSignal(signal, latencyMs);
              
              // Simulate trade execution on strong signals when live mode is active
              if (isLive && signal.confidence > 0.8 && signal.signal !== 'hold') {
                executeSimulatedTrade(signal);
              }
            }
          }
        }
      };

      realDataService.subscribe(selectedSymbol, timeframe, handleDataUpdate);
      
      subscriptions.push(() => {
        realDataService.unsubscribe(selectedSymbol, timeframe, handleDataUpdate);
      });
    });

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [selectedSymbol, selectedTimeframes, isLive, config, recordSignal, recordCandleData, setSystemHealth]);

  const executeSimulatedTrade = (signal: TradingSignal) => {
    const newTrade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.ticker,
      timeframe: signal.timeframe,
      signal,
      status: 'open',
      entry_time: Date.now(),
      size: config.risk.trade_size
    };
    
    setTrades(prevTrades => [...prevTrades, newTrade]);
    
    // Record trade metrics
    recordTrade(newTrade);
    
    // Simulate trade closure
    const maxHoldTime = config.risk.max_hold_candles * 15 * 60 * 1000; // Convert to milliseconds
    const randomCloseTime = 30000 + Math.random() * Math.min(maxHoldTime, 300000); // Max 5 minutes for demo
    
    setTimeout(() => {
      setTrades(currentTrades => 
        currentTrades.map(trade => {
          if (trade.id === newTrade.id && trade.status === 'open') {
            const isWin = Math.random() > 0.35; // 65% win rate simulation
            const pnlPercent = isWin ? Math.random() * 0.02 + 0.005 : -(Math.random() * 0.015 + 0.005);
            const pnl = trade.size * pnlPercent;
            
            const closedTrade = {
              ...trade,
              status: 'closed' as const,
              exit_time: Date.now(),
              pnl,
              exit_reason: isWin ? 'take_profit' as const : 'stop_loss' as const
            };
            
            // Record closed trade metrics
            recordTrade(closedTrade);
            
            return closedTrade;
          }
          return trade;
        })
      );
    }, randomCloseTime);
  };

  const selectedPair = TRADING_PAIRS.find(pair => pair.symbol === selectedSymbol);
  const currentMarketData = marketData.get(selectedSymbol);
  const symbolCandles = candleData.get(selectedSymbol);
  const primaryTimeframe = selectedTimeframes[0] || '15m';
  const primaryCandles = symbolCandles?.get(primaryTimeframe) || [];
  const indicators = primaryCandles.length >= 144 ? calculateIndicators(primaryCandles, config) : null;
  const primarySignal = currentSignals.get(`${selectedSymbol}:${primaryTimeframe}`);
  
  return (
    <div className="container mx-auto px-6 py-8">
      <DashboardHeader 
        title="Trading Dashboard" 
        subtitle="Real-time market data and trading signals"
        subscription={subscription}
        actions={
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              isLive 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <Zap size={16} className="mr-2" />
            {isLive ? 'Live Trading' : 'Start Live Mode'}
          </button>
        }
      />

      {/* Trading Dashboard */}
      {showTradingDashboard && (
        <div className="mb-8">
          <TradingDashboard 
            symbol={selectedSymbol}
            timeframe={primaryTimeframe}
          />
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SymbolSelector 
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
        />
        <TimeframeSelector
          selectedTimeframes={selectedTimeframes}
          onTimeframeChange={setSelectedTimeframes}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column - Charts and Analysis */}
        <div className="xl:col-span-3 space-y-6">
          {/* Price and Signal Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PriceCard 
              symbol={selectedSymbol}
              price={currentMarketData?.price || 0}
              change24h={currentMarketData?.change24h || 0}
              volume={currentMarketData?.volume || 0}
              high24h={currentMarketData?.high24h || 0}
              low24h={currentMarketData?.low24h || 0}
            />
            
            {primarySignal && <SignalCard signal={primarySignal} />}
          </div>
          
          {/* Multi-Timeframe Signals */}
          {selectedTimeframes.length > 1 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Multi-Timeframe Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedTimeframes.map(timeframe => {
                  const signal = currentSignals.get(`${selectedSymbol}:${timeframe}`);
                  if (!signal) return null;
                  
                  return (
                    <div key={timeframe} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{timeframe}</span>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          signal.signal === 'buy' ? 'bg-green-600 text-white' :
                          signal.signal === 'sell' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {signal.signal.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">
                        Confidence: {(signal.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Entry: ${signal.entry_price.toFixed(selectedPair?.tickSize.toString().split('.')[1]?.length || 2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Price Chart */}
          <PriceChart 
            data={primaryCandles} 
            indicators={indicators} 
            symbol={selectedSymbol}
            timeframe={primaryTimeframe}
          />
          
          {/* Market Overview */}
          <MarketOverview />
        </div>
        
        {/* Right Column - Indicators and Signals */}
        <div className="space-y-6">
          {/* Technical Indicators */}
          <IndicatorPanel 
            indicators={indicators}
            currentPrice={currentMarketData?.price || 0}
          />
          
          {/* Trade History */}
          <TradeHistory trades={trades} />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowTradingDashboard(!showTradingDashboard)}
              className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                showTradingDashboard 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Bot size={16} className="mr-2" />
              Trading Bot
            </button>
            
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                isLive 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Zap size={16} className="mr-2" />
              {isLive ? 'Live Trading' : 'Start Live Mode'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Strategy Information */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Live Multi-Asset Scalping Strategy with TA-Lib</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-2">Long Entry Confluence</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Price at/below lower Bollinger Band</li>
              <li>• Stochastic RSI bullish cross from oversold {'(<20)'}</li>
              <li>• MACD histogram contracting (weakening downward momentum)</li>
              <li>• RSI {'>'} 30 for confirmation</li>
              <li>• Parabolic SAR flip to bullish (optional)</li>
              <li>• Custom TA-Lib indicators confirmation</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Short Entry Confluence</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Price at/above upper Bollinger Band</li>
              <li>• Stochastic RSI bearish cross from overbought {'(>80)'}</li>
              <li>• MACD histogram contracting (weakening upward momentum)</li>
              <li>• RSI {'<'} 70 for confirmation</li>
              <li>• Parabolic SAR flip to bearish (optional)</li>
              <li>• Custom TA-Lib indicators confirmation</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-white font-medium mb-2">TA-Lib Integration Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>
              <span className="font-medium text-white">Trend Indicators:</span><br/>
              SMA, EMA, WMA, DEMA, TEMA, MACD, ADX, Aroon, PSAR
            </div>
            <div>
              <span className="font-medium text-white">Momentum Indicators:</span><br/>
              RSI, Stochastic, StochRSI, CCI, Williams %R, ROC, MFI
            </div>
            <div>
              <span className="font-medium text-white">Volume & Volatility:</span><br/>
              OBV, A/D, ATR, Bollinger Bands, Keltner Channels
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}