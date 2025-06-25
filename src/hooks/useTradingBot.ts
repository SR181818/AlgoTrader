import { useState, useEffect, useCallback } from 'react';
import { TradingBotService, TradingBotConfig, TradingBotStatus } from '../services/TradingBotService';
import { StrategySignal } from '../trading/StrategyRunner';
import { Order } from '../trading/OrderExecutor';

export function useTradingBot(initialConfig?: Partial<TradingBotConfig>) {
  const [tradingBot, setTradingBot] = useState<TradingBotService | null>(null);
  const [status, setStatus] = useState<TradingBotStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default configuration
  const defaultConfig: TradingBotConfig = {
    exchange: 'binance',
    testnet: true,
    tradingEnabled: false,
    symbols: ['BTC/USDT', 'ETH/USDT'],
    maxPositions: 3,
    maxLeverage: 1,
    riskPerTrade: 0.02,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.04
  };
  
  // Initialize trading bot
  useEffect(() => {
    try {
      const mergedConfig = { ...defaultConfig, ...initialConfig };
      const bot = new TradingBotService(mergedConfig);
      
      setTradingBot(bot);
      
      // Subscribe to status updates
      const subscription = bot.getStatus().subscribe(status => {
        setStatus(status);
      });
      
      setIsInitialized(true);
      setError(null);
      
      return () => {
        subscription.unsubscribe();
        bot.dispose();
      };
    } catch (error) {
      setError(`Failed to initialize trading bot: ${error instanceof Error ? error.message : String(error)}`);
      setIsInitialized(false);
      return () => {};
    }
  }, []);
  
  // Start trading bot
  const start = useCallback(async () => {
    if (!tradingBot) {
      setError('Trading bot not initialized');
      return false;
    }
    
    try {
      const result = await tradingBot.start();
      if (!result) {
        setError('Failed to start trading bot');
      }
      return result;
    } catch (error) {
      setError(`Failed to start trading bot: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [tradingBot]);
  
  // Stop trading bot
  const stop = useCallback(() => {
    if (!tradingBot) {
      setError('Trading bot not initialized');
      return;
    }
    
    tradingBot.stop();
  }, [tradingBot]);
  
  // Process signal
  const processSignal = useCallback(async (signal: StrategySignal) => {
    if (!tradingBot) {
      setError('Trading bot not initialized');
      return null;
    }
    
    try {
      return await tradingBot.processSignal(signal);
    } catch (error) {
      setError(`Failed to process signal: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, [tradingBot]);
  
  // Close position
  const closePosition = useCallback(async (symbol: string) => {
    if (!tradingBot) {
      setError('Trading bot not initialized');
      return null;
    }
    
    try {
      return await tradingBot.closePosition(symbol);
    } catch (error) {
      setError(`Failed to close position: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, [tradingBot]);
  
  // Update configuration
  const updateConfig = useCallback((config: Partial<TradingBotConfig>) => {
    if (!tradingBot) {
      setError('Trading bot not initialized');
      return;
    }
    
    tradingBot.updateConfig(config);
  }, [tradingBot]);
  
  return {
    tradingBot,
    status,
    isInitialized,
    error,
    start,
    stop,
    processSignal,
    closePosition,
    updateConfig
  };
}