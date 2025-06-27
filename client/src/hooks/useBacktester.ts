import { useEffect, useState, useCallback, useRef } from 'react';
import { Subscription } from 'rxjs';
import { Backtester, BacktestConfig, BacktestResult, BacktestProgress } from '../trading/Backtester';
import { CandleData } from '../types/trading';

export interface UseBacktesterOptions {
  autoStart?: boolean;
  enableLogging?: boolean;
}

export const useBacktester = (
  config: BacktestConfig,
  options: UseBacktesterOptions = {}
) => {
  const { autoStart = false, enableLogging = false } = options;
  
  const [backtester] = useState(() => new Backtester(config));
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const progressSubscriptionRef = useRef<Subscription | null>(null);

  // Subscribe to progress updates
  useEffect(() => {
    progressSubscriptionRef.current = backtester.getProgressUpdates().subscribe({
      next: (progressUpdate) => {
        setProgress(progressUpdate);
        
        if (enableLogging) {
          console.log('Backtest progress:', progressUpdate);
        }
      },
      error: (error) => {
        console.error('Progress update error:', error);
      }
    });

    return () => {
      progressSubscriptionRef.current?.unsubscribe();
    };
  }, [enableLogging]);

  // Load data into backtester
  const loadData = useCallback((data: CandleData[] | string) => {
    try {
      backtester.loadData(data);
      setError(null);
      
      if (enableLogging) {
        console.log('Data loaded into backtester');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load data:', error);
    }
  }, [enableLogging]);

  // Start backtest
  const startBacktest = useCallback(async (): Promise<BacktestResult | null> => {
    try {
      setIsRunning(true);
      setIsPaused(false);
      setResults(null);
      setError(null);
      
      if (enableLogging) {
        console.log('Starting backtest...');
      }
      
      const result = await backtester.startBacktest();
      setResults(result);
      setIsRunning(false);
      
      if (enableLogging) {
        console.log('Backtest completed:', result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backtest failed';
      setError(errorMessage);
      setIsRunning(false);
      console.error('Backtest failed:', error);
      return null;
    }
  }, [enableLogging]);

  // Pause backtest
  const pauseBacktest = useCallback(() => {
    if (isRunning) {
      backtester.pause();
      setIsPaused(true);
      
      if (enableLogging) {
        console.log('Backtest paused');
      }
    }
  }, [isRunning, enableLogging]);

  // Resume backtest
  const resumeBacktest = useCallback(() => {
    if (isRunning && isPaused) {
      backtester.resume();
      setIsPaused(false);
      
      if (enableLogging) {
        console.log('Backtest resumed');
      }
    }
  }, [isRunning, isPaused, enableLogging]);

  // Stop backtest
  const stopBacktest = useCallback(() => {
    if (isRunning) {
      backtester.stop();
      setIsRunning(false);
      setIsPaused(false);
      setProgress(null);
      
      if (enableLogging) {
        console.log('Backtest stopped');
      }
    }
  }, [isRunning, enableLogging]);

  // Toggle pause/resume
  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeBacktest();
    } else {
      pauseBacktest();
    }
  }, [isPaused, pauseBacktest, resumeBacktest]);

  // Clear results and reset state
  const clearResults = useCallback(() => {
    setResults(null);
    setProgress(null);
    setError(null);
  }, []);

  // Export results to CSV
  const exportResultsToCSV = useCallback((): string | null => {
    if (!results) return null;

    const csvContent = [
      'Trade ID,Symbol,Side,Entry Time,Exit Time,Entry Price,Exit Price,Quantity,PnL,PnL %,Commission,Duration (ms)',
      ...results.trades.map(trade => [
        trade.id,
        trade.symbol,
        trade.side,
        new Date(trade.entryTime).toISOString(),
        trade.exitTime ? new Date(trade.exitTime).toISOString() : '',
        trade.entryPrice,
        trade.exitPrice || '',
        trade.quantity,
        trade.pnl || '',
        trade.pnlPercent || '',
        trade.commission,
        trade.duration || ''
      ].join(','))
    ].join('\n');

    return csvContent;
  }, [results]);

  // Download results as CSV file
  const downloadResults = useCallback((filename?: string) => {
    const csvContent = exportResultsToCSV();
    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `backtest_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportResultsToCSV]);

  // Get summary statistics
  const getSummaryStats = useCallback(() => {
    if (!results) return null;

    return {
      totalReturn: results.totalReturn,
      totalReturnPercent: results.totalReturnPercent,
      winRate: results.winRate,
      profitFactor: results.profitFactor,
      sharpeRatio: results.sharpeRatio,
      maxDrawdown: results.maxDrawdownPercent,
      totalTrades: results.totalTrades,
      timeInMarket: results.timeInMarket,
    };
  }, [results]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startBacktest();
    }
  }, [autoStart, startBacktest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      progressSubscriptionRef.current?.unsubscribe();
      backtester.dispose();
    };
  }, []);

  return {
    // State
    isRunning,
    isPaused,
    progress,
    results,
    error,
    
    // Actions
    loadData,
    startBacktest,
    pauseBacktest,
    resumeBacktest,
    stopBacktest,
    togglePause,
    clearResults,
    
    // Utilities
    exportResultsToCSV,
    downloadResults,
    getSummaryStats,
    
    // Direct backtester access (for advanced usage)
    backtester,
  };
};

// Hook for managing multiple backtests
export const useBacktestComparison = () => {
  const [backtests, setBacktests] = useState<Map<string, BacktestResult>>(new Map());

  const addBacktest = useCallback((id: string, result: BacktestResult) => {
    setBacktests(prev => new Map(prev.set(id, result)));
  }, []);

  const removeBacktest = useCallback((id: string) => {
    setBacktests(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const clearAllBacktests = useCallback(() => {
    setBacktests(new Map());
  }, []);

  const compareMetrics = useCallback((metric: keyof BacktestResult) => {
    const results = Array.from(backtests.entries()).map(([id, result]) => ({
      id,
      value: result[metric]
    }));
    
    return results.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return b.value - a.value; // Descending order
      }
      return 0;
    });
  }, [backtests]);

  return {
    backtests: Array.from(backtests.entries()),
    addBacktest,
    removeBacktest,
    clearAllBacktests,
    compareMetrics,
    count: backtests.size,
  };
};