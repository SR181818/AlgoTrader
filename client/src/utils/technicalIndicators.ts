import { CandleData } from '../types/trading';

export interface IndicatorResult {
  name: string;
  values: number[];
  signals?: ('buy' | 'sell' | 'neutral')[];
  timestamp: number[];
}

/**
 * Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema.push(sum / Math.min(period, prices.length));

  // Calculate EMA for rest
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * Relative Strength Index
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial averages
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    rsi.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  // Calculate subsequent RSI values
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);

  // Align arrays (emaSlow starts later)
  const startIndex = slowPeriod - fastPeriod;
  const macdLine: number[] = [];

  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + startIndex] - emaSlow[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i - (signalPeriod - 1)]);
  }

  return {
    MACD: macdLine.slice(signalPeriod - 1),
    signal: signalLine,
    histogram: histogram
  };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const middle = sma;

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
    const std = Math.sqrt(variance);

    const smaIndex = i - period + 1;
    upper.push(sma[smaIndex] + (std * stdDev));
    lower.push(sma[smaIndex] - (std * stdDev));
  }

  return {
    upper: upper,
    middle: middle,
    lower: lower
  };
}

/**
 * Average True Range
 */
export function calculateATR(candles: CandleData[], period: number = 14): number[] {
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Generate all indicators for a given dataset
 */
export function generateAllIndicators(candles: CandleData[]) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const timestamps = candles.map(c => c.timestamp);

  // Calculate indicators
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(candles, 14);

  return {
    EMA_20: {
      name: 'EMA_20',
      values: ema20,
      timestamp: timestamps.slice(20 - 1)
    },
    EMA_50: {
      name: 'EMA_50', 
      values: ema50,
      timestamp: timestamps.slice(50 - 1)
    },
    RSI: {
      name: 'RSI',
      values: rsi,
      timestamp: timestamps.slice(14)
    },
    MACD: {
      name: 'MACD',
      values: macd,
      timestamp: timestamps.slice(26 + 9 - 2)
    },
    BBANDS: {
      name: 'BBANDS',
      values: bb,
      timestamp: timestamps.slice(20 - 1)
    },
    ATR: {
      name: 'ATR',
      values: atr,
      timestamp: timestamps.slice(14)
    }
  };
}