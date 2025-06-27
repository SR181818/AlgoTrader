
// Browser-compatible technical indicators implementation
export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface TechnicalIndicators {
  SMA: (values: number[], period: number) => number[];
  EMA: (values: number[], period: number) => number[];
  RSI: (values: number[], period: number) => number[];
  MACD: (values: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    MACD: number[];
    signal: number[];
    histogram: number[];
  };
  BollingerBands: (values: number[], period: number, stdDev: number) => {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  Stochastic: (high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number) => {
    k: number[];
    d: number[];
  };
  ATR: (high: number[], low: number[], close: number[], period: number) => number[];
  ADX: (high: number[], low: number[], close: number[], period: number) => number[];
  CCI: (high: number[], low: number[], close: number[], period: number) => number[];
  Williams: (high: number[], low: number[], close: number[], period: number) => number[];
}

// Simple Moving Average
function SMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

// Exponential Moving Average
function EMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  if (values.length === 0) return result;
  
  result[0] = values[0];
  
  for (let i = 1; i < values.length; i++) {
    result[i] = (values[i] * multiplier) + (result[i - 1] * (1 - multiplier));
  }
  
  return result.slice(period - 1);
}

// Relative Strength Index
function RSI(values: number[], period: number): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const avgGains = SMA(gains, period);
  const avgLosses = SMA(losses, period);
  
  for (let i = 0; i < avgGains.length; i++) {
    if (avgLosses[i] === 0) {
      result.push(100);
    } else {
      const rs = avgGains[i] / avgLosses[i];
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}

// MACD
function MACD(values: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const fastEMA = EMA(values, fastPeriod);
  const slowEMA = EMA(values, slowPeriod);
  
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }
  
  const signalLine = EMA(macdLine, signalPeriod);
  const histogram: number[] = [];
  
  const signalStartIndex = signalPeriod - 1;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalStartIndex] - signalLine[i]);
  }
  
  return {
    MACD: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// Bollinger Bands
function BollingerBands(values: number[], period: number, stdDev: number) {
  const sma = SMA(values, period);
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const slice = values.slice(i, i + period);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    middle.push(mean);
    upper.push(mean + (standardDeviation * stdDev));
    lower.push(mean - (standardDeviation * stdDev));
  }
  
  return { upper, middle, lower };
}

// Stochastic Oscillator
function Stochastic(high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number) {
  const k: number[] = [];
  
  for (let i = kPeriod - 1; i < close.length; i++) {
    const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));
    
    if (highestHigh === lowestLow) {
      k.push(50);
    } else {
      k.push(((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
    }
  }
  
  const d = SMA(k, dPeriod);
  
  return { k, d };
}

// Average True Range
function ATR(high: number[], low: number[], close: number[], period: number): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return SMA(trueRanges, period);
}

// Average Directional Index
function ADX(high: number[], low: number[], close: number[], period: number): number[] {
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  
  const atr = ATR(high, low, close, period);
  const smoothedPlusDM = SMA(plusDM, period);
  const smoothedMinusDM = SMA(minusDM, period);
  
  const adx: number[] = [];
  
  for (let i = 0; i < Math.min(smoothedPlusDM.length, atr.length); i++) {
    if (atr[i] === 0) {
      adx.push(0);
      continue;
    }
    
    const plusDI = (smoothedPlusDM[i] / atr[i]) * 100;
    const minusDI = (smoothedMinusDM[i] / atr[i]) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    adx.push(dx);
  }
  
  return SMA(adx, period);
}

// Commodity Channel Index
function CCI(high: number[], low: number[], close: number[], period: number): number[] {
  const typicalPrices: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    typicalPrices.push((high[i] + low[i] + close[i]) / 3);
  }
  
  const sma = SMA(typicalPrices, period);
  const result: number[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const slice = typicalPrices.slice(i, i + period);
    const mean = sma[i];
    const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / period;
    
    if (meanDeviation === 0) {
      result.push(0);
    } else {
      result.push((typicalPrices[i + period - 1] - mean) / (0.015 * meanDeviation));
    }
  }
  
  return result;
}

// Williams %R
function Williams(high: number[], low: number[], close: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = period - 1; i < close.length; i++) {
    const highestHigh = Math.max(...high.slice(i - period + 1, i + 1));
    const lowestLow = Math.min(...low.slice(i - period + 1, i + 1));
    
    if (highestHigh === lowestLow) {
      result.push(-50);
    } else {
      result.push(((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100);
    }
  }
  
  return result;
}

export const technicalIndicators: TechnicalIndicators = {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  Stochastic,
  ATR,
  ADX,
  CCI,
  Williams
};

// Helper function to calculate all indicators for backtesting
export function calculateIndicators(candles: OHLCV[]): any {
  if (candles.length < 50) {
    console.warn('Not enough data for reliable indicators');
    return {};
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const opens = candles.map(c => c.open);
  const volumes = candles.map(c => c.volume);

  try {
    return {
      EMA_12: technicalIndicators.EMA(closes, 12),
      EMA_26: technicalIndicators.EMA(closes, 26),
      SMA_20: technicalIndicators.SMA(closes, 20),
      RSI: technicalIndicators.RSI(closes, 14),
      MACD: technicalIndicators.MACD(closes, 12, 26, 9),
      BollingerBands: technicalIndicators.BollingerBands(closes, 20, 2),
      Stochastic: technicalIndicators.Stochastic(highs, lows, closes, 14, 3),
      ATR: technicalIndicators.ATR(highs, lows, closes, 14),
      ADX: technicalIndicators.ADX(highs, lows, closes, 14),
      CCI: technicalIndicators.CCI(highs, lows, closes, 20),
      Williams: technicalIndicators.Williams(highs, lows, closes, 14)
    };
  } catch (error) {
    console.error('Error calculating indicators:', error);
    return {};
  }
}

export default technicalIndicators;
