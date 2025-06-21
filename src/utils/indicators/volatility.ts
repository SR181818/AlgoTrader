import { sma, standardDeviation, trueRange, IndicatorResult, MultiValueIndicatorResult } from './base';

/**
 * Bollinger Band Width
 */
export function calculateBBWidth(
  prices: number[], 
  period: number = 20, 
  stdDev: number = 2
): IndicatorResult[] {
  const smaValues = sma(prices, period);
  const stdValues = standardDeviation(prices, period);
  
  return smaValues.map((middle, i) => {
    const upper = middle + (stdValues[i] * stdDev);
    const lower = middle - (stdValues[i] * stdDev);
    const width = ((upper - lower) / middle) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // Low width indicates potential breakout
    if (width < 10) {
      signal = 'buy'; // Anticipating breakout
      strength = (10 - width) / 10;
    }
    
    return {
      value: width,
      signal,
      strength,
      metadata: {
        squeeze: width < 10,
        expansion: width > 20,
        normal: width >= 10 && width <= 20
      }
    };
  });
}

/**
 * Keltner Channels
 */
export function calculateKeltnerChannels(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 20, 
  multiplier: number = 2
): MultiValueIndicatorResult[] {
  const typicalPrices = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const emaValues = sma(typicalPrices, period); // Using SMA for simplicity
  const atrValues = trueRange(high, low, close);
  const atrSMA = sma(atrValues, period);
  
  return emaValues.map((middle, i) => {
    const atr = atrSMA[i];
    const upper = middle + (atr * multiplier);
    const lower = middle - (atr * multiplier);
    const currentPrice = close[i + period - 1];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (currentPrice <= lower) {
      signal = 'buy';
      strength = (lower - currentPrice) / atr;
    } else if (currentPrice >= upper) {
      signal = 'sell';
      strength = (currentPrice - upper) / atr;
    }
    
    return {
      values: {
        upper,
        middle,
        lower,
        width: upper - lower
      },
      signal,
      strength,
      metadata: {
        aboveUpper: currentPrice > upper,
        belowLower: currentPrice < lower,
        inChannel: currentPrice >= lower && currentPrice <= upper
      }
    };
  });
}

/**
 * Donchian Channels
 */
export function calculateDonchianChannels(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 20
): MultiValueIndicatorResult[] {
  const result: MultiValueIndicatorResult[] = [];
  
  for (let i = period - 1; i < high.length; i++) {
    const upperChannel = Math.max(...high.slice(i - period + 1, i + 1));
    const lowerChannel = Math.min(...low.slice(i - period + 1, i + 1));
    const middleChannel = (upperChannel + lowerChannel) / 2;
    const currentPrice = close[i];
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (currentPrice >= upperChannel) {
      signal = 'buy';
      strength = 0.8;
    } else if (currentPrice <= lowerChannel) {
      signal = 'sell';
      strength = 0.8;
    }
    
    result.push({
      values: {
        upper: upperChannel,
        middle: middleChannel,
        lower: lowerChannel,
        width: upperChannel - lowerChannel
      },
      signal,
      strength,
      metadata: {
        breakoutUp: currentPrice >= upperChannel,
        breakoutDown: currentPrice <= lowerChannel,
        inRange: currentPrice > lowerChannel && currentPrice < upperChannel
      }
    });
  }
  
  return result;
}

/**
 * Average True Range Percent (ATR%)
 */
export function calculateATRPercent(
  high: number[], 
  low: number[], 
  close: number[], 
  period: number = 14
): IndicatorResult[] {
  const tr = trueRange(high, low, close);
  const atrValues = sma(tr, period);
  
  return atrValues.map((atr, i) => {
    const currentPrice = close[i + period];
    const atrPercent = (atr / currentPrice) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    // High volatility might indicate trend change opportunity
    if (atrPercent > 3) {
      strength = Math.min(atrPercent / 5, 1);
    }
    
    return {
      value: atrPercent,
      signal,
      strength,
      metadata: {
        highVolatility: atrPercent > 3,
        lowVolatility: atrPercent < 1,
        normalVolatility: atrPercent >= 1 && atrPercent <= 3,
        atrValue: atr
      }
    };
  });
}

/**
 * Volatility Index (VIX-like calculation)
 */
export function calculateVolatilityIndex(
  close: number[], 
  period: number = 20
): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  
  for (let i = period; i < close.length; i++) {
    const returns = [];
    for (let j = i - period + 1; j <= i; j++) {
      returns.push(Math.log(close[j] / close[j - 1]));
    }
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252) * 100; // Annualized volatility
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (volatility > 30) {
      signal = 'sell'; // High volatility often indicates fear
      strength = Math.min(volatility / 50, 1);
    } else if (volatility < 10) {
      signal = 'buy'; // Low volatility might indicate complacency
      strength = (10 - volatility) / 10;
    }
    
    result.push({
      value: volatility,
      signal,
      strength,
      metadata: {
        highVolatility: volatility > 30,
        lowVolatility: volatility < 10,
        fearLevel: volatility > 40,
        complacencyLevel: volatility < 8
      }
    });
  }
  
  return result;
}

/**
 * Chaikin Volatility
 */
export function calculateChaikinVolatility(
  high: number[], 
  low: number[], 
  period: number = 10, 
  rocPeriod: number = 10
): IndicatorResult[] {
  const hlSpread = high.map((h, i) => h - low[i]);
  const emaSpread = sma(hlSpread, period); // Using SMA for simplicity
  
  const result: IndicatorResult[] = [];
  
  for (let i = rocPeriod; i < emaSpread.length; i++) {
    const chaikinVol = ((emaSpread[i] - emaSpread[i - rocPeriod]) / emaSpread[i - rocPeriod]) * 100;
    
    let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let strength = 0;
    
    if (chaikinVol > 20) {
      signal = 'sell'; // Increasing volatility
      strength = Math.min(chaikinVol / 40, 1);
    } else if (chaikinVol < -20) {
      signal = 'buy'; // Decreasing volatility
      strength = Math.min(Math.abs(chaikinVol) / 40, 1);
    }
    
    result.push({
      value: chaikinVol,
      signal,
      strength,
      metadata: {
        increasingVolatility: chaikinVol > 0,
        decreasingVolatility: chaikinVol < 0,
        significantChange: Math.abs(chaikinVol) > 20
      }
    });
  }
  
  return result;
}