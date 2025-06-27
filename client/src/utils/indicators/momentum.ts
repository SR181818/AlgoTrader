import { sma, ema, highest, lowest, roc, IndicatorResult } from './base';

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): IndicatorResult[] {
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
  
  const avgGains = sma(gains, period);
  const avgLosses = sma(losses, period);
  
  return avgGains.map((avgGain, i) => {
    const rs = avgGain / avgLosses[i];
    const rsi = 100 - (100 / (1 + rs));
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (rsi < 30) {
      signal = 'buy';
      strength = (30 - rsi) / 30;
    } else if (rsi > 70) {
      signal = 'sell';
      strength = (rsi - 70) / 30;
    }
    
    return {
      value: rsi,
      signal,
      strength,
      metadata: { oversold: rsi < 30, overbought: rsi > 70 }
    };
  });
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(
  high: number[], 
  low: number[], 
  close: number[], 
  kPeriod: number = 14, 
  dPeriod: number = 3
): { k: IndicatorResult[], d: IndicatorResult[] } {
  const highestHighs = highest(high, kPeriod);
  const lowestLows = lowest(low, kPeriod);
  
  const kValues: IndicatorResult[] = [];
  
  for (let i = 0; i < highestHighs.length; i++) {
    const currentClose = close[i + kPeriod - 1];
    const k = ((currentClose - lowestLows[i]) / (highestHighs[i] - lowestLows[i])) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (k < 20) {
      signal = 'buy';
      strength = (20 - k) / 20;
    } else if (k > 80) {
      signal = 'sell';
      strength = (k - 80) / 20;
    }
    
    kValues.push({
      value: k,
      signal,
      strength,
      metadata: { oversold: k < 20, overbought: k > 80 }
    });
  }
  
  const kNumbers = kValues.map(k => k.value);
  const dNumbers = sma(kNumbers, dPeriod);
  
  const dValues: IndicatorResult[] = dNumbers.map((d, i) => ({
    value: d,
    signal: 'neutral',
    strength: 0,
    metadata: { smoothed: true }
  }));
  
  return { k: kValues, d: dValues };
}

/**
 * Williams %R
 */
export function calculateWilliamsR(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 14
): IndicatorResult[] {
  const highestHighs = highest(high, period);
  const lowestLows = lowest(low, period);
  
  return highestHighs.map((hh, i) => {
    const currentClose = close[i + period - 1];
    const wr = ((hh - currentClose) / (hh - lowestLows[i])) * -100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (wr < -80) {
      signal = 'buy';
      strength = (-80 - wr) / 20;
    } else if (wr > -20) {
      signal = 'sell';
      strength = (wr + 20) / 20;
    }
    
    return {
      value: wr,
      signal,
      strength,
      metadata: { oversold: wr < -80, overbought: wr > -20 }
    };
  });
}

/**
 * Rate of Change (ROC)
 */
export function calculateROC(prices: number[], period: number = 12): IndicatorResult[] {
  const rocValues = roc(prices, period);
  
  return rocValues.map(roc => {
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (roc > 5) {
      signal = 'buy';
      strength = Math.min(roc / 10, 1);
    } else if (roc < -5) {
      signal = 'sell';
      strength = Math.min(Math.abs(roc) / 10, 1);
    }
    
    return {
      value: roc,
      signal,
      strength,
      metadata: { bullish: roc > 0, bearish: roc < 0 }
    };
  });
}

/**
 * Commodity Channel Index (CCI)
 */
export function calculateCCI(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 20
): IndicatorResult[] {
  const typicalPrices = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const smaTP = sma(typicalPrices, period);
  
  const result: IndicatorResult[] = [];
  
  for (let i = 0; i < smaTP.length; i++) {
    const tpSlice = typicalPrices.slice(i, i + period);
    const meanDeviation = tpSlice.reduce((sum, tp) => sum + Math.abs(tp - smaTP[i]), 0) / period;
    const cci = (typicalPrices[i + period - 1] - smaTP[i]) / (0.015 * meanDeviation);
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (cci < -100) {
      signal = 'buy';
      strength = Math.min((-100 - cci) / 100, 1);
    } else if (cci > 100) {
      signal = 'sell';
      strength = Math.min((cci - 100) / 100, 1);
    }
    
    result.push({
      value: cci,
      signal,
      strength,
      metadata: { oversold: cci < -100, overbought: cci > 100 }
    });
  }
  
  return result;
}

/**
 * Money Flow Index (MFI)
 */
export function calculateMFI(
  high: number[], 
  low: number[], 
  close: number[], 
  volume: number[], 
  period: number = 14
): IndicatorResult[] {
  const typicalPrices = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const rawMoneyFlow = typicalPrices.map((tp, i) => tp * volume[i]);
  
  const result: IndicatorResult[] = [];
  
  for (let i = period; i < typicalPrices.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeFlow += rawMoneyFlow[j];
      }
    }
    
    const moneyFlowRatio = positiveFlow / negativeFlow;
    const mfi = 100 - (100 / (1 + moneyFlowRatio));
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (mfi < 20) {
      signal = 'buy';
      strength = (20 - mfi) / 20;
    } else if (mfi > 80) {
      signal = 'sell';
      strength = (mfi - 80) / 20;
    }
    
    result.push({
      value: mfi,
      signal,
      strength,
      metadata: { oversold: mfi < 20, overbought: mfi > 80 }
    });
  }
  
  return result;
}