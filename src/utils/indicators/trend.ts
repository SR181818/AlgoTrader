import { sma, ema, standardDeviation, trueRange, IndicatorResult, MultiValueIndicatorResult } from './base';

/**
 * Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MultiValueIndicatorResult[] {
  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return histogram.map((hist, i) => {
    const macd = macdLine[i + signalPeriod - 1];
    const signal = signalLine[i];
    
    let signalType: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // MACD line crosses above signal line
    if (i > 0 && macd > signal && macdLine[i + signalPeriod - 2] <= signalLine[i - 1]) {
      signalType = 'buy';
      strength = Math.min(Math.abs(hist) / Math.abs(macd), 1);
    }
    // MACD line crosses below signal line
    else if (i > 0 && macd < signal && macdLine[i + signalPeriod - 2] >= signalLine[i - 1]) {
      signalType = 'sell';
      strength = Math.min(Math.abs(hist) / Math.abs(macd), 1);
    }
    
    return {
      values: {
        macd,
        signal,
        histogram: hist
      },
      signal: signalType,
      strength,
      metadata: {
        bullishCross: signalType === 'buy',
        bearishCross: signalType === 'sell',
        aboveZero: macd > 0
      }
    };
  });
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[], 
  period: number = 20, 
  stdDev: number = 2
): MultiValueIndicatorResult[] {
  const smaValues = sma(prices, period);
  const stdValues = standardDeviation(prices, period);
  
  return smaValues.map((middle, i) => {
    const upper = middle + (stdValues[i] * stdDev);
    const lower = middle - (stdValues[i] * stdDev);
    const currentPrice = prices[i + period - 1];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    const bandWidth = (upper - lower) / middle;
    const position = (currentPrice - lower) / (upper - lower);
    
    if (position < 0.1) {
      signal = 'buy';
      strength = (0.1 - position) / 0.1;
    } else if (position > 0.9) {
      signal = 'sell';
      strength = (position - 0.9) / 0.1;
    }
    
    return {
      values: {
        upper,
        middle,
        lower,
        bandwidth: bandWidth,
        position
      },
      signal,
      strength,
      metadata: {
        squeeze: bandWidth < 0.1,
        expansion: bandWidth > 0.2,
        nearUpper: position > 0.8,
        nearLower: position < 0.2
      }
    };
  });
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 14
): IndicatorResult[] {
  const tr = trueRange(high, low, close);
  const atrValues = sma(tr, period);
  
  return atrValues.map((atr, i) => {
    const currentPrice = close[i + period];
    const volatilityPercent = (atr / currentPrice) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // High volatility might indicate trend change
    if (volatilityPercent > 3) {
      strength = Math.min(volatilityPercent / 5, 1);
    }
    
    return {
      value: atr,
      signal,
      strength,
      metadata: {
        volatilityPercent,
        highVolatility: volatilityPercent > 3,
        lowVolatility: volatilityPercent < 1
      }
    };
  });
}

/**
 * Parabolic SAR
 */
export function calculateParabolicSAR(
  high: number[], 
  low: number[], 
  acceleration: number = 0.02, 
  maximum: number = 0.2
): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  
  if (high.length < 2) return result;
  
  let sar = low[0];
  let trend: 'up' | 'down' = 'up';
  let af = acceleration;
  let ep = high[0];
  
  result.push({
    value: sar,
    signal: 'neutral',
    strength: 0,
    metadata: { trend, ep, af }
  });
  
  for (let i = 1; i < high.length; i++) {
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (trend === 'up') {
      sar = sar + af * (ep - sar);
      
      if (high[i] > ep) {
        ep = high[i];
        af = Math.min(af + acceleration, maximum);
      }
      
      if (low[i] <= sar) {
        trend = 'down';
        sar = ep;
        ep = low[i];
        af = acceleration;
        signal = 'sell';
        strength = 0.8;
      }
    } else {
      sar = sar + af * (ep - sar);
      
      if (low[i] < ep) {
        ep = low[i];
        af = Math.min(af + acceleration, maximum);
      }
      
      if (high[i] >= sar) {
        trend = 'up';
        sar = ep;
        ep = high[i];
        af = acceleration;
        signal = 'buy';
        strength = 0.8;
      }
    }
    
    result.push({
      value: sar,
      signal,
      strength,
      metadata: { trend, ep, af, flip: signal !== 'neutral' }
    });
  }
  
  return result;
}

/**
 * Ichimoku Cloud
 */
export function calculateIchimoku(
  high: number[], 
  low: number[], 
  close: number[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): MultiValueIndicatorResult[] {
  const result: MultiValueIndicatorResult[] = [];
  
  for (let i = Math.max(tenkanPeriod, kijunPeriod) - 1; i < high.length; i++) {
    // Tenkan-sen (Conversion Line)
    const tenkanHigh = Math.max(...high.slice(i - tenkanPeriod + 1, i + 1));
    const tenkanLow = Math.min(...low.slice(i - tenkanPeriod + 1, i + 1));
    const tenkanSen = (tenkanHigh + tenkanLow) / 2;
    
    // Kijun-sen (Base Line)
    const kijunHigh = Math.max(...high.slice(i - kijunPeriod + 1, i + 1));
    const kijunLow = Math.min(...low.slice(i - kijunPeriod + 1, i + 1));
    const kijunSen = (kijunHigh + kijunLow) / 2;
    
    // Senkou Span A (Leading Span A)
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    
    // Senkou Span B (Leading Span B)
    let senkouSpanB = 0;
    if (i >= senkouBPeriod - 1) {
      const senkouBHigh = Math.max(...high.slice(i - senkouBPeriod + 1, i + 1));
      const senkouBLow = Math.min(...low.slice(i - senkouBPeriod + 1, i + 1));
      senkouSpanB = (senkouBHigh + senkouBLow) / 2;
    }
    
    // Chikou Span (Lagging Span)
    const chikouSpan = close[i];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Price above cloud and Tenkan above Kijun
    if (close[i] > Math.max(senkouSpanA, senkouSpanB) && tenkanSen > kijunSen) {
      signal = 'buy';
      strength = 0.7;
    }
    // Price below cloud and Tenkan below Kijun
    else if (close[i] < Math.min(senkouSpanA, senkouSpanB) && tenkanSen < kijunSen) {
      signal = 'sell';
      strength = 0.7;
    }
    
    result.push({
      values: {
        tenkanSen,
        kijunSen,
        senkouSpanA,
        senkouSpanB,
        chikouSpan
      },
      signal,
      strength,
      metadata: {
        aboveCloud: close[i] > Math.max(senkouSpanA, senkouSpanB),
        belowCloud: close[i] < Math.min(senkouSpanA, senkouSpanB),
        inCloud: close[i] >= Math.min(senkouSpanA, senkouSpanB) && close[i] <= Math.max(senkouSpanA, senkouSpanB)
      }
    });
  }
  
  return result;
}

/**
 * Average Directional Index (ADX)
 */
export function calculateADX(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 14
): MultiValueIndicatorResult[] {
  const tr = trueRange(high, low, close);
  const result: MultiValueIndicatorResult[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const dmPlus = high[i] - high[i - 1] > low[i - 1] - low[i] ? Math.max(high[i] - high[i - 1], 0) : 0;
    const dmMinus = low[i - 1] - low[i] > high[i] - high[i - 1] ? Math.max(low[i - 1] - low[i], 0) : 0;
    
    if (i >= period) {
      const avgTR = tr.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period;
      const avgDMPlus = Array.from({ length: period }, (_, j) => {
        const idx = i - period + j;
        return high[idx + 1] - high[idx] > low[idx] - low[idx + 1] ? Math.max(high[idx + 1] - high[idx], 0) : 0;
      }).reduce((sum, val) => sum + val, 0) / period;
      
      const avgDMMinus = Array.from({ length: period }, (_, j) => {
        const idx = i - period + j;
        return low[idx] - low[idx + 1] > high[idx + 1] - high[idx] ? Math.max(low[idx] - low[idx + 1], 0) : 0;
      }).reduce((sum, val) => sum + val, 0) / period;
      
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
      
      // Calculate ADX (simplified)
      const adx = i >= period * 2 ? dx : 0; // Simplified ADX calculation
      
      let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
      let strength = 0;
      
      if (adx > 25) {
        if (diPlus > diMinus) {
          signal = 'buy';
          strength = Math.min(adx / 50, 1);
        } else {
          signal = 'sell';
          strength = Math.min(adx / 50, 1);
        }
      }
      
      result.push({
        values: {
          adx,
          diPlus,
          diMinus
        },
        signal,
        strength,
        metadata: {
          strongTrend: adx > 25,
          weakTrend: adx < 20,
          bullish: diPlus > diMinus,
          bearish: diMinus > diPlus
        }
      });
    }
  }
  
  return result;
}