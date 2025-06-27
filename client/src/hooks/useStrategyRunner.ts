import { useEffect, useState, useCallback, useRef } from 'react';
import { Subscription } from 'rxjs';
import { StrategyRunner, StrategySignal, StrategyConfig, StrategyPerformance } from '../trading/StrategyRunner';
import { CandleData } from '../types/trading';
import { TALibIndicatorResult } from '../utils/talib-indicators';

export interface UseStrategyRunnerOptions {
  autoStart?: boolean;
  enableLogging?: boolean;
}

export const useStrategyRunner = (
  initialStrategy?: StrategyConfig,
  options: UseStrategyRunnerOptions = {}
) => {
  const { autoStart = false, enableLogging = false } = options;
  
  const [strategyRunner] = useState(() => new StrategyRunner(initialStrategy));
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [performance, setPerformance] = useState<StrategyPerformance>({
    totalSignals: 0,
    signalsByType: { LONG: 0, SHORT: 0, HOLD: 0 },
    averageConfidence: 0,
    lastSignalTime: 0,
    signalsPerHour: 0
  });
  const [currentStrategy, setCurrentStrategy] = useState<StrategyConfig | null>(initialStrategy || null);
  const [isRunning, setIsRunning] = useState(autoStart);
  
  const signalSubscriptionRef = useRef<Subscription | null>(null);
  const maxSignalHistory = 100;

  // Subscribe to strategy signals
  useEffect(() => {
    if (isRunning) {
      signalSubscriptionRef.current = strategyRunner.getStrategySignals().subscribe({
        next: (signal) => {
          setSignals(prev => [signal, ...prev.slice(0, maxSignalHistory - 1)]);
          setPerformance(strategyRunner.getPerformance());
          
          if (enableLogging) {
            console.log('Strategy signal:', signal);
          }
        },
        error: (error) => {
          console.error('Strategy signal error:', error);
        }
      });
    } else {
      signalSubscriptionRef.current?.unsubscribe();
      signalSubscriptionRef.current = null;
    }

    return () => {
      signalSubscriptionRef.current?.unsubscribe();
    };
  }, [isRunning, enableLogging]);

  // Update candle data
  const updateCandle = useCallback((candle: CandleData) => {
    if (isRunning) {
      strategyRunner.updateCandle(candle);
    }
  }, [isRunning]);

  // Update indicator signal
  const updateIndicatorSignal = useCallback((
    indicatorName: string, 
    result: TALibIndicatorResult
  ) => {
    if (isRunning) {
      strategyRunner.updateIndicatorSignal(indicatorName, result);
    }
  }, [isRunning]);

  // Set strategy
  const setStrategy = useCallback((strategy: StrategyConfig) => {
    strategyRunner.setStrategy(strategy);
    setCurrentStrategy(strategy);
    setSignals([]); // Clear previous signals
    setPerformance(strategyRunner.getPerformance());
    
    if (enableLogging) {
      console.log('Strategy updated:', strategy.name);
    }
  }, [enableLogging]);

  // Start strategy
  const start = useCallback(() => {
    setIsRunning(true);
    if (enableLogging) {
      console.log('Strategy runner started');
    }
  }, [enableLogging]);

  // Stop strategy
  const stop = useCallback(() => {
    setIsRunning(false);
    if (enableLogging) {
      console.log('Strategy runner stopped');
    }
  }, [enableLogging]);

  // Toggle strategy
  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // Update strategy parameters
  const updateParameters = useCallback((parameters: { [key: string]: any }) => {
    strategyRunner.updateStrategyParameters(parameters);
    setCurrentStrategy(strategyRunner.getCurrentStrategy());
    
    if (enableLogging) {
      console.log('Strategy parameters updated:', parameters);
    }
  }, [enableLogging]);

  // Toggle rule
  const toggleRule = useCallback((ruleId: string, enabled: boolean) => {
    strategyRunner.toggleRule(ruleId, enabled);
    setCurrentStrategy(strategyRunner.getCurrentStrategy());
    
    if (enableLogging) {
      console.log(`Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }, [enableLogging]);

  // Get current indicator signals
  const getCurrentIndicatorSignals = useCallback(() => {
    return strategyRunner.getCurrentIndicatorSignals();
  }, []);

  // Clear signal history
  const clearSignals = useCallback(() => {
    setSignals([]);
  }, []);

  // Get signals by type
  const getSignalsByType = useCallback((type: 'LONG' | 'SHORT' | 'HOLD') => {
    return signals.filter(signal => signal.type === type);
  }, [signals]);

  // Get recent signals
  const getRecentSignals = useCallback((minutes: number = 60) => {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return signals.filter(signal => signal.timestamp > cutoffTime);
  }, [signals]);

  // Get signal statistics
  const getSignalStats = useCallback(() => {
    const total = signals.length;
    const byType = signals.reduce((acc, signal) => {
      acc[signal.type] = (acc[signal.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const avgConfidence = total > 0 ? 
      signals.reduce((sum, signal) => sum + signal.confidence, 0) / total : 0;
    
    const strongSignals = signals.filter(signal => signal.strength === 'STRONG').length;
    const moderateSignals = signals.filter(signal => signal.strength === 'MODERATE').length;
    const weakSignals = signals.filter(signal => signal.strength === 'WEAK').length;

    return {
      total,
      byType,
      avgConfidence,
      byStrength: {
        strong: strongSignals,
        moderate: moderateSignals,
        weak: weakSignals
      }
    };
  }, [signals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      signalSubscriptionRef.current?.unsubscribe();
      strategyRunner.dispose();
    };
  }, []);

  return {
    // State
    signals,
    performance,
    currentStrategy,
    isRunning,
    
    // Actions
    updateCandle,
    updateIndicatorSignal,
    setStrategy,
    start,
    stop,
    toggle,
    updateParameters,
    toggleRule,
    clearSignals,
    
    // Getters
    getCurrentIndicatorSignals,
    getSignalsByType,
    getRecentSignals,
    getSignalStats,
    
    // Strategy factories
    createDefaultStrategy: StrategyRunner.createDefaultStrategy,
    createTrendFollowingStrategy: StrategyRunner.createTrendFollowingStrategy,
  };
};

// Hook for strategy performance monitoring
export const useStrategyPerformance = (strategyRunner: StrategyRunner) => {
  const [performance, setPerformance] = useState<StrategyPerformance>(
    strategyRunner.getPerformance()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPerformance(strategyRunner.getPerformance());
    }, 1000);

    return () => clearInterval(interval);
  }, [strategyRunner]);

  return performance;
};

// Hook for strategy configuration management
export const useStrategyConfig = (initialConfig?: StrategyConfig) => {
  const [config, setConfig] = useState<StrategyConfig | null>(initialConfig || null);
  const [isDirty, setIsDirty] = useState(false);

  const updateConfig = useCallback((updates: Partial<StrategyConfig>) => {
    setConfig(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<any>) => {
    setConfig(prev => {
      if (!prev) return null;
      
      const updatedRules = prev.rules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      );
      
      setIsDirty(true);
      return { ...prev, rules: updatedRules };
    });
  }, []);

  const addRule = useCallback((rule: any) => {
    setConfig(prev => {
      if (!prev) return null;
      
      setIsDirty(true);
      return { ...prev, rules: [...prev.rules, rule] };
    });
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    setConfig(prev => {
      if (!prev) return null;
      
      const updatedRules = prev.rules.filter(rule => rule.id !== ruleId);
      setIsDirty(true);
      return { ...prev, rules: updatedRules };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(initialConfig || null);
    setIsDirty(false);
  }, [initialConfig]);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    config,
    isDirty,
    updateConfig,
    updateRule,
    addRule,
    removeRule,
    resetConfig,
    markClean,
  };
};