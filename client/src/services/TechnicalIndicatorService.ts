import * as TI from 'technicalindicators';
import { CandleData } from '../types/trading';

export interface IndicatorResult {
  name: string;
  values: number[] | object[];
  signals?: ('buy' | 'sell' | 'neutral')[];
  metadata?: any;
}

export interface IndicatorConfig {
  name: string;
  parameters: Record<string, any>;
}

export class TechnicalIndicatorService {
  /**
   * Calculate a single indicator
   */
  static calculateIndicator(
    name: string,
    candles: CandleData[],
    parameters: Record<string, any> = {}
  ): IndicatorResult | null {
    try {
      // Extract data from candles
      const open = candles.map(c => c.open);
      const high = candles.map(c => c.high);
      const low = candles.map(c => c.low);
      const close = candles.map(c => c.close);
      const volume = candles.map(c => c.volume);

      let values: any;
      let signals: ('buy' | 'sell' | 'neutral')[] | undefined;

      switch (name) {
        case 'SMA':
          values = TI.SMA.calculate({
            period: parameters.period || 14,
            values: close
          });
          break;

        case 'EMA':
          values = TI.EMA.calculate({
            period: parameters.period || 14,
            values: close
          });
          break;

        case 'RSI':
          values = TI.RSI.calculate({
            period: parameters.period || 14,
            values: close
          });
          signals = this.generateRSISignals(values);
          break;

        case 'MACD':
          values = TI.MACD.calculate({
            fastPeriod: parameters.fastPeriod || 12,
            slowPeriod: parameters.slowPeriod || 26,
            signalPeriod: parameters.signalPeriod || 9,
            values: close
          });
          signals = this.generateMACDSignals(values);
          break;

        case 'Stochastic':
          values = TI.Stochastic.calculate({
            high,
            low,
            close,
            period: parameters.period || 14,
            signalPeriod: parameters.signalPeriod || 3
          });
          signals = this.generateStochasticSignals(values);
          break;

        case 'BollingerBands':
          values = TI.BollingerBands.calculate({
            period: parameters.period || 20,
            stdDev: parameters.stdDev || 2,
            values: close
          });
          signals = this.generateBollingerBandsSignals(values, close);
          break;

        case 'ADX':
          values = TI.ADX.calculate({
            high,
            low,
            close,
            period: parameters.period || 14
          });
          signals = this.generateADXSignals(values);
          break;

        case 'ATR':
          values = TI.ATR.calculate({
            high,
            low,
            close,
            period: parameters.period || 14
          });
          break;

        case 'OBV':
          values = TI.OBV.calculate({
            close,
            volume
          });
          break;

        case 'VWAP':
          values = this.calculateVWAP(open, high, low, close, volume);
          break;

        case 'Ichimoku':
          values = TI.IchimokuCloud.calculate({
            high,
            low,
            conversionPeriod: parameters.conversionPeriod || 9,
            basePeriod: parameters.basePeriod || 26,
            spanPeriod: parameters.spanPeriod || 52,
            displacement: parameters.displacement || 26
          });
          signals = this.generateIchimokuSignals(values, close);
          break;

        case 'KST':
          values = TI.KST.calculate({
            values: close,
            ROCPer1: parameters.ROCPer1 || 10,
            ROCPer2: parameters.ROCPer2 || 15,
            ROCPer3: parameters.ROCPer3 || 20,
            ROCPer4: parameters.ROCPer4 || 30,
            SMAROCPer1: parameters.SMAROCPer1 || 10,
            SMAROCPer2: parameters.SMAROCPer2 || 10,
            SMAROCPer3: parameters.SMAROCPer3 || 10,
            SMAROCPer4: parameters.SMAROCPer4 || 15,
            signalPeriod: parameters.signalPeriod || 9
          });
          break;

        case 'PSAR':
          values = TI.PSAR.calculate({
            high,
            low,
            step: parameters.step || 0.02,
            max: parameters.max || 0.2
          });
          signals = this.generatePSARSignals(values, close);
          break;

        default:
          console.warn(`Indicator ${name} not implemented`);
          return null;
      }

      return {
        name,
        values,
        signals,
        metadata: { parameters }
      };
    } catch (error) {
      console.error(`Error calculating indicator ${name}:`, error);
      return null;
    }
  }

  /**
   * Calculate multiple indicators at once
   */
  static calculateIndicators(
    candles: CandleData[],
    indicators: IndicatorConfig[]
  ): Record<string, IndicatorResult | null> {
    const results: Record<string, IndicatorResult | null> = {};

    for (const indicator of indicators) {
      results[indicator.name] = this.calculateIndicator(
        indicator.name,
        candles,
        indicator.parameters
      );
    }

    return results;
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   */
  private static calculateVWAP(
    open: number[],
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
  ): number[] {
    const typicalPrices = high.map((h, i) => (h + low[i] + close[i]) / 3);
    const volumeTypicalPrices = typicalPrices.map((tp, i) => tp * volume[i]);

    let cumulativeVTP = 0;
    let cumulativeVolume = 0;
    const vwap: number[] = [];

    for (let i = 0; i < typicalPrices.length; i++) {
      cumulativeVTP += volumeTypicalPrices[i];
      cumulativeVolume += volume[i];

      if (cumulativeVolume > 0) {
        vwap.push(cumulativeVTP / cumulativeVolume);
      } else {
        vwap.push(typicalPrices[i]);
      }
    }

    return vwap;
  }

  /**
   * Generate signals for RSI
   */
  private static generateRSISignals(values: number[]): ('buy' | 'sell' | 'neutral')[] {
    return values.map(rsi => {
      if (rsi < 30) return 'buy';
      if (rsi > 70) return 'sell';
      return 'neutral';
    });
  }

  /**
   * Generate signals for MACD
   */
  private static generateMACDSignals(values: any[]): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    for (let i = 1; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - 1];

      // MACD line crosses above signal line
      if (previous.MACD < previous.signal && current.MACD > current.signal) {
        signals.push('buy');
      }
      // MACD line crosses below signal line
      else if (previous.MACD > previous.signal && current.MACD < current.signal) {
        signals.push('sell');
      }
      else {
        signals.push('neutral');
      }
    }

    // Add neutral for the first value
    if (values.length > 0) {
      signals.unshift('neutral');
    }

    return signals;
  }

  /**
   * Generate signals for Stochastic
   */
  private static generateStochasticSignals(values: any[]): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    for (let i = 1; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - 1];

      // K crosses above D in oversold region
      if (previous.k < previous.d && current.k > current.d && current.k < 30) {
        signals.push('buy');
      }
      // K crosses below D in overbought region
      else if (previous.k > previous.d && current.k < current.d && current.k > 70) {
        signals.push('sell');
      }
      else {
        signals.push('neutral');
      }
    }

    // Add neutral for the first value
    if (values.length > 0) {
      signals.unshift('neutral');
    }

    return signals;
  }

  /**
   * Generate signals for Bollinger Bands
   */
  private static generateBollingerBandsSignals(
    values: any[],
    prices: number[]
  ): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    for (let i = 0; i < values.length; i++) {
      const band = values[i];
      const price = prices[i + (prices.length - values.length)];

      // Price touches or crosses below lower band
      if (price <= band.lower) {
        signals.push('buy');
      }
      // Price touches or crosses above upper band
      else if (price >= band.upper) {
        signals.push('sell');
      }
      else {
        signals.push('neutral');
      }
    }

    return signals;
  }

  /**
   * Generate signals for ADX
   */
  private static generateADXSignals(values: number[]): ('buy' | 'sell' | 'neutral')[] {
    return values.map(adx => {
      // ADX above 25 indicates a strong trend
      if (adx > 25) return 'buy';
      return 'neutral';
    });
  }

  /**
   * Generate signals for Ichimoku Cloud
   */
  private static generateIchimokuSignals(
    values: any[],
    prices: number[]
  ): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    for (let i = 0; i < values.length; i++) {
      const cloud = values[i];
      const price = prices[i + (prices.length - values.length)];

      // Price above the cloud, conversion line above base line
      if (price > cloud.spanA && price > cloud.spanB && cloud.conversion > cloud.base) {
        signals.push('buy');
      }
      // Price below the cloud, conversion line below base line
      else if (price < cloud.spanA && price < cloud.spanB && cloud.conversion < cloud.base) {
        signals.push('sell');
      }
      else {
        signals.push('neutral');
      }
    }

    return signals;
  }

  /**
   * Generate signals for Parabolic SAR
   */
  private static generatePSARSignals(
    values: number[],
    prices: number[]
  ): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    for (let i = 1; i < values.length; i++) {
      const currentSAR = values[i];
      const previousSAR = values[i - 1];
      const currentPrice = prices[i + (prices.length - values.length)];
      const previousPrice = prices[i - 1 + (prices.length - values.length)];

      // SAR flips from above price to below price
      if (previousSAR > previousPrice && currentSAR < currentPrice) {
        signals.push('buy');
      }
      // SAR flips from below price to above price
      else if (previousSAR < previousPrice && currentSAR > currentPrice) {
        signals.push('sell');
      }
      else {
        signals.push('neutral');
      }
    }

    // Add neutral for the first value
    if (values.length > 0) {
      signals.unshift('neutral');
    }

    return signals;
  }

  private calculateADX(data: CandleData[], period: number = 14): number[] {
    const adx: number[] = [];

    if (data.length < period + 1) {
      return new Array(data.length).fill(25); // Default ADX value
    }

    // Simplified ADX calculation
    for (let i = period; i < data.length; i++) {
      let plusDM = 0;
      let minusDM = 0;
      let tr = 0;

      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          const highDiff = data[j].high - data[j - 1].high;
          const lowDiff = data[j - 1].low - data[j].low;

          plusDM += Math.max(highDiff, 0);
          minusDM += Math.max(lowDiff, 0);

          const trueRange = Math.max(
            data[j].high - data[j].low,
            Math.abs(data[j].high - data[j - 1].close),
            Math.abs(data[j].low - data[j - 1].close)
          );
          tr += trueRange;
        }
      }

      const diPlus = (plusDM / tr) * 100;
      const diMinus = (minusDM / tr) * 100;
      const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;

      adx.push(isNaN(dx) ? 25 : dx);
    }

    // Fill beginning with default values
    return new Array(period).fill(25).concat(adx);
  }

  private determineBBExpansion(bb: any, index: number): 'expanding' | 'contracting' | 'stable' {
    if (index < 1) return 'stable';

    const currentWidth = bb.upper[index] - bb.lower[index];
    const previousWidth = bb.upper[index - 1] - bb.lower[index - 1];

    const change = (currentWidth - previousWidth) / previousWidth;

    if (change > 0.02) return 'expanding';
    if (change < -0.02) return 'contracting';
    return 'stable';
  }
}