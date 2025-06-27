import { useState, useEffect, useCallback } from 'react';
import { Subscription } from 'rxjs';
import { LiveMarketDataService } from '../services/LiveMarketDataService';
import { TechnicalIndicatorService, IndicatorConfig } from '../services/TechnicalIndicatorService';
import { MarketDataIntegrationService } from '../services/MarketDataIntegrationService';
import { CandleData, MarketData } from '../types/trading';

// Create singleton instances
const liveMarketDataService = new LiveMarketDataService({
  defaultExchange: 'binance',
  exchanges: [
    {
      name: 'binance',
      testnet: true,
      rateLimit: 1000
    }
  ],
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  enableLogging: true
});

const marketDataIntegrationService = new MarketDataIntegrationService(liveMarketDataService);

export interface UseMarketDataOptions {
  indicators?: IndicatorConfig[];
  autoConnect?: boolean;
}

export function useMarketData(
  symbol: string,
  timeframe: string,
  options: UseMarketDataOptions = {}
) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [indicators, setIndicators] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Subscribe to market data
  useEffect(() => {
    if (!symbol || !timeframe) return;
    
    setIsLoading(true);
    setError(null);
    
    const subscription = marketDataIntegrationService
      .subscribeToMarketData(symbol, timeframe, options.indicators || [])
      .subscribe({
        next: (data) => {
          setMarketData(data.marketData);
          setCandles(data.candles);
          setIndicators(data.indicators);
          setIsLoading(false);
          setIsConnected(true);
        },
        error: (err) => {
          console.error('Market data error:', err);
          setError(err.message || 'Failed to fetch market data');
          setIsLoading(false);
          setIsConnected(false);
        }
      });
    
    // Subscribe to status updates
    const statusSubscription = marketDataIntegrationService
      .getStatus()
      .subscribe(status => {
        setIsConnected(status.status === 'connected');
        if (status.status === 'error') {
          setError(status.message || 'Connection error');
        }
      });
    
    return () => {
      subscription.unsubscribe();
      statusSubscription.unsubscribe();
      
      // Only unsubscribe if autoConnect is not explicitly set to true
      if (options.autoConnect !== true) {
        marketDataIntegrationService.unsubscribeFromMarketData(symbol, timeframe);
      }
    };
  }, [symbol, timeframe, options.autoConnect]);
  
  // Update indicators
  useEffect(() => {
    if (options.indicators && symbol && timeframe) {
      marketDataIntegrationService.updateIndicators(symbol, timeframe, options.indicators);
    }
  }, [symbol, timeframe, options.indicators]);
  
  // Calculate indicators manually
  const calculateIndicator = useCallback((name: string, parameters: Record<string, any> = {}) => {
    if (candles.length === 0) return null;
    return TechnicalIndicatorService.calculateIndicator(name, candles, parameters);
  }, [candles]);
  
  return {
    marketData,
    candles,
    indicators,
    isLoading,
    error,
    isConnected,
    calculateIndicator
  };
}

// Hook for multiple symbols
export function useMultiMarketData(
  symbols: string[],
  timeframe: string,
  options: UseMarketDataOptions = {}
) {
  const [marketDataMap, setMarketDataMap] = useState<Record<string, MarketData>>({});
  const [candlesMap, setCandlesMap] = useState<Record<string, CandleData[]>>({});
  const [indicatorsMap, setIndicatorsMap] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (symbols.length === 0 || !timeframe) return;
    
    setIsLoading(true);
    
    const subscriptions: Subscription[] = [];
    
    symbols.forEach(symbol => {
      const subscription = marketDataIntegrationService
        .subscribeToMarketData(symbol, timeframe, options.indicators || [])
        .subscribe({
          next: (data) => {
            setMarketDataMap(prev => ({ ...prev, [symbol]: data.marketData }));
            setCandlesMap(prev => ({ ...prev, [symbol]: data.candles }));
            setIndicatorsMap(prev => ({ ...prev, [symbol]: data.indicators }));
            
            // Check if all symbols are loaded
            if (Object.keys(marketDataMap).length === symbols.length) {
              setIsLoading(false);
            }
          },
          error: (err) => {
            console.error(`Market data error for ${symbol}:`, err);
            setErrors(prev => ({ ...prev, [symbol]: err.message || 'Failed to fetch market data' }));
          }
        });
      
      subscriptions.push(subscription);
    });
    
    // Subscribe to status updates
    const statusSubscription = marketDataIntegrationService
      .getStatus()
      .subscribe(status => {
        setIsConnected(status.status === 'connected');
      });
    
    subscriptions.push(statusSubscription);
    
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      
      // Only unsubscribe if autoConnect is not explicitly set to true
      if (options.autoConnect !== true) {
        symbols.forEach(symbol => {
          marketDataIntegrationService.unsubscribeFromMarketData(symbol, timeframe);
        });
      }
    };
  }, [symbols.join(','), timeframe, options.autoConnect]);
  
  return {
    marketDataMap,
    candlesMap,
    indicatorsMap,
    isLoading,
    errors,
    isConnected
  };
}

// Export singleton services for direct access
export { liveMarketDataService, marketDataIntegrationService };