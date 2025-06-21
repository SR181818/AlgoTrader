/**
 * Base utility functions for technical indicators
 */

export interface IndicatorResult {
  value: number;
  signal?: 'buy' | 'sell' | 'neutral';
  strength?: number; // 0-1 scale
  metadata?: Record<string, any>;
}

export interface MultiValueIndicatorResult {
  values: Record<string, number>;
  signal?: 'buy' | 'sell' | 'neutral';
  strength?: number;
  metadata?: Record<string, any>;
}

/**
 * Simple Moving Average
 */
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Exponential Moving Average
 */
export function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
  }
  return result;
}

/**
 * Weighted Moving Average
 */
export function wma(data: number[], period: number): number[] {
  const result: number[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  
  for (let i = period - 1; i < data.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      weightedSum += data[i - period + 1 + j] * weights[j];
    }
    result.push(weightedSum / weightSum);
  }
  return result;
}

/**
 * Standard Deviation
 */
export function standardDeviation(data: number[], period: number): number[] {
  const result: number[] = [];
  const smaValues = sma(data, period);
  
  for (let i = 0; i < smaValues.length; i++) {
    const dataSlice = data.slice(i, i + period);
    const mean = smaValues[i];
    const squaredDiffs = dataSlice.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    result.push(Math.sqrt(variance));
  }
  
  return result;
}

/**
 * True Range calculation
 */
export function trueRange(high: number[], low: number[], close: number[]): number[] {
  const tr: number[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    tr.push(Math.max(tr1, tr2, tr3));
  }
  
  return tr;
}

/**
 * Highest value in period
 */
export function highest(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    result.push(Math.max(...slice));
  }
  return result;
}

/**
 * Lowest value in period
 */
export function lowest(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    result.push(Math.min(...slice));
  }
  return result;
}

/**
 * Rate of Change
 */
export function roc(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period; i < data.length; i++) {
    const change = ((data[i] - data[i - period]) / data[i - period]) * 100;
    result.push(change);
  }
  return result;
}

/**
 * Money Flow Index calculation helper
 */
export function typicalPrice(high: number[], low: number[], close: number[]): number[] {
  return high.map((h, i) => (h + low[i] + close[i]) / 3);
}

/**
 * Volume-weighted calculations
 */
export function vwap(high: number[], low: number[], close: number[], volume: number[]): number[] {
  const result: number[] = [];
  let cumulativeVolumePrice = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < close.length; i++) {
    const tp = (high[i] + low[i] + close[i]) / 3;
    cumulativeVolumePrice += tp * volume[i];
    cumulativeVolume += volume[i];
    result.push(cumulativeVolumePrice / cumulativeVolume);
  }
  
  return result;
}