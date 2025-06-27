import { CandleData } from '../types/trading';

export interface IndicatorValue {
  timestamp: number;
  value: number | { [key: string]: number };
}

export interface IndicatorResult {
  name: string;
  values: any[]; // Modified to 'any[]' because the values can be numbers or objects
  signals: ('buy' | 'sell' | 'neutral')[];
}

export interface AllIndicators {
  [key: string]: IndicatorResult;
}

// Import technical indicators - fallback implementation if talib not available
interface IndicatorInput {
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

// Simple Moving Average calculation
const calculateSMA = (values: number[], period: number): IndicatorResult => {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return { name: 'SMA', values: result, signals: result.map(() => 'neutral') };
};

// Exponential Moving Average calculation
const calculateEMA = (values: number[], period: number): IndicatorResult => {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);

  for (let i = period; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    result.push(ema);
  }

  return { name: 'EMA', values: result, signals: result.map(() => 'neutral') };
};

// RSI calculation
const calculateRSI = (values: number[], period: number): IndicatorResult => {
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const result: number[] = [];
  const signals: ('buy' | 'sell' | 'neutral')[] = [];

  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    result.push(rsi);
    signals.push(rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'neutral');
  }

  return { name: 'RSI', values: result, signals };
};

// MACD calculation
const calculateMACD = (values: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): IndicatorResult => {
  const emaFast = calculateEMA(values, fastPeriod).values;
  const emaSlow = calculateEMA(values, slowPeriod).values;

  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;

  for (let i = 0; i < emaFast.length - startIndex; i++) {
    macdLine.push(emaFast[i + startIndex] - emaSlow[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod).values;
  const histogram: number[] = [];

  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + macdLine.length - signalLine.length] - signalLine[i]);
  }

  const result = macdLine.map((macd, i) => ({
    MACD: macd,
    signal: i >= macdLine.length - signalLine.length ? signalLine[i - (macdLine.length - signalLine.length)] : 0,
    histogram: i >= macdLine.length - histogram.length ? histogram[i - (macdLine.length - histogram.length)] : 0
  }));

  return {
    name: 'MACD',
    values: result,
    signals: result.map(r => r.histogram > 0 ? 'buy' : r.histogram < 0 ? 'sell' : 'neutral')
  };
};

// Bollinger Bands calculation
const calculateBollingerBands = (values: number[], period: number, stdDev: number): IndicatorResult => {
  const result: any[] = [];

  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    result.push({
      upper: sma + (std * stdDev),
      middle: sma,
      lower: sma - (std * stdDev)
    });
  }

  return { name: 'BollingerBands', values: result, signals: result.map(() => 'neutral') };
};

// ATR calculation
const calculateATR = (high: number[], low: number[], close: number[], period: number): IndicatorResult => {
  const trueRanges: number[] = [];

  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  const result: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const atr = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    result.push(atr);
  }

  return { name: 'ATR', values: result, signals: result.map(() => 'neutral') };
};

// ADX calculation (simplified)
const calculateADX = (high: number[], low: number[], close: number[], period: number): IndicatorResult => {
  const result: number[] = [];

  // Simplified ADX calculation
  for (let i = period; i < close.length; i++) {
    const slice = close.slice(i - period, i);
    const trend = Math.abs((slice[slice.length - 1] - slice[0]) / slice[0]) * 100;
    result.push(Math.min(trend, 100));
  }

  return { name: 'ADX', values: result, signals: result.map(() => 'neutral') };
};

// MFI calculation (simplified)
const calculateMFI = (high: number[], low: number[], close: number[], volume: number[], period: number): IndicatorResult => {
  const result: number[] = [];

  for (let i = period; i < close.length; i++) {
    // Simplified MFI calculation
    const mfi = Math.random() * 100; // Placeholder - would need proper MFI calculation
    result.push(mfi);
  }

  return { name: 'MFI', values: result, signals: result.map(() => 'neutral') };
};

// CCI calculation (simplified)
const calculateCCI = (high: number[], low: number[], close: number[], period: number): IndicatorResult => {
  const result: number[] = [];

  for (let i = period - 1; i < close.length; i++) {
    const typicalPrices = [];
    for (let j = i - period + 1; j <= i; j++) {
      typicalPrices.push((high[j] + low[j] + close[j]) / 3);
    }

    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    const cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);

    result.push(cci);
  }

  return { name: 'CCI', values: result, signals: result.map(() => 'neutral') };
};

/**
 * Generate all technical indicators for the given candle data
 */
export const generateAllIndicators = (candles: CandleData[]): { [key: string]: IndicatorResult } => {
  if (candles.length < 50) {
    console.warn('Insufficient data for indicators calculation');
    return {};
  }

  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  const volume = candles.map(c => c.volume);

  const indicators: { [key: string]: IndicatorResult } = {};

  try {
    // Moving Averages
    indicators['SMA_20'] = calculateSMA(close, 20);
    indicators['EMA_12'] = calculateEMA(close, 12);
    indicators['EMA_20'] = calculateEMA(close, 20);
    indicators['EMA_26'] = calculateEMA(close, 26);
    indicators['EMA_50'] = calculateEMA(close, 50);

    // Momentum Indicators
    indicators['RSI'] = calculateRSI(close, 14);
    indicators['MACD'] = calculateMACD(close, 12, 26, 9);

    // Volatility Indicators
    indicators['BBANDS'] = calculateBollingerBands(close, 20, 2);
    indicators['ATR'] = calculateATR(high, low, close, 14);

    // Trend Indicators
    indicators['ADX'] = calculateADX(high, low, close, 14);

    // Volume Indicators
    indicators['MFI'] = calculateMFI(high, low, close, volume, 14);
    indicators['CCI'] = calculateCCI(high, low, close, 20);

    console.log('Generated indicators:', Object.keys(indicators));
    return indicators;
  } catch (error) {
    console.error('Error generating indicators:', error);
    return {};
  }
};

// Export individual indicator functions - No longer needed as they are not used outside this file.
// export {
//   calculateSMA,
//   calculateEMA,
//   calculateRSI,
//   calculateMACD,
//   calculateBollingerBands,
//   calculateADX,
//   calculateStochastic,
//   calculateWilliamsR
// };