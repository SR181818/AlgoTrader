import axios from 'axios';
import { CandleData } from '../types/trading';

// Base URL for the Python backtesting service
const BACKTEST_SERVICE_URL = 'http://localhost:8000';

// Interfaces matching the Python models
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyParams {
  fast_window: number;
  slow_window: number;
  rsi_window: number;
  rsi_oversold: number;
  rsi_overbought: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  strategy_type: 'ma_crossover' | 'rsi' | 'macd';
  initial_capital: number;
  commission_pct: number;
}

export interface BacktestRequest {
  candles: Candle[];
  strategy_params: StrategyParams;
  symbol: string;
  timeframe: string;
}

export interface TradeResult {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed';
}

export interface EquityPoint {
  timestamp: number;
  value: number;
}

export interface BacktestResult {
  total_return: number;
  total_return_pct: number;
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  equity_curve: EquityPoint[];
  trades: TradeResult[];
  execution_time: number;
}

/**
 * Convert CandleData to the format expected by the Python service
 */
const convertCandles = (candles: CandleData[]): Candle[] => {
  return candles.map(candle => ({
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  }));
};

/**
 * Check if the backtest service is running
 */
export const checkBacktestService = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${BACKTEST_SERVICE_URL}/health`);
    return response.status === 200 && response.data.status === 'healthy';
  } catch (error) {
    console.error('Backtest service health check failed:', error);
    return false;
  }
};

/**
 * Run a backtest with the provided candles and strategy parameters
 */
export const runBacktest = async (
  candles: CandleData[],
  strategyParams: StrategyParams,
  symbol: string = 'BTC/USDT',
  timeframe: string = '15m'
): Promise<BacktestResult> => {
  try {
    // Validate inputs
    if (!candles || candles.length === 0) {
      throw new Error('No candle data provided for backtesting');
    }

    // Prepare request payload
    const request: BacktestRequest = {
      candles: convertCandles(candles),
      strategy_params: strategyParams,
      symbol,
      timeframe
    };

    // Send request to Python service
    const response = await axios.post<BacktestResult>(
      `${BACKTEST_SERVICE_URL}/run-backtest`,
      request,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Return the result
    return response.data;
  } catch (error) {
    console.error('Backtest failed:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Backtest failed: ${error.response.data.detail || error.message}`);
    }
    throw new Error(`Backtest failed: ${error}`);
  }
};

/**
 * Get default strategy parameters
 */
export const getDefaultStrategyParams = (): StrategyParams => {
  return {
    fast_window: 20,
    slow_window: 50,
    rsi_window: 14,
    rsi_oversold: 30,
    rsi_overbought: 70,
    stop_loss_pct: 0.02,
    take_profit_pct: 0.04,
    strategy_type: 'ma_crossover',
    initial_capital: 10000,
    commission_pct: 0.001
  };
};