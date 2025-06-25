import * as TI from 'technicalindicators';
import { CandleData } from '../types/trading';
import Logger from './logger';
import { getCached } from '../cache/redisCache';

export interface TALibIndicatorConfig {
  name: string;
  displayName: string;
  category: 'trend' | 'momentum' | 'volume' | 'volatility' | 'overlap';
  description: string;
  parameters: {
    [key: string]: {
      name: string;
      type: 'number' | 'string' | 'boolean';
      default: any;
      min?: number;
      max?: number;
      options?: string[];
    };
  };
  requiredInputs: ('open' | 'high' | 'low' | 'close' | 'volume')[];
  outputs: string[];
}

export interface TALibIndicatorResult {
  name: string;
  values: number[] | { [key: string]: number[] };
  signals?: ('buy' | 'sell' | 'neutral')[];
  metadata?: any;
}

// Comprehensive TA-Lib indicator configurations
export const TALIB_INDICATORS: TALibIndicatorConfig[] = [
  // Trend Indicators
  {
    name: 'SMA',
    displayName: 'Simple Moving Average',
    category: 'trend',
    description: 'Simple Moving Average - smooths price data to identify trend direction',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
    },
    requiredInputs: ['close'],
    outputs: ['sma']
  },
  {
    name: 'EMA',
    displayName: 'Exponential Moving Average',
    category: 'trend',
    description: 'Exponential Moving Average - gives more weight to recent prices',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
    },
    requiredInputs: ['close'],
    outputs: ['ema']
  },
  {
    name: 'WMA',
    displayName: 'Weighted Moving Average',
    category: 'trend',
    description: 'Weighted Moving Average - linearly weighted moving average',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
    },
    requiredInputs: ['close'],
    outputs: ['wma']
  },
  {
    name: 'DEMA',
    displayName: 'Double Exponential Moving Average',
    category: 'trend',
    description: 'Double Exponential Moving Average - reduces lag of traditional EMA',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
    },
    requiredInputs: ['close'],
    outputs: ['dema']
  },
  {
    name: 'TEMA',
    displayName: 'Triple Exponential Moving Average',
    category: 'trend',
    description: 'Triple Exponential Moving Average - further reduces lag',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 200 }
    },
    requiredInputs: ['close'],
    outputs: ['tema']
  },
  {
    name: 'MACD',
    displayName: 'MACD',
    category: 'trend',
    description: 'Moving Average Convergence Divergence - trend following momentum indicator',
    parameters: {
      fastPeriod: { name: 'Fast Period', type: 'number', default: 12, min: 2, max: 100 },
      slowPeriod: { name: 'Slow Period', type: 'number', default: 26, min: 2, max: 100 },
      signalPeriod: { name: 'Signal Period', type: 'number', default: 9, min: 2, max: 50 }
    },
    requiredInputs: ['close'],
    outputs: ['MACD', 'signal', 'histogram']
  },
  {
    name: 'ADX',
    displayName: 'Average Directional Index',
    category: 'trend',
    description: 'Measures the strength of a trend regardless of direction',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['adx']
  },
  {
    name: 'AROON',
    displayName: 'Aroon',
    category: 'trend',
    description: 'Identifies trend changes and the strength of trends',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low'],
    outputs: ['aroonUp', 'aroonDown']
  },
  {
    name: 'PSAR',
    displayName: 'Parabolic SAR',
    category: 'trend',
    description: 'Parabolic Stop and Reverse - trend following indicator',
    parameters: {
      step: { name: 'Step', type: 'number', default: 0.02, min: 0.01, max: 0.1 },
      max: { name: 'Maximum', type: 'number', default: 0.2, min: 0.1, max: 1.0 }
    },
    requiredInputs: ['high', 'low'],
    outputs: ['psar']
  },

  // Momentum Indicators
  {
    name: 'RSI',
    displayName: 'Relative Strength Index',
    category: 'momentum',
    description: 'Measures the speed and magnitude of price changes',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['close'],
    outputs: ['rsi']
  },
  {
    name: 'STOCH',
    displayName: 'Stochastic Oscillator',
    category: 'momentum',
    description: 'Compares closing price to price range over a given period',
    parameters: {
      kPeriod: { name: 'K Period', type: 'number', default: 14, min: 2, max: 100 },
      dPeriod: { name: 'D Period', type: 'number', default: 3, min: 1, max: 50 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['k', 'd']
  },
  {
    name: 'STOCHRSI',
    displayName: 'Stochastic RSI',
    category: 'momentum',
    description: 'Applies Stochastic formula to RSI values',
    parameters: {
      rsiPeriod: { name: 'RSI Period', type: 'number', default: 14, min: 2, max: 100 },
      stochPeriod: { name: 'Stoch Period', type: 'number', default: 14, min: 2, max: 100 },
      kPeriod: { name: 'K Period', type: 'number', default: 3, min: 1, max: 50 },
      dPeriod: { name: 'D Period', type: 'number', default: 3, min: 1, max: 50 }
    },
    requiredInputs: ['close'],
    outputs: ['k', 'd']
  },
  {
    name: 'CCI',
    displayName: 'Commodity Channel Index',
    category: 'momentum',
    description: 'Measures deviation from statistical mean',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['cci']
  },
  {
    name: 'WILLIAMS',
    displayName: 'Williams %R',
    category: 'momentum',
    description: 'Momentum indicator measuring overbought/oversold levels',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['williamsR']
  },
  {
    name: 'ROC',
    displayName: 'Rate of Change',
    category: 'momentum',
    description: 'Measures percentage change between current and n periods ago',
    parameters: {
      period: { name: 'Period', type: 'number', default: 12, min: 1, max: 100 }
    },
    requiredInputs: ['close'],
    outputs: ['roc']
  },
  {
    name: 'MFI',
    displayName: 'Money Flow Index',
    category: 'momentum',
    description: 'Volume-weighted RSI',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close', 'volume'],
    outputs: ['mfi']
  },

  // Volume Indicators
  {
    name: 'OBV',
    displayName: 'On Balance Volume',
    category: 'volume',
    description: 'Relates volume to price change',
    parameters: {},
    requiredInputs: ['close', 'volume'],
    outputs: ['obv']
  },
  {
    name: 'AD',
    displayName: 'Accumulation/Distribution',
    category: 'volume',
    description: 'Volume indicator that relates close to high-low range',
    parameters: {},
    requiredInputs: ['high', 'low', 'close', 'volume'],
    outputs: ['ad']
  },
  {
    name: 'ADOSC',
    displayName: 'A/D Oscillator',
    category: 'volume',
    description: 'Oscillator based on Accumulation/Distribution',
    parameters: {
      fastPeriod: { name: 'Fast Period', type: 'number', default: 3, min: 2, max: 50 },
      slowPeriod: { name: 'Slow Period', type: 'number', default: 10, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close', 'volume'],
    outputs: ['adosc']
  },

  // Volatility Indicators
  {
    name: 'ATR',
    displayName: 'Average True Range',
    category: 'volatility',
    description: 'Measures market volatility',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['atr']
  },
  {
    name: 'NATR',
    displayName: 'Normalized ATR',
    category: 'volatility',
    description: 'Normalized Average True Range',
    parameters: {
      period: { name: 'Period', type: 'number', default: 14, min: 2, max: 100 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['natr']
  },
  {
    name: 'TRANGE',
    displayName: 'True Range',
    category: 'volatility',
    description: 'True Range of price movement',
    parameters: {},
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['trange']
  },

  // Overlap Studies
  {
    name: 'BBANDS',
    displayName: 'Bollinger Bands',
    category: 'overlap',
    description: 'Volatility bands placed above and below moving average',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 100 },
      stdDev: { name: 'Standard Deviation', type: 'number', default: 2, min: 0.1, max: 5 }
    },
    requiredInputs: ['close'],
    outputs: ['upper', 'middle', 'lower']
  },
  {
    name: 'KELTNER',
    displayName: 'Keltner Channels',
    category: 'overlap',
    description: 'Volatility-based envelopes set above and below EMA',
    parameters: {
      period: { name: 'Period', type: 'number', default: 20, min: 2, max: 100 },
      multiplier: { name: 'Multiplier', type: 'number', default: 2, min: 0.1, max: 5 }
    },
    requiredInputs: ['high', 'low', 'close'],
    outputs: ['upper', 'middle', 'lower']
  }
];

export class TALibCalculator {
  static calculateIndicator(
    indicatorName: string,
    candles: CandleData[],
    parameters: { [key: string]: any } = {}
  ): TALibIndicatorResult | null {
    try {
      const config = TALIB_INDICATORS.find(ind => ind.name === indicatorName);
      if (!config) {
        Logger.error(`Indicator ${indicatorName} not found`);
        return null;
      }

      // Prepare input data
      const inputs = this.prepareInputs(candles, config.requiredInputs);
      
      // Merge default parameters with provided parameters
      const finalParams = { ...this.getDefaultParameters(config), ...parameters };

      // Calculate indicator based on type
      let result: any;

      switch (indicatorName) {
        case 'SMA':
          result = TI.SMA.calculate({ period: finalParams.period, values: inputs.close });
          break;
        case 'EMA':
          result = TI.EMA.calculate({ period: finalParams.period, values: inputs.close });
          break;
        case 'WMA':
          result = TI.WMA.calculate({ period: finalParams.period, values: inputs.close });
          break;
        case 'RSI':
          result = TI.RSI.calculate({ period: finalParams.period, values: inputs.close });
          break;
        case 'MACD':
          result = TI.MACD.calculate({
            fastPeriod: finalParams.fastPeriod,
            slowPeriod: finalParams.slowPeriod,
            signalPeriod: finalParams.signalPeriod,
            values: inputs.close
          });
          break;
        case 'BBANDS':
          result = TI.BollingerBands.calculate({
            period: finalParams.period,
            stdDev: finalParams.stdDev,
            values: inputs.close
          });
          break;
        case 'STOCH':
          result = TI.Stochastic.calculate({
            high: inputs.high,
            low: inputs.low,
            close: inputs.close,
            period: finalParams.kPeriod,
            signalPeriod: finalParams.dPeriod
          });
          break;
        case 'STOCHRSI':
          result = TI.StochasticRSI.calculate({
            values: inputs.close,
            rsiPeriod: finalParams.rsiPeriod,
            stochasticPeriod: finalParams.stochPeriod,
            kPeriod: finalParams.kPeriod,
            dPeriod: finalParams.dPeriod
          });
          break;
        case 'ATR':
          result = TI.ATR.calculate({
            period: finalParams.period,
            high: inputs.high,
            low: inputs.low,
            close: inputs.close
          });
          break;
        case 'ADX':
          result = TI.ADX.calculate({
            period: finalParams.period,
            high: inputs.high,
            low: inputs.low,
            close: inputs.close
          });
          break;
        case 'CCI':
          result = TI.CCI.calculate({
            period: finalParams.period,
            high: inputs.high,
            low: inputs.low,
            close: inputs.close
          });
          break;
        case 'WILLIAMS':
          result = TI.WilliamsR.calculate({
            period: finalParams.period,
            high: inputs.high,
            low: inputs.low,
            close: inputs.close
          });
          break;
        case 'ROC':
          result = TI.ROC.calculate({
            period: finalParams.period,
            values: inputs.close
          });
          break;
        case 'MFI':
          result = TI.MFI.calculate({
            period: finalParams.period,
            high: inputs.high,
            low: inputs.low,
            close: inputs.close,
            volume: inputs.volume
          });
          break;
        case 'OBV':
          result = TI.OBV.calculate({
            close: inputs.close,
            volume: inputs.volume
          });
          break;
        case 'AD':
          result = TI.AD.calculate({
            high: inputs.high,
            low: inputs.low,
            close: inputs.close,
            volume: inputs.volume
          });
          break;
        case 'PSAR':
          result = TI.PSAR.calculate({
            high: inputs.high,
            low: inputs.low,
            step: finalParams.step,
            max: finalParams.max
          });
          break;
        default:
          Logger.error(`Calculation not implemented for ${indicatorName}`);
          return null;
      }

      if (!result || result.length === 0) {
        return null;
      }

      // Generate signals based on indicator type and values
      const signals = this.generateSignals(indicatorName, result, finalParams);

      return {
        name: indicatorName,
        values: result,
        signals,
        metadata: {
          parameters: finalParams,
          config
        }
      };

    } catch (error) {
      Logger.error(`Error calculating ${indicatorName}:`, error);
      return null;
    }
  }

  private static prepareInputs(candles: CandleData[], requiredInputs: string[]): { [key: string]: number[] } {
    const inputs: { [key: string]: number[] } = {};
    
    requiredInputs.forEach(input => {
      switch (input) {
        case 'open':
          inputs.open = candles.map(c => c.open);
          break;
        case 'high':
          inputs.high = candles.map(c => c.high);
          break;
        case 'low':
          inputs.low = candles.map(c => c.low);
          break;
        case 'close':
          inputs.close = candles.map(c => c.close);
          break;
        case 'volume':
          inputs.volume = candles.map(c => c.volume);
          break;
      }
    });

    return inputs;
  }

  private static getDefaultParameters(config: TALibIndicatorConfig): { [key: string]: any } {
    const defaults: { [key: string]: any } = {};
    Object.entries(config.parameters).forEach(([key, param]) => {
      defaults[key] = param.default;
    });
    return defaults;
  }

  private static generateSignals(indicatorName: string, values: any, parameters: any): ('buy' | 'sell' | 'neutral')[] {
    const signals: ('buy' | 'sell' | 'neutral')[] = [];

    try {
      switch (indicatorName) {
        case 'RSI':
          values.forEach((rsi: number) => {
            if (rsi < 30) signals.push('buy');
            else if (rsi > 70) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        case 'STOCH':
        case 'STOCHRSI':
          values.forEach((stoch: any) => {
            const k = stoch.k || stoch;
            if (k < 20) signals.push('buy');
            else if (k > 80) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        case 'CCI':
          values.forEach((cci: number) => {
            if (cci < -100) signals.push('buy');
            else if (cci > 100) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        case 'WILLIAMS':
          values.forEach((williams: number) => {
            if (williams < -80) signals.push('buy');
            else if (williams > -20) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        case 'MFI':
          values.forEach((mfi: number) => {
            if (mfi < 20) signals.push('buy');
            else if (mfi > 80) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        case 'MACD':
          values.forEach((macd: any, index: number) => {
            if (index === 0) {
              signals.push('neutral');
              return;
            }
            const current = macd.MACD - macd.signal;
            const previous = values[index - 1].MACD - values[index - 1].signal;
            
            if (previous <= 0 && current > 0) signals.push('buy');
            else if (previous >= 0 && current < 0) signals.push('sell');
            else signals.push('neutral');
          });
          break;

        default:
          // For indicators without specific signal logic, return neutral
          for (let i = 0; i < (Array.isArray(values) ? values.length : 1); i++) {
            signals.push('neutral');
          }
      }
    } catch (error) {
      Logger.error(`Error generating signals for ${indicatorName}:`, error);
      // Return neutral signals as fallback
      for (let i = 0; i < (Array.isArray(values) ? values.length : 1); i++) {
        signals.push('neutral');
      }
    }

    return signals;
  }

  static getIndicatorsByCategory(category: string): TALibIndicatorConfig[] {
    return TALIB_INDICATORS.filter(indicator => indicator.category === category);
  }

  static getAllCategories(): string[] {
    return [...new Set(TALIB_INDICATORS.map(indicator => indicator.category))];
  }

  static getIndicatorConfig(name: string): TALibIndicatorConfig | undefined {
    return TALIB_INDICATORS.find(indicator => indicator.name === name);
  }
}

// Example: Get currency pairs with Redis cache
export async function getCurrencyPairsCached(): Promise<any[]> {
  return getCached('currencyPairs', async () => {
    // Replace with actual data source if needed
    return [
      { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT' },
      { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT' },
      // ...
    ];
  }, 86400);
}

// Example: Get indicator metadata with Redis cache
export async function getIndicatorMetadataCached(): Promise<any[]> {
  return getCached('indicatorMetadata', async () => {
    return TALIB_INDICATORS;
  }, 86400);
}

// Utility to run indicator calculation in a Web Worker
export function runIndicatorInWorker(indicator: string, input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/indicatorWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
    worker.postMessage({ indicator, input });
  });
}