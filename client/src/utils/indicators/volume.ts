import { sma, ema, typicalPrice, vwap, IndicatorResult, MultiValueIndicatorResult } from './base';

/**
 * On-Balance Volume (OBV)
 */
export function calculateOBV(close: number[], volume: number[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let obv = 0;
  
  result.push({
    value: obv,
    signal: 'neutral',
    strength: 0,
    metadata: { trend: 'neutral' }
  });
  
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) {
      obv += volume[i];
    } else if (close[i] < close[i - 1]) {
      obv -= volume[i];
    }
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Compare with previous OBV values to determine trend
    if (i >= 10) {
      const recentOBV = result.slice(-10).map(r => r.value);
      const obvTrend = obv > Math.max(...recentOBV);
      const priceTrend = close[i] > close[i - 10];
      
      // Divergence analysis
      if (obvTrend && priceTrend) {
        signal = 'buy';
        strength = 0.6;
      } else if (!obvTrend && !priceTrend) {
        signal = 'sell';
        strength = 0.6;
      } else if (obvTrend && !priceTrend) {
        signal = 'buy'; // Bullish divergence
        strength = 0.8;
      } else if (!obvTrend && priceTrend) {
        signal = 'sell'; // Bearish divergence
        strength = 0.8;
      }
    }
    
    result.push({
      value: obv,
      signal,
      strength,
      metadata: {
        trend: obv > result[i - 1].value ? 'up' : obv < result[i - 1].value ? 'down' : 'neutral',
        volume: volume[i]
      }
    });
  }
  
  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(
  high: number[], 
  low: number[], 
  close: number[], 
  volume: number[]
): IndicatorResult[] {
  const vwapValues = vwap(high, low, close, volume);
  
  return vwapValues.map((vwapValue, i) => {
    const currentPrice = close[i];
    const deviation = ((currentPrice - vwapValue) / vwapValue) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (deviation < -2) {
      signal = 'buy';
      strength = Math.min(Math.abs(deviation) / 5, 1);
    } else if (deviation > 2) {
      signal = 'sell';
      strength = Math.min(deviation / 5, 1);
    }
    
    return {
      value: vwapValue,
      signal,
      strength,
      metadata: {
        deviation,
        aboveVWAP: currentPrice > vwapValue,
        belowVWAP: currentPrice < vwapValue
      }
    };
  });
}

/**
 * Accumulation/Distribution Line (A/D Line)
 */
export function calculateADLine(
  high: number[], 
  low: number[], 
  close: number[], 
  volume: number[]
): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let adLine = 0;
  
  for (let i = 0; i < close.length; i++) {
    const clv = ((close[i] - low[i]) - (high[i] - close[i])) / (high[i] - low[i]);
    const moneyFlowVolume = clv * volume[i];
    adLine += moneyFlowVolume;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Trend analysis
    if (i >= 10) {
      const recentAD = result.slice(-10).map(r => r.value);
      const adTrend = adLine > Math.max(...recentAD);
      const priceTrend = close[i] > close[i - 10];
      
      if (adTrend && priceTrend) {
        signal = 'buy';
        strength = 0.6;
      } else if (!adTrend && !priceTrend) {
        signal = 'sell';
        strength = 0.6;
      }
    }
    
    result.push({
      value: adLine,
      signal,
      strength,
      metadata: {
        clv,
        moneyFlowVolume,
        trend: i > 0 ? (adLine > result[i - 1].value ? 'up' : 'down') : 'neutral'
      }
    });
  }
  
  return result;
}

/**
 * Chaikin Money Flow (CMF)
 */
export function calculateCMF(
  high: number[], 
  low: number[], 
  close: number[], 
  volume: number[], 
  period: number = 20
): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  
  for (let i = period - 1; i < close.length; i++) {
    let sumMoneyFlowVolume = 0;
    let sumVolume = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const clv = ((close[j] - low[j]) - (high[j] - close[j])) / (high[j] - low[j]);
      const moneyFlowVolume = clv * volume[j];
      sumMoneyFlowVolume += moneyFlowVolume;
      sumVolume += volume[j];
    }
    
    const cmf = sumMoneyFlowVolume / sumVolume;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (cmf > 0.1) {
      signal = 'buy';
      strength = Math.min(cmf / 0.3, 1);
    } else if (cmf < -0.1) {
      signal = 'sell';
      strength = Math.min(Math.abs(cmf) / 0.3, 1);
    }
    
    result.push({
      value: cmf,
      signal,
      strength,
      metadata: {
        bullish: cmf > 0,
        bearish: cmf < 0,
        strong: Math.abs(cmf) > 0.2
      }
    });
  }
  
  return result;
}

/**
 * Volume Rate of Change (VROC)
 */
export function calculateVROC(volume: number[], period: number = 12): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  
  for (let i = period; i < volume.length; i++) {
    const vroc = ((volume[i] - volume[i - period]) / volume[i - period]) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (vroc > 50) {
      signal = 'buy';
      strength = Math.min(vroc / 100, 1);
    } else if (vroc < -50) {
      signal = 'sell';
      strength = Math.min(Math.abs(vroc) / 100, 1);
    }
    
    result.push({
      value: vroc,
      signal,
      strength,
      metadata: {
        highVolume: vroc > 50,
        lowVolume: vroc < -50,
        normal: Math.abs(vroc) <= 50
      }
    });
  }
  
  return result;
}

/**
 * Price Volume Trend (PVT)
 */
export function calculatePVT(close: number[], volume: number[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let pvt = 0;
  
  result.push({
    value: pvt,
    signal: 'neutral',
    strength: 0,
    metadata: { trend: 'neutral' }
  });
  
  for (let i = 1; i < close.length; i++) {
    const priceChange = (close[i] - close[i - 1]) / close[i - 1];
    pvt += priceChange * volume[i];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Trend analysis
    if (i >= 10) {
      const recentPVT = result.slice(-10).map(r => r.value);
      const pvtTrend = pvt > Math.max(...recentPVT);
      const priceTrend = close[i] > close[i - 10];
      
      if (pvtTrend && priceTrend) {
        signal = 'buy';
        strength = 0.6;
      } else if (!pvtTrend && !priceTrend) {
        signal = 'sell';
        strength = 0.6;
      }
    }
    
    result.push({
      value: pvt,
      signal,
      strength,
      metadata: {
        trend: pvt > result[i - 1].value ? 'up' : pvt < result[i - 1].value ? 'down' : 'neutral',
        priceChange,
        volume: volume[i]
      }
    });
  }
  
  return result;
}