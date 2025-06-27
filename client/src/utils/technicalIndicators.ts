
import { CandleData } from '../types/trading';

export interface IndicatorValue {
  timestamp: number;
  value: number | { [key: string]: number };
}

export interface IndicatorResult {
  name: string;
  values: IndicatorValue[];
  signals: ('buy' | 'sell' | 'neutral')[];
}

export interface AllIndicators {
  [key: string]: IndicatorResult;
}

// Simple Moving Average
export function calculateSMA(data: CandleData[], period: number): number[] {
  const values: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    values.push(sum / period);
  }
  return values;
}

// Exponential Moving Average
export function calculateEMA(data: CandleData[], period: number): number[] {
  const values: number[] = [];
  const multiplier = 2 / (period + 1);
  
  if (data.length === 0) return values;
  
  // Start with SMA for the first value
  const smaSum = data.slice(0, period).reduce((acc, candle) => acc + candle.close, 0);
  values.push(smaSum / period);
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    const ema = (data[i].close - values[values.length - 1]) * multiplier + values[values.length - 1];
    values.push(ema);
  }
  
  return values;
}

// Relative Strength Index
export function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const values: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      values.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      values.push(rsi);
    }
  }
  
  return values;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(data: CandleData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  const signalLine: number[] = [];
  const histogram: number[] = [];
  
  // Calculate MACD line
  const startIndex = Math.max(fastEMA.length - slowEMA.length, 0);
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }
  
  // Calculate signal line (EMA of MACD line)
  if (macdLine.length >= signalPeriod) {
    const macdData = macdLine.map((value, index) => ({
      timestamp: data[index + slowPeriod - 1].timestamp,
      close: value,
      open: value,
      high: value,
      low: value,
      volume: 0
    }));
    
    const signal = calculateEMA(macdData, signalPeriod);
    signalLine.push(...signal);
    
    // Calculate histogram
    for (let i = 0; i < signal.length; i++) {
      histogram.push(macdLine[i + macdLine.length - signal.length] - signal[i]);
    }
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// Bollinger Bands
export function calculateBollingerBands(data: CandleData[], period: number = 20, standardDeviations: number = 2) {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataSlice = data.slice(i, i + period);
    const mean = sma[i];
    const variance = dataSlice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    upper.push(mean + (standardDeviations * stdDev));
    lower.push(mean - (standardDeviations * stdDev));
  }
  
  return {
    upper,
    middle: sma,
    lower
  };
}

// Average Directional Index (ADX)
export function calculateADX(data: CandleData[], period: number = 14): number[] {
  const values: number[] = [];
  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  // Calculate True Range, +DM, and -DM
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;
    const prevClose = data[i - 1].close;
    
    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
    
    // Directional Movement
    const highDiff = high - prevHigh;
    const lowDiff = prevLow - low;
    
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  
  // Calculate smoothed values
  for (let i = period - 1; i < trueRanges.length; i++) {
    const trSum = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const plusDMSum = plusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const minusDMSum = minusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    
    const plusDI = (plusDMSum / trSum) * 100;
    const minusDI = (minusDMSum / trSum) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    values.push(dx);
  }
  
  // Calculate ADX (smoothed DX)
  const adxValues: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const adx = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    adxValues.push(adx);
  }
  
  return adxValues;
}

// Stochastic Oscillator
export function calculateStochastic(data: CandleData[], kPeriod: number = 14, dPeriod: number = 3) {
  const kValues: number[] = [];
  const dValues: number[] = [];
  
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const lowest = Math.min(...slice.map(c => c.low));
    const highest = Math.max(...slice.map(c => c.high));
    const current = data[i].close;
    
    const k = ((current - lowest) / (highest - lowest)) * 100;
    kValues.push(k);
  }
  
  // Calculate %D (SMA of %K)
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const d = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
    dValues.push(d);
  }
  
  return {
    k: kValues,
    d: dValues
  };
}

// Williams %R
export function calculateWilliamsR(data: CandleData[], period: number = 14): number[] {
  const values: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest = Math.min(...slice.map(c => c.low));
    const close = data[i].close;
    
    const williamsR = ((highest - close) / (highest - lowest)) * -100;
    values.push(williamsR);
  }
  
  return values;
}

// Generate signals based on indicator values
function generateSignals(indicator: string, values: any[]): ('buy' | 'sell' | 'neutral')[] {
  const signals: ('buy' | 'sell' | 'neutral')[] = [];
  
  switch (indicator) {
    case 'RSI':
      values.forEach(value => {
        if (value < 30) signals.push('buy');
        else if (value > 70) signals.push('sell');
        else signals.push('neutral');
      });
      break;
      
    case 'MACD':
      values.forEach(value => {
        if (typeof value === 'object' && value.histogram) {
          if (value.histogram > 0) signals.push('buy');
          else if (value.histogram < 0) signals.push('sell');
          else signals.push('neutral');
        } else {
          signals.push('neutral');
        }
      });
      break;
      
    case 'ADX':
      values.forEach(value => {
        if (value > 25) signals.push('buy'); // Strong trend
        else signals.push('neutral');
      });
      break;
      
    case 'Stochastic':
      values.forEach(value => {
        if (typeof value === 'object' && value.k) {
          if (value.k < 20) signals.push('buy');
          else if (value.k > 80) signals.push('sell');
          else signals.push('neutral');
        } else {
          signals.push('neutral');
        }
      });
      break;
      
    default:
      values.forEach(() => signals.push('neutral'));
  }
  
  return signals;
}

// Main function to generate all indicators
export function generateAllIndicators(data: CandleData[]): AllIndicators {
  const indicators: AllIndicators = {};
  
  if (data.length < 50) {
    console.warn('Insufficient data for indicators calculation');
    return indicators;
  }
  
  try {
    // EMA 12
    const ema12 = calculateEMA(data, 12);
    indicators['EMA_12'] = {
      name: 'EMA 12',
      values: ema12.map((value, index) => ({
        timestamp: data[data.length - ema12.length + index].timestamp,
        value
      })),
      signals: generateSignals('EMA', ema12)
    };
    
    // EMA 26
    const ema26 = calculateEMA(data, 26);
    indicators['EMA_26'] = {
      name: 'EMA 26',
      values: ema26.map((value, index) => ({
        timestamp: data[data.length - ema26.length + index].timestamp,
        value
      })),
      signals: generateSignals('EMA', ema26)
    };
    
    // RSI
    const rsi = calculateRSI(data, 14);
    indicators['RSI'] = {
      name: 'RSI',
      values: rsi.map((value, index) => ({
        timestamp: data[data.length - rsi.length + index].timestamp,
        value
      })),
      signals: generateSignals('RSI', rsi)
    };
    
    // MACD
    const macd = calculateMACD(data, 12, 26, 9);
    indicators['MACD'] = {
      name: 'MACD',
      values: macd.histogram.map((value, index) => ({
        timestamp: data[data.length - macd.histogram.length + index].timestamp,
        value: {
          macd: macd.macd[macd.macd.length - macd.histogram.length + index],
          signal: macd.signal[index],
          histogram: value
        }
      })),
      signals: generateSignals('MACD', macd.histogram.map(h => ({ histogram: h })))
    };
    
    // ADX
    const adx = calculateADX(data, 14);
    indicators['ADX'] = {
      name: 'ADX',
      values: adx.map((value, index) => ({
        timestamp: data[data.length - adx.length + index].timestamp,
        value
      })),
      signals: generateSignals('ADX', adx)
    };
    
    // Bollinger Bands
    const bb = calculateBollingerBands(data, 20, 2);
    indicators['BollingerBands'] = {
      name: 'Bollinger Bands',
      values: bb.upper.map((value, index) => ({
        timestamp: data[data.length - bb.upper.length + index].timestamp,
        value: {
          upper: bb.upper[index],
          middle: bb.middle[index],
          lower: bb.lower[index]
        }
      })),
      signals: generateSignals('BollingerBands', bb.upper)
    };
    
    // Stochastic
    const stoch = calculateStochastic(data, 14, 3);
    indicators['Stochastic'] = {
      name: 'Stochastic',
      values: stoch.k.map((value, index) => ({
        timestamp: data[data.length - stoch.k.length + index].timestamp,
        value: {
          k: stoch.k[index],
          d: stoch.d[index] || 0
        }
      })),
      signals: generateSignals('Stochastic', stoch.k.map(k => ({ k })))
    };
    
  } catch (error) {
    console.error('Error calculating indicators:', error);
  }
  
  return indicators;
}

// Export individual indicator functions
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateADX,
  calculateStochastic,
  calculateWilliamsR
};
