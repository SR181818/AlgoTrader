// Technical Indicators Implementation
// Pure JavaScript implementation without external dependencies

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  values: number[];
  timestamps: number[];
}

export class TechnicalIndicators {
  // Simple Moving Average
  static sma(prices: number[], period: number): number[] {
    const result: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }

    return result;
  }

  // Exponential Moving Average
  static ema(prices: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    if (prices.length === 0) return result;

    result.push(prices[0]);

    for (let i = 1; i < prices.length; i++) {
      const ema = (prices[i] * multiplier) + (result[i - 1] * (1 - multiplier));
      result.push(ema);
    }

    return result;
  }

  // MACD (Moving Average Convergence Divergence)
  static macd(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.ema(prices, fastPeriod);
    const slowEMA = this.ema(prices, slowPeriod);

    const macdLine: number[] = [];
    const minLength = Math.min(fastEMA.length, slowEMA.length);

    for (let i = 0; i < minLength; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }

    const signalLine = this.ema(macdLine, signalPeriod);
    const histogram: number[] = [];

    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  // RSI (Relative Strength Index)
  static rsi(prices: number[], period = 14): number[] {
    if (prices.length < period + 1) return [];

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGains = this.sma(gains, period);
    const avgLosses = this.sma(losses, period);

    const rsi: number[] = [];
    for (let i = 0; i < avgGains.length; i++) {
      if (avgLosses[i] === 0) {
        rsi.push(100);
      } else {
        const rs = avgGains[i] / avgLosses[i];
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  // Bollinger Bands
  static bollingerBands(prices: number[], period = 20, stdDev = 2) {
    const sma = this.sma(prices, period);
    const upperBand: number[] = [];
    const lowerBand: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      upperBand.push(mean + (standardDeviation * stdDev));
      lowerBand.push(mean - (standardDeviation * stdDev));
    }

    return {
      middle: sma,
      upper: upperBand,
      lower: lowerBand
    };
  }

  // Stochastic Oscillator
  static stochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, dPeriod = 3) {
    const kPercent: number[] = [];

    for (let i = kPeriod - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const currentClose = closes[i];

      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kPercent.push(k);
    }

    const dPercent = this.sma(kPercent, dPeriod);

    return {
      k: kPercent,
      d: dPercent
    };
  }

  // Average Directional Index (ADX)
  static adx(highs: number[], lows: number[], closes: number[], period = 14): number[] {
    if (highs.length < period + 1) return [];

    const trueRanges: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      const plusDM = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
      const minusDM = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;

      const trueRange = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );

      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
      trueRanges.push(trueRange);
    }

    const smoothedTR = this.sma(trueRanges, period);
    const smoothedPlusDM = this.sma(plusDMs, period);
    const smoothedMinusDM = this.sma(minusDMs, period);

    const adx: number[] = [];

    for (let i = 0; i < smoothedTR.length; i++) {
      const plusDI = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
      const minusDI = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
      const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
      adx.push(dx);
    }

    return this.sma(adx, period);
  }

  // Williams %R
  static williamsR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
    const result: number[] = [];

    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentClose = closes[i];

      const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      result.push(williamsR);
    }

    return result;
  }

  // Commodity Channel Index (CCI)
  static cci(highs: number[], lows: number[], closes: number[], period = 20): number[] {
    const typicalPrices = highs.map((high, i) => (high + lows[i] + closes[i]) / 3);
    const smaTP = this.sma(typicalPrices, period);
    const result: number[] = [];

    for (let i = period - 1; i < typicalPrices.length; i++) {
      const tp = typicalPrices[i];
      const sma = smaTP[i - period + 1];

      const slice = typicalPrices.slice(i - period + 1, i + 1);
      const meanDeviation = slice.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;

      const cci = (tp - sma) / (0.015 * meanDeviation);
      result.push(cci);
    }

    return result;
  }
}

export default TechnicalIndicators;