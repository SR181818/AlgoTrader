import { useEffect, useState, useCallback, useRef } from 'react';
import { Subscription } from 'rxjs';
import { binanceWebSocketService, ConnectionStatus, StreamSubscription } from '../services/BinanceWebSocketService';
import { CandleData } from '../types/trading';
import Logger from '../utils/logger';

export interface UseBinanceWebSocketOptions {
  autoConnect?: boolean;
  enableLogging?: boolean;
}

export const useBinanceWebSocket = (options: UseBinanceWebSocketOptions = {}) => {
  const { autoConnect = true, enableLogging = false } = options;
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  const [activeStreams, setActiveStreams] = useState<StreamSubscription[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());

  // Monitor connection status
  useEffect(() => {
    // TODO: Ensure all WebSocket connections are properly cleaned up on unmount
    const subscription = binanceWebSocketService.getConnectionStatus().subscribe({
      next: (status) => {
        setConnectionStatus(status);
        setIsConnected(status.status === 'connected');
        if (enableLogging) {
          Logger.info('WebSocket status:', status);
        }
      },
      error: (error) => {
        Logger.error('Connection status error:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [enableLogging]);

  // Monitor active streams
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStreams(binanceWebSocketService.getActiveStreams());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to candlestick stream
  const subscribeToCandleStream = useCallback((
    symbol: string, 
    interval: string,
    onData: (candle: CandleData) => void,
    onError?: (error: any) => void
  ): string => {
    const subscriptionKey = `candle_${symbol}_${interval}`;
    
    // Unsubscribe existing subscription if any
    const existingSubscription = subscriptionsRef.current.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
    }

    const subscription = binanceWebSocketService
      .subscribeToCandleStream(symbol, interval)
      .subscribe({
        next: onData,
        error: onError || ((error) => console.error(`Candle stream error for ${symbol}:`, error))
      });

    subscriptionsRef.current.set(subscriptionKey, subscription);
    
    if (enableLogging) {
      console.log(`Subscribed to candle stream: ${symbol} ${interval}`);
    }
    
    return subscriptionKey;
  }, [enableLogging]);

  // Subscribe to ticker stream
  const subscribeToTickerStream = useCallback((
    symbol: string,
    onData: (ticker: any) => void,
    onError?: (error: any) => void
  ): string => {
    const subscriptionKey = `ticker_${symbol}`;
    
    // Unsubscribe existing subscription if any
    const existingSubscription = subscriptionsRef.current.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
    }

    const subscription = binanceWebSocketService
      .subscribeToTickerStream(symbol)
      .subscribe({
        next: onData,
        error: onError || ((error) => console.error(`Ticker stream error for ${symbol}:`, error))
      });

    subscriptionsRef.current.set(subscriptionKey, subscription);
    
    if (enableLogging) {
      console.log(`Subscribed to ticker stream: ${symbol}`);
    }
    
    return subscriptionKey;
  }, [enableLogging]);

  // Subscribe to multiple streams
  const subscribeToMultipleStreams = useCallback((
    subscriptions: Array<{
      symbol: string;
      interval?: string;
      type: 'kline' | 'ticker';
    }>,
    onData: (data: { type: string; symbol: string; data: any }) => void,
    onError?: (error: any) => void
  ): string => {
    const subscriptionKey = `multi_${Date.now()}`;
    
    const subscription = binanceWebSocketService
      .subscribeToMultipleStreams(subscriptions)
      .subscribe({
        next: onData,
        error: onError || ((error) => console.error('Multi-stream error:', error))
      });

    subscriptionsRef.current.set(subscriptionKey, subscription);
    
    if (enableLogging) {
      console.log('Subscribed to multiple streams:', subscriptions);
    }
    
    return subscriptionKey;
  }, [enableLogging]);

  // Unsubscribe from a specific subscription
  const unsubscribe = useCallback((subscriptionKey: string) => {
    const subscription = subscriptionsRef.current.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      
      if (enableLogging) {
        console.log(`Unsubscribed from: ${subscriptionKey}`);
      }
    }
  }, [enableLogging]);

  // Unsubscribe from stream by symbol and type
  const unsubscribeFromStream = useCallback((
    symbol: string, 
    interval?: string, 
    type: 'kline' | 'ticker' = 'kline'
  ) => {
    binanceWebSocketService.unsubscribeFromStream(symbol, interval, type);
    
    // Also clean up local subscriptions
    const subscriptionKey = interval ? 
      `${type}_${symbol}_${interval}` : 
      `${type}_${symbol}`;
    unsubscribe(subscriptionKey);
  }, [unsubscribe]);

  // Disconnect all streams
  const disconnectAll = useCallback(() => {
    // Unsubscribe all local subscriptions
    subscriptionsRef.current.forEach(subscription => subscription.unsubscribe());
    subscriptionsRef.current.clear();
    
    // Disconnect service
    binanceWebSocketService.disconnectAll();
    
    if (enableLogging) {
      console.log('Disconnected all WebSocket streams');
    }
  }, [enableLogging]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return binanceWebSocketService.getConnectionStats();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(subscription => subscription.unsubscribe());
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    // State
    connectionStatus,
    activeStreams,
    isConnected,
    
    // Actions
    subscribeToCandleStream,
    subscribeToTickerStream,
    subscribeToMultipleStreams,
    unsubscribe,
    unsubscribeFromStream,
    disconnectAll,
    getConnectionStats,
    
    // Utilities
    formatSymbolForBinance: binanceWebSocketService.constructor.formatSymbolForBinance,
    formatSymbolFromBinance: binanceWebSocketService.constructor.formatSymbolFromBinance,
    validateSymbol: binanceWebSocketService.constructor.validateSymbol,
    getAvailableIntervals: binanceWebSocketService.constructor.getAvailableIntervals,
  };
};

// Hook for simple candle stream subscription
export const useCandleStream = (
  symbol: string, 
  interval: string, 
  enabled: boolean = true
) => {
  const [candleData, setCandleData] = useState<CandleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const { subscribeToCandleStream, unsubscribeFromStream } = useBinanceWebSocket();
  const subscriptionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol || !interval) {
      return;
    }

    setError(null);
    setIsSubscribed(true);
    
    const subscriptionKey = subscribeToCandleStream(
      symbol,
      interval,
      (candle) => {
        setCandleData(candle);
        setError(null);
      },
      (error) => {
        setError(error.message || 'Stream error');
        setIsSubscribed(false);
      }
    );
    
    subscriptionKeyRef.current = subscriptionKey;

    return () => {
      if (subscriptionKeyRef.current) {
        unsubscribeFromStream(symbol, interval, 'kline');
        setIsSubscribed(false);
      }
    };
  }, [symbol, interval, enabled, subscribeToCandleStream, unsubscribeFromStream]);

  return {
    candleData,
    error,
    isSubscribed,
  };
};

// Hook for ticker stream subscription
export const useTickerStream = (symbol: string, enabled: boolean = true) => {
  const [tickerData, setTickerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const { subscribeToTickerStream, unsubscribeFromStream } = useBinanceWebSocket();
  const subscriptionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) {
      return;
    }

    setError(null);
    setIsSubscribed(true);
    
    const subscriptionKey = subscribeToTickerStream(
      symbol,
      (ticker) => {
        setTickerData(ticker);
        setError(null);
      },
      (error) => {
        setError(error.message || 'Ticker stream error');
        setIsSubscribed(false);
      }
    );
    
    subscriptionKeyRef.current = subscriptionKey;

    return () => {
      if (subscriptionKeyRef.current) {
        unsubscribeFromStream(symbol, undefined, 'ticker');
        setIsSubscribed(false);
      }
    };
  }, [symbol, enabled, subscribeToTickerStream, unsubscribeFromStream]);

  return {
    tickerData,
    error,
    isSubscribed,
  };
};