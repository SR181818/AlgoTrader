import { technicalIndicators, type OHLCV, calculateIndicators } from '../utils/technicalIndicators';
import { CandleData } from '../types/trading';

export interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  timestamp: number;
  price: number;
  indicators?: Record<string, number>;
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: number;
  price: number;
  indicators?: Record<string, number>;
  reason?: string;
}

export interface StrategyConfig {
  name: string;
  version: string;
  parameters: Record<string, any>;
}

export class StrategyRunner {
  private config: StrategyConfig;
  private data: OHLCV[] = [];
  private currentCandle: CandleData | null = null;
  private candleHistory: CandleData[] = [];

  constructor(config: StrategyConfig) {
    this.config = config;
    console.log(`Strategy set: ${config.name} v${config.version}`);
  }

  setData(data: OHLCV[]): void {
    this.data = data;
  }

  updateCandle(candle: CandleData): void {
    this.currentCandle = candle;
    this.candleHistory.push(candle);
    // Keep only the last 500 candles for performance
    if (this.candleHistory.length > 500) {
      this.candleHistory = this.candleHistory.slice(-500);
    }
  }

  getCurrentIndicatorSignals(): Record<string, number> {
    if (!this.currentCandle || this.candleHistory.length < 50) {
      return {};
    }

    const closes = this.candleHistory.map(c => c.close);
    const highs = this.candleHistory.map(c => c.high);
    const lows = this.candleHistory.map(c => c.low);

    try {
      const rsi = technicalIndicators.RSI(closes, 14);
      const macd = technicalIndicators.MACD(closes, 12, 26, 9);
      const ema12 = technicalIndicators.EMA(closes, 12);
      const ema26 = technicalIndicators.EMA(closes, 26);
      const adx = technicalIndicators.ADX(highs, lows, closes, 14);

      return {
        RSI: rsi[rsi.length - 1] || 50,
        MACD: macd.MACD[macd.MACD.length - 1] || 0,
        MACD_Signal: macd.signal[macd.signal.length - 1] || 0,
        EMA_12: ema12[ema12.length - 1] || closes[closes.length - 1],
        EMA_26: ema26[ema26.length - 1] || closes[closes.length - 1],
        ADX: adx[adx.length - 1] || 25
      };
    } catch (error) {
      console.error('Error calculating indicators:', error);
      return {};
    }
  }

  getStrategySignals(): StrategySignal[] {
    if (!this.currentCandle || this.candleHistory.length < 50) {
      return [];
    }

    const signal = this.generateSignalFromCandles(this.candleHistory);
    return [{
      action: signal.type,
      confidence: signal.strength,
      timestamp: signal.timestamp,
      price: signal.price,
      indicators: signal.indicators,
      reason: this.getSignalReason(signal)
    }];
  }

  private getSignalReason(signal: Signal): string {
    if (signal.type === 'BUY') {
      return 'Multi-indicator confluence suggests bullish conditions';
    } else if (signal.type === 'SELL') {
      return 'Multi-indicator confluence suggests bearish conditions';
    }
    return 'No clear directional signal';
  }

  private generateSignalFromCandles(candles: CandleData[]): Signal {
    const ohlcvData = candles.map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));

    return this.generateSignal(ohlcvData);
  }

  initializeIndicators(data: CandleData[]): void {
    this.candleHistory = [...data];
    if (data.length > 0) {
      this.currentCandle = data[data.length - 1];
    }
    console.log(`Initialized strategy with ${data.length} candles`);
  }

  generateSignal(currentData: OHLCV[]): Signal {
    if (currentData.length < 50) {
      return {
        type: 'HOLD',
        strength: 0,
        timestamp: Date.now(),
        price: currentData[currentData.length - 1]?.close || 0
      };
    }

    const closes = currentData.map(d => d.close);
    const highs = currentData.map(d => d.high);
    const lows = currentData.map(d => d.low);

    try {
      // Calculate indicators
      const rsi = technicalIndicators.RSI(closes, 14);
      const macd = technicalIndicators.MACD(closes, 12, 26, 9);
      const ema12 = technicalIndicators.EMA(closes, 12);
      const ema26 = technicalIndicators.EMA(closes, 26);
      const adx = technicalIndicators.ADX(highs, lows, closes, 14);

      const currentRSI = rsi[rsi.length - 1] || 50;
      const currentMACD = macd.MACD[macd.MACD.length - 1] || 0;
      const currentSignal = macd.signal[macd.signal.length - 1] || 0;
      const currentEMA12 = ema12[ema12.length - 1] || closes[closes.length - 1];
      const currentEMA26 = ema26[ema26.length - 1] || closes[closes.length - 1];
      const currentADX = adx[adx.length - 1] || 25;

      const currentPrice = closes[closes.length - 1];

      // Multi-indicator confluence strategy
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let strength = 0;

      // RSI conditions
      const rsiOversold = currentRSI < 30;
      const rsiOverbought = currentRSI > 70;

      // MACD conditions
      const macdBullish = currentMACD > currentSignal;
      const macdBearish = currentMACD < currentSignal;

      // EMA conditions
      const emaBullish = currentEMA12 > currentEMA26;
      const emaBearish = currentEMA12 < currentEMA26;

      // ADX trend strength
      const strongTrend = currentADX > 25;

      // Calculate signal strength and type
      let bullishSignals = 0;
      let bearishSignals = 0;

      if (rsiOversold) bullishSignals++;
      if (rsiOverbought) bearishSignals++;
      if (macdBullish) bullishSignals++;
      if (macdBearish) bearishSignals++;
      if (emaBullish) bullishSignals++;
      if (emaBearish) bearishSignals++;

      if (strongTrend) {
        bullishSignals *= 1.2;
        bearishSignals *= 1.2;
      }

      if (bullishSignals > bearishSignals && bullishSignals >= 2) {
        signal = 'BUY';
        strength = Math.min(bullishSignals / 3, 1);
      } else if (bearishSignals > bullishSignals && bearishSignals >= 2) {
        signal = 'SELL';
        strength = Math.min(bearishSignals / 3, 1);
      }

      return {
        type: signal,
        strength,
        timestamp: Date.now(),
        price: currentPrice,
        indicators: {
          RSI: currentRSI,
          MACD: currentMACD,
          MACD_Signal: currentSignal,
          EMA_12: currentEMA12,
          EMA_26: currentEMA26,
          ADX: currentADX
        }
      };

    } catch (error) {
      console.error('Error generating signal:', error);
      return {
        type: 'HOLD',
        strength: 0,
        timestamp: Date.now(),
        price: closes[closes.length - 1] || 0,
        indicators: {}
      };
    }
  }

  backtest(data: OHLCV[]): {
    signals: Signal[];
    performance: {
      totalTrades: number;
      winRate: number;
      totalReturn: number;
      maxDrawdown: number;
    };
  } {
    const signals: Signal[] = [];
    let balance = 10000;
    let position = 0;
    let maxBalance = balance;
    let maxDrawdown = 0;
    let trades = 0;
    let wins = 0;

    for (let i = 50; i < data.length; i++) {
      const currentData = data.slice(0, i + 1);
      const signal = this.generateSignal(currentData);
      signals.push(signal);

      // Execute trades based on signals
      if (signal.type === 'BUY' && position <= 0 && signal.strength > 0.6) {
        position = balance / signal.price;
        balance = 0;
        trades++;
      } else if (signal.type === 'SELL' && position > 0 && signal.strength > 0.6) {
        balance = position * signal.price;
        if (balance > maxBalance) {
          wins++;
        }
        position = 0;
        trades++;

        maxBalance = Math.max(maxBalance, balance);
        const drawdown = (maxBalance - balance) / maxBalance;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    // Close any remaining position
    if (position > 0) {
      balance = position * data[data.length - 1].close;
      trades++;
    }

    const totalReturn = (balance - 10000) / 10000;
    const winRate = trades > 0 ? wins / trades : 0;

    return {
      signals,
      performance: {
        totalTrades: trades,
        winRate,
        totalReturn,
        maxDrawdown
      }
    };
  }

  getConfig(): StrategyConfig {
    return this.config;
  }

  // Static factory methods for creating strategy configurations
  static createDefaultStrategy(): StrategyConfig {
    return {
      name: 'Multi-Indicator Confluence Strategy',
      version: '1.0.0',
      parameters: {
        rsi_period: 14,
        rsi_oversold: 30,
        rsi_overbought: 70,
        macd_fast: 12,
        macd_slow: 26,
        macd_signal: 9,
        ema_short: 12,
        ema_long: 26,
        adx_period: 14,
        adx_threshold: 25,
        signal_threshold: 0.6,
        confluence_required: 2
      }
    };
  }

  static createTrendFollowingStrategy(): StrategyConfig {
    return {
      name: 'Trend Following Strategy',
      version: '1.0.0',
      parameters: {
        ema_fast: 9,
        ema_slow: 21,
        rsi_period: 14,
        rsi_neutral_high: 60,
        rsi_neutral_low: 40,
        adx_period: 14,
        adx_trend_threshold: 30,
        signal_threshold: 0.7,
        trend_confirmation: true
      }
    };
  }
}

export default StrategyRunner;