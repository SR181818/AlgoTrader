import { CandleData, TechnicalIndicators } from '../types/trading';

// Simple Moving Average
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

// Exponential Moving Average
export function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier));
  }
  return result;
}

// Standard Deviation
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

// Bollinger Bands with expansion detection
export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const smaValues = sma(prices, period);
  const stdValues = standardDeviation(prices, period);
  
  const upper = smaValues.map((sma, i) => sma + (stdValues[i] * stdDev));
  const middle = smaValues;
  const lower = smaValues.map((sma, i) => sma - (stdValues[i] * stdDev));
  
  // Calculate band expansion
  const bandWidth = upper.map((u, i) => (u - lower[i]) / middle[i]);
  const avgBandWidth = bandWidth.slice(-20).reduce((sum, bw) => sum + bw, 0) / 20;
  const currentBandWidth = bandWidth[bandWidth.length - 1];
  
  let expansion: 'expanding' | 'contracting' | 'normal' = 'normal';
  if (currentBandWidth > avgBandWidth * 1.2) expansion = 'expanding';
  else if (currentBandWidth < avgBandWidth * 0.8) expansion = 'contracting';
  
  return { upper, middle, lower, expansion };
}

// MACD with trend analysis
export function calculateMACD(prices: number[], fastPeriod: number = 34, slowPeriod: number = 144, signalPeriod: number = 9) {
  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return { macdLine, signalLine, histogram };
}

// RSI
export function calculateRSI(prices: number[], period: number = 14): number[] {
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
    return 100 - (100 / (1 + rs));
  });
}

// Stochastic RSI
export function calculateStochasticRSI(prices: number[], rsiPeriod: number = 20, stochPeriod: number = 1): { k: number[], d: number[] } {
  const rsiValues = calculateRSI(prices, rsiPeriod);
  
  const k: number[] = [];
  
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const rsiSlice = rsiValues.slice(i - stochPeriod + 1, i + 1);
    const minRSI = Math.min(...rsiSlice);
    const maxRSI = Math.max(...rsiSlice);
    
    const stochRSI = maxRSI !== minRSI ? ((rsiValues[i] - minRSI) / (maxRSI - minRSI)) * 100 : 50;
    k.push(stochRSI);
  }
  
  const d = sma(k, 1);
  
  return { k, d };
}

// ATR (Average True Range)
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
  
  return sma(trueRanges, period);
}

// Parabolic SAR
export function calculateSAR(candles: CandleData[], acceleration: number = 0.02, maximum: number = 0.2): { values: number[], trend: ('bullish' | 'bearish')[] } {
  const values: number[] = [];
  const trends: ('bullish' | 'bearish')[] = [];
  
  if (candles.length < 2) return { values: [], trend: [] };
  
  let sar = candles[0].low;
  let trend: 'bullish' | 'bearish' = 'bullish';
  let af = acceleration;
  let ep = candles[0].high;
  
  values.push(sar);
  trends.push(trend);
  
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    
    if (trend === 'bullish') {
      sar = sar + af * (ep - sar);
      
      if (candle.high > ep) {
        ep = candle.high;
        af = Math.min(af + acceleration, maximum);
      }
      
      if (candle.low <= sar) {
        trend = 'bearish';
        sar = ep;
        ep = candle.low;
        af = acceleration;
      }
    } else {
      sar = sar + af * (ep - sar);
      
      if (candle.low < ep) {
        ep = candle.low;
        af = Math.min(af + acceleration, maximum);
      }
      
      if (candle.high >= sar) {
        trend = 'bullish';
        sar = ep;
        ep = candle.high;
        af = acceleration;
      }
    }
    
    values.push(sar);
    trends.push(trend);
  }
  
  return { values, trend: trends };
}

// Klinger Oscillator (simplified version)
export function calculateKlinger(candles: CandleData[], fastPeriod: number = 34, slowPeriod: number = 55, signalPeriod: number = 13) {
  const volumeForce: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const typicalPrice = (current.high + current.low + current.close) / 3;
    const prevTypicalPrice = (previous.high + previous.low + previous.close) / 3;
    
    const dm = current.high - current.low;
    const cm = typicalPrice > prevTypicalPrice ? 1 : -1;
    
    volumeForce.push(current.volume * cm * dm);
  }
  
  const fastEMA = ema(volumeForce, fastPeriod);
  const slowEMA = ema(volumeForce, slowPeriod);
  const klinger = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signal = ema(klinger, signalPeriod);
  
  return { klinger, signal };
}

// Main indicator calculation function
export function calculateIndicators(candles: CandleData[], config?: any): TechnicalIndicators | null {
  if (candles.length < 144) return null;
  
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = closes[closes.length - 1];
  
  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  const bbCurrent = {
    upper: bb.upper[bb.upper.length - 1],
    middle: bb.middle[bb.middle.length - 1],
    lower: bb.lower[bb.lower.length - 1],
    expansion: bb.expansion
  };
  
  let bbPosition: TechnicalIndicators['bb']['position'] = 'middle';
  const tolerance = (bbCurrent.upper - bbCurrent.lower) * 0.01; // 1% tolerance
  
  if (currentPrice >= bbCurrent.upper - tolerance) bbPosition = 'at_upper';
  else if (currentPrice > bbCurrent.upper) bbPosition = 'above_upper';
  else if (currentPrice <= bbCurrent.lower + tolerance) bbPosition = 'at_lower';
  else if (currentPrice < bbCurrent.lower) bbPosition = 'below_lower';
  
  // MACD
  const macd = calculateMACD(closes, 34, 144, 9);
  const macdCurrent = {
    macdLine: macd.macdLine[macd.macdLine.length - 1],
    signalLine: macd.signalLine[macd.signalLine.length - 1],
    histogram: macd.histogram[macd.histogram.length - 1]
  };
  
  const prevHistogram = macd.histogram[macd.histogram.length - 2];
  let macdTrend: TechnicalIndicators['macd']['trend'] = 'expanding_green';
  
  if (macdCurrent.histogram < 0 && Math.abs(macdCurrent.histogram) < Math.abs(prevHistogram)) {
    macdTrend = 'contracting_red';
  } else if (macdCurrent.histogram > 0 && macdCurrent.histogram < prevHistogram) {
    macdTrend = 'contracting_green';
  } else if (macdCurrent.histogram < 0) {
    macdTrend = 'expanding_red';
  }
  
  // Stochastic RSI
  const stochRsi = calculateStochasticRSI(closes, 20, 1);
  const stochCurrent = {
    k: stochRsi.k[stochRsi.k.length - 1],
    d: stochRsi.d[stochRsi.d.length - 1]
  };
  const prevStochK = stochRsi.k[stochRsi.k.length - 2];
  const prevStochD = stochRsi.d[stochRsi.d.length - 2];
  
  let stochCross: TechnicalIndicators['stochRsi']['cross'] = 'none';
  if (prevStochK <= prevStochD && stochCurrent.k > stochCurrent.d && stochCurrent.k < 20) {
    stochCross = 'bullish_cross';
  } else if (prevStochK >= prevStochD && stochCurrent.k < stochCurrent.d && stochCurrent.k > 80) {
    stochCross = 'bearish_cross';
  }
  
  let stochZone: TechnicalIndicators['stochRsi']['zone'] = 'neutral';
  if (stochCurrent.k < 20) stochZone = 'oversold';
  else if (stochCurrent.k > 80) stochZone = 'overbought';
  
  // RSI
  const rsiValues = calculateRSI(closes, 14);
  const rsi = rsiValues[rsiValues.length - 1];
  
  // ATR
  const atrValues = calculateATR(candles, 14);
  const atr = atrValues[atrValues.length - 1];
  
  // SAR
  const sarData = calculateSAR(candles);
  const sarCurrent = sarData.values[sarData.values.length - 1];
  const sarTrend = sarData.trend[sarData.trend.length - 1];
  const prevSarTrend = sarData.trend[sarData.trend.length - 2];
  const sarFlip = sarTrend !== prevSarTrend;
  
  // Klinger
  const klingerData = calculateKlinger(candles);
  const klingerCurrent = klingerData.klinger[klingerData.klinger.length - 1];
  const klingerSignal = klingerData.signal[klingerData.signal.length - 1];
  const prevKlinger = klingerData.klinger[klingerData.klinger.length - 2];
  
  let klingerTrend: 'uptick' | 'downtick' | 'neutral' = 'neutral';
  if (klingerCurrent > prevKlinger && klingerCurrent > klingerSignal) klingerTrend = 'uptick';
  else if (klingerCurrent < prevKlinger && klingerCurrent < klingerSignal) klingerTrend = 'downtick';
  
  return {
    bb: {
      upper: bbCurrent.upper,
      middle: bbCurrent.middle,
      lower: bbCurrent.lower,
      position: bbPosition,
      expansion: bbCurrent.expansion
    },
    macd: {
      macdLine: macdCurrent.macdLine,
      signalLine: macdCurrent.signalLine,
      histogram: macdCurrent.histogram,
      trend: macdTrend
    },
    stochRsi: {
      k: stochCurrent.k,
      d: stochCurrent.d,
      cross: stochCross,
      zone: stochZone
    },
    rsi,
    atr,
    sar: {
      value: sarCurrent,
      trend: sarTrend,
      flip: sarFlip
    },
    klinger: {
      value: klingerCurrent,
      signal: klingerSignal,
      trend: klingerTrend
    }
  };
}