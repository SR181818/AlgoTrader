import React, { useState, useEffect } from 'react';
import { TradingBotService, TradingBotConfig, TradingBotStatus } from '../services/TradingBotService';
import { StrategySignal } from '../trading/StrategyRunner';
import { Order, Position } from '../trading/OrderExecutor';
import { 
  Play, 
  Pause, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Shield, 
  Zap,
  Minus
} from 'lucide-react';

interface TradingBotProps {
  initialConfig?: Partial<TradingBotConfig>;
  onSignalProcessed?: (signal: StrategySignal, order: Order | null) => void;
}

export function TradingBot({ initialConfig, onSignalProcessed }: TradingBotProps) {
  const [tradingBot, setTradingBot] = useState<TradingBotService | null>(null);
  const [status, setStatus] = useState<TradingBotStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<TradingBotConfig>({
    exchange: 'binance',
    testnet: true,
    tradingEnabled: false,
    symbols: ['BTC/USDT', 'ETH/USDT'],
    maxPositions: 3,
    maxLeverage: 1,
    riskPerTrade: 0.02, // 2% risk per trade
    stopLossPercent: 0.02,
    takeProfitPercent: 0.04
  });
  
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  
  // Initialize trading bot
  useEffect(() => {
    const mergedConfig = { ...config, ...initialConfig };
    const bot = new TradingBotService(mergedConfig);
    
    setTradingBot(bot);
    setConfig(mergedConfig);
    
    // Subscribe to status updates
    const subscription = bot.getStatus().subscribe(status => {
      setStatus(status);
    });
    
    return () => {
      subscription.unsubscribe();
      bot.dispose();
    };
  }, []);
  
  // Process signals
  const processSignal = async (signal: StrategySignal) => {
    if (!tradingBot) return;
    
    try {
      const order = await tradingBot.processSignal(signal);
      
      if (onSignalProcessed) {
        onSignalProcessed(signal, order);
      }
    } catch (error) {
      console.error('Failed to process signal:', error);
    }
  };
  
  // Start/stop trading bot
  const toggleTradingBot = async () => {
    if (!tradingBot) return;
    
    if (status?.isRunning) {
      tradingBot.stop();
    } else {
      await tradingBot.start();
    }
  };
  
  // Close position
  const closePosition = async (symbol: string) => {
    if (!tradingBot) return;
    
    try {
      await tradingBot.closePosition(symbol);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };
  
  // Save settings
  const saveSettings = () => {
    if (!tradingBot) return;
    
    const updatedConfig: Partial<TradingBotConfig> = {
      ...config,
      apiKey: apiKey || undefined,
      apiSecret: apiSecret || undefined,
      passphrase: passphrase || undefined
    };
    
    tradingBot.updateConfig(updatedConfig);
    setConfig(prev => ({ ...prev, ...updatedConfig }));
    setShowSettings(false);
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Format time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!tradingBot || !status) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">Initializing Trading Bot...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="text-blue-400 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-white">Live Trading Bot</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-lg text-sm ${
              status.isRunning ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
            }`}>
              {status.isRunning ? 'ACTIVE' : 'INACTIVE'}
            </div>
            
            <div className={`px-3 py-1 rounded-lg text-sm ${
              config.tradingEnabled ? 'bg-orange-600/20 text-orange-400' : 'bg-blue-600/20 text-blue-400'
            }`}>
              {config.tradingEnabled ? 'LIVE TRADING' : 'PAPER TRADING'}
            </div>
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Control Panel */}
      <div className="p-4 border-b border-gray-700 bg-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTradingBot}
              className={`flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                status.isRunning 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {status.isRunning ? (
                <>
                  <Pause size={16} className="mr-2" />
                  Stop Trading
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Start Trading
                </>
              )}
            </button>
            
            <div className="text-sm text-gray-300">
              Exchange: <span className="text-white">{config.exchange.toUpperCase()}</span>
              {config.testnet && <span className="ml-1 text-yellow-400">(Testnet)</span>}
            </div>
            
            <div className="text-sm text-gray-300">
              Symbols: <span className="text-white">{config.symbols.join(', ')}</span>
            </div>
          </div>
          
          {status.uptime && status.startTime && (
            <div className="flex items-center text-sm text-gray-300">
              <Clock size={14} className="mr-1" />
              Running for {formatDuration(status.uptime)}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Balance */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <DollarSign size={16} className="mr-2 text-green-400" />
              Account Balance
            </h4>
            
            <div className="space-y-2">
              {Object.entries(status.balance).map(([currency, balance]) => (
                <div key={currency} className="flex justify-between">
                  <span className="text-gray-300">{currency}</span>
                  <span className="text-white font-mono">
                    {balance.total.toFixed(currency === 'USDT' ? 2 : 8)} 
                    <span className="text-gray-400 text-xs ml-1">
                      (Free: {balance.free.toFixed(currency === 'USDT' ? 2 : 8)})
                    </span>
                  </span>
                </div>
              ))}
              
              {Object.keys(status.balance).length === 0 && (
                <div className="text-gray-400 text-sm">No balance information available</div>
              )}
            </div>
          </div>
          
          {/* Risk Parameters */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Shield size={16} className="mr-2 text-blue-400" />
              Risk Parameters
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Risk Per Trade</span>
                <span className="text-white">{(config.riskPerTrade * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Stop Loss</span>
                <span className="text-white">{(config.stopLossPercent * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Take Profit</span>
                <span className="text-white">{(config.takeProfitPercent * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Max Positions</span>
                <span className="text-white">{config.maxPositions}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Max Leverage</span>
                <span className="text-white">{config.maxLeverage}x</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Trading Mode</span>
                <span className={config.tradingEnabled ? 'text-orange-400' : 'text-blue-400'}>
                  {config.tradingEnabled ? 'LIVE' : 'PAPER'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Positions */}
        <div className="mb-4">
          <h4 className="text-white font-medium mb-3">Open Positions</h4>
          
          {status.positions.length === 0 ? (
            <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
              No open positions
            </div>
          ) : (
            <div className="bg-gray-700/30 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left p-3 text-gray-300 font-medium">Symbol</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Side</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Size</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Entry Price</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Current Price</th>
                    <th className="text-right p-3 text-gray-300 font-medium">P&L</th>
                    <th className="text-center p-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {status.positions.map((position) => (
                    <tr key={position.symbol} className="border-t border-gray-700/50">
                      <td className="p-3 text-white">{position.symbol}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          position.side === 'long' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        {position.amount.toFixed(6)}
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        {formatCurrency(position.entryPrice)}
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className={position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(position.unrealizedPnL)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => closePosition(position.symbol)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Recent Activity */}
        <div className="mb-4">
          <h4 className="text-white font-medium mb-3">Recent Activity</h4>
          
          <div className="space-y-3">
            {status.lastSignal && (
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div className={`p-1 rounded ${
                      status.lastSignal.type === 'LONG' ? 'bg-green-600/20 text-green-400' : 
                      status.lastSignal.type === 'SHORT' ? 'bg-red-600/20 text-red-400' : 
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {status.lastSignal.type === 'LONG' ? <TrendingUp size={16} /> : 
                       status.lastSignal.type === 'SHORT' ? <TrendingDown size={16} /> : 
                       <Minus size={16} />}
                    </div>
                    <span className="ml-2 text-white font-medium">
                      {status.lastSignal.type} Signal for {status.lastSignal.metadata.symbol}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatTime(status.lastSignal.timestamp)}
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  Confidence: {(status.lastSignal.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {status.lastSignal.reasoning[0]}
                </div>
              </div>
            )}
            
            {status.lastOrder && (
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div className={`p-1 rounded ${
                      status.lastOrder.status === 'filled' ? 'bg-green-600/20 text-green-400' : 
                      status.lastOrder.status === 'rejected' ? 'bg-red-600/20 text-red-400' : 
                      'bg-yellow-600/20 text-yellow-400'
                    }`}>
                      {status.lastOrder.status === 'filled' ? <CheckCircle size={16} /> : 
                       status.lastOrder.status === 'rejected' ? <XCircle size={16} /> : 
                       <Clock size={16} />}
                    </div>
                    <span className="ml-2 text-white font-medium">
                      Order {status.lastOrder.status.toUpperCase()}: {status.lastOrder.intent.side.toUpperCase()} {status.lastOrder.intent.symbol}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatTime(status.lastOrder.timestamp)}
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  Amount: {status.lastOrder.executedAmount.toFixed(6)} @ {formatCurrency(status.lastOrder.executedPrice)}
                </div>
                {status.lastOrder.error && (
                  <div className="text-xs text-red-400 mt-1">
                    Error: {status.lastOrder.error}
                  </div>
                )}
              </div>
            )}
            
            {(!status.lastSignal && !status.lastOrder) && (
              <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                No recent activity
              </div>
            )}
          </div>
        </div>
        
        {/* Errors */}
        {status.errors.length > 0 && (
          <div className="mb-4">
            <h4 className="text-white font-medium mb-3">Errors</h4>
            
            <div className="bg-gray-700/30 rounded-lg p-3 max-h-40 overflow-y-auto">
              {status.errors.slice(-5).map((error, index) => (
                <div key={index} className="flex items-start mb-2 last:mb-0">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Bot Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Exchange</label>
                <select
                  value={config.exchange}
                  onChange={(e) => setConfig({ ...config, exchange: e.target.value as any })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                >
                  <option value="binance">Binance</option>
                  <option value="kucoin">KuCoin</option>
                  <option value="bybit">Bybit</option>
                  <option value="okx">OKX</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                />
              </div>
              
              {config.exchange === 'okx' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Passphrase</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter Passphrase"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={config.riskPerTrade * 100}
                    onChange={(e) => setConfig({ ...config, riskPerTrade: parseFloat(e.target.value) / 100 })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max Positions</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.maxPositions}
                    onChange={(e) => setConfig({ ...config, maxPositions: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Stop Loss (%)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={config.stopLossPercent * 100}
                    onChange={(e) => setConfig({ ...config, stopLossPercent: parseFloat(e.target.value) / 100 })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Take Profit (%)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={config.takeProfitPercent * 100}
                    onChange={(e) => setConfig({ ...config, takeProfitPercent: parseFloat(e.target.value) / 100 })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Symbols (comma separated)</label>
                <input
                  type="text"
                  value={config.symbols.join(', ')}
                  onChange={(e) => setConfig({ ...config, symbols: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="testnet"
                  checked={config.testnet}
                  onChange={(e) => setConfig({ ...config, testnet: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="testnet" className="text-white">Use Testnet</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tradingEnabled"
                  checked={config.tradingEnabled}
                  onChange={(e) => setConfig({ ...config, tradingEnabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="tradingEnabled" className="text-white">Enable Live Trading</label>
              </div>
              
              {config.tradingEnabled && !apiKey && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                  <AlertCircle size={16} className="inline-block mr-2" />
                  API Key and Secret are required for live trading
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}