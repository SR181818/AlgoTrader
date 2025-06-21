import React, { createContext, useContext, useState } from 'react';
import { TradingSignal, Trade, CandleData } from '../types/trading';

// Create context
interface MetricsContextType {
  recordSignal: (signal: TradingSignal, latencyMs: number) => void;
  recordTrade: (trade: Trade) => void;
  recordOrderExecution: (symbol: string, side: 'buy' | 'sell', type: string, durationMs: number) => void;
  recordStrategyExecution: (strategyName: string, durationMs: number) => void;
  recordCandleData: (symbol: string, timeframe: string, source: string, candle: CandleData, latencyMs: number) => void;
  setSystemHealth: (isHealthy: boolean) => void;
}

// Default implementation that logs to console in development
const defaultImplementation: MetricsContextType = {
  recordSignal: (signal, latencyMs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Signal recorded: ${signal.signal} for ${signal.ticker}, latency: ${latencyMs}ms`);
    }
  },
  recordTrade: (trade) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Trade recorded: ${trade.signal.signal} for ${trade.symbol}, size: ${trade.size}`);
    }
  },
  recordOrderExecution: (symbol, side, type, durationMs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Order execution: ${side} ${symbol}, type: ${type}, duration: ${durationMs}ms`);
    }
  },
  recordStrategyExecution: (strategyName, durationMs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Strategy execution: ${strategyName}, duration: ${durationMs}ms`);
    }
  },
  recordCandleData: (symbol, timeframe, source, candle, latencyMs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] Candle data: ${symbol} ${timeframe}, source: ${source}, latency: ${latencyMs}ms`);
    }
  },
  setSystemHealth: (isHealthy) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] System health: ${isHealthy ? 'healthy' : 'unhealthy'}`);
    }
  }
};

const MetricsContext = createContext<MetricsContextType>(defaultImplementation);

// Provider component
export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the default implementation
  const value = defaultImplementation;
  
  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
};

// Hook for using metrics
export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};