// Main indicators library export
export * from './base';
export * from './momentum';
export * from './trend';
export * from './volume';
export * from './volatility';

import { CandleData } from '../../types/trading';
import { IndicatorResult, MultiValueIndicatorResult } from './base';
import { calculateRSI, calculateStochastic, calculateWilliamsR, calculateROC, calculateCCI, calculateMFI } from './momentum';
import { calculateMACD, calculateBollingerBands, calculateATR, calculateParabolicSAR, calculateIchimoku, calculateADX } from './trend';
import { calculateOBV, calculateVWAP, calculateADLine, calculateCMF, calculateVROC, calculatePVT } from './volume';
import { calculateBBWidth, calculateKeltnerChannels, calculateDonchianChannels, calculateATRPercent, calculateVolatilityIndex, calculateChaikinVolatility } from './volatility';

export interface IndicatorSuite {
  // Momentum indicators
  rsi?: IndicatorResult[];
  stochastic?: { k: IndicatorResult[], d: IndicatorResult[] };
  williamsR?: IndicatorResult[];
  roc?: IndicatorResult[];
  cci?: IndicatorResult[];
  mfi?: IndicatorResult[];
  
  // Trend indicators
  macd?: MultiValueIndicatorResult[];
  bollingerBands?: MultiValueIndicatorResult[];
  atr?: IndicatorResult[];
  parabolicSAR?: IndicatorResult[];
  ichimoku?: MultiValueIndicatorResult[];
  adx?: MultiValueIndicatorResult[];
  
  // Volume indicators
  obv?: IndicatorResult[];
  vwap?: IndicatorResult[];
  adLine?: IndicatorResult[];
  cmf?: IndicatorResult[];
  vroc?: IndicatorResult[];
  pvt?: IndicatorResult[];
  
  // Volatility indicators
  bbWidth?: IndicatorResult[];
  keltnerChannels?: MultiValueIndicatorResult[];
  donchianChannels?: MultiValueIndicatorResult[];
  atrPercent?: IndicatorResult[];
  volatilityIndex?: IndicatorResult[];
  chaikinVolatility?: IndicatorResult[];
}

export interface IndicatorConfig {
  // Momentum
  rsi?: { period: number };
  stochastic?: { kPeriod: number; dPeriod: number };
  williamsR?: { period: number };
  roc?: { period: number };
  cci?: { period: number };
  mfi?: { period: number };
  
  // Trend
  macd?: { fast: number; slow: number; signal: number };
  bollingerBands?: { period: number; stdDev: number };
  atr?: { period: number };
  parabolicSAR?: { acceleration: number; maximum: number };
  ichimoku?: { tenkan: number; kijun: number; senkouB: number };
  adx?: { period: number };
  
  // Volume
  obv?: boolean;
  vwap?: boolean;
  adLine?: boolean;
  cmf?: { period: number };
  vroc?: { period: number };
  pvt?: boolean;
  
  // Volatility
  bbWidth?: { period: number; stdDev: number };
  keltnerChannels?: { period: number; multiplier: number };
  donchianChannels?: { period: number };
  atrPercent?: { period: number };
  volatilityIndex?: { period: number };
  chaikinVolatility?: { period: number; rocPeriod: number };
}

export function calculateAllIndicators(
  candles: CandleData[], 
  config: IndicatorConfig = {}
): IndicatorSuite {
  if (candles.length < 50) return {}; // Need sufficient data
  
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  const volume = candles.map(c => c.volume);
  
  const indicators: IndicatorSuite = {};
  
  try {
    // Momentum indicators
    if (config.rsi !== undefined) {
      indicators.rsi = calculateRSI(close, config.rsi.period || 14);
    }
    
    if (config.stochastic !== undefined) {
      indicators.stochastic = calculateStochastic(
        high, low, close, 
        config.stochastic.kPeriod || 14, 
        config.stochastic.dPeriod || 3
      );
    }
    
    if (config.williamsR !== undefined) {
      indicators.williamsR = calculateWilliamsR(high, low, close, config.williamsR.period || 14);
    }
    
    if (config.roc !== undefined) {
      indicators.roc = calculateROC(close, config.roc.period || 12);
    }
    
    if (config.cci !== undefined) {
      indicators.cci = calculateCCI(high, low, close, config.cci.period || 20);
    }
    
    if (config.mfi !== undefined) {
      indicators.mfi = calculateMFI(high, low, close, volume, config.mfi.period || 14);
    }
    
    // Trend indicators
    if (config.macd !== undefined) {
      indicators.macd = calculateMACD(
        close, 
        config.macd.fast || 12, 
        config.macd.slow || 26, 
        config.macd.signal || 9
      );
    }
    
    if (config.bollingerBands !== undefined) {
      indicators.bollingerBands = calculateBollingerBands(
        close, 
        config.bollingerBands.period || 20, 
        config.bollingerBands.stdDev || 2
      );
    }
    
    if (config.atr !== undefined) {
      indicators.atr = calculateATR(high, low, close, config.atr.period || 14);
    }
    
    if (config.parabolicSAR !== undefined) {
      indicators.parabolicSAR = calculateParabolicSAR(
        high, low, 
        config.parabolicSAR.acceleration || 0.02, 
        config.parabolicSAR.maximum || 0.2
      );
    }
    
    if (config.ichimoku !== undefined) {
      indicators.ichimoku = calculateIchimoku(
        high, low, close,
        config.ichimoku.tenkan || 9,
        config.ichimoku.kijun || 26,
        config.ichimoku.senkouB || 52
      );
    }
    
    if (config.adx !== undefined) {
      indicators.adx = calculateADX(high, low, close, config.adx.period || 14);
    }
    
    // Volume indicators
    if (config.obv) {
      indicators.obv = calculateOBV(close, volume);
    }
    
    if (config.vwap) {
      indicators.vwap = calculateVWAP(high, low, close, volume);
    }
    
    if (config.adLine) {
      indicators.adLine = calculateADLine(high, low, close, volume);
    }
    
    if (config.cmf !== undefined) {
      indicators.cmf = calculateCMF(high, low, close, volume, config.cmf.period || 20);
    }
    
    if (config.vroc !== undefined) {
      indicators.vroc = calculateVROC(volume, config.vroc.period || 12);
    }
    
    if (config.pvt) {
      indicators.pvt = calculatePVT(close, volume);
    }
    
    // Volatility indicators
    if (config.bbWidth !== undefined) {
      indicators.bbWidth = calculateBBWidth(
        close, 
        config.bbWidth.period || 20, 
        config.bbWidth.stdDev || 2
      );
    }
    
    if (config.keltnerChannels !== undefined) {
      indicators.keltnerChannels = calculateKeltnerChannels(
        high, low, close,
        config.keltnerChannels.period || 20,
        config.keltnerChannels.multiplier || 2
      );
    }
    
    if (config.donchianChannels !== undefined) {
      indicators.donchianChannels = calculateDonchianChannels(
        high, low, close,
        config.donchianChannels.period || 20
      );
    }
    
    if (config.atrPercent !== undefined) {
      indicators.atrPercent = calculateATRPercent(high, low, close, config.atrPercent.period || 14);
    }
    
    if (config.volatilityIndex !== undefined) {
      indicators.volatilityIndex = calculateVolatilityIndex(close, config.volatilityIndex.period || 20);
    }
    
    if (config.chaikinVolatility !== undefined) {
      indicators.chaikinVolatility = calculateChaikinVolatility(
        high, low,
        config.chaikinVolatility.period || 10,
        config.chaikinVolatility.rocPeriod || 10
      );
    }
    
  } catch (error) {
    console.error('Error calculating indicators:', error);
  }
  
  return indicators;
}

export interface SignalSummary {
  bullishSignals: number;
  bearishSignals: number;
  neutralSignals: number;
  overallSignal: 'buy' | 'sell' | 'neutral';
  confidence: number;
  strongestBullish: { indicator: string; strength: number } | null;
  strongestBearish: { indicator: string; strength: number } | null;
}

export function analyzeSignals(indicators: IndicatorSuite): SignalSummary {
  let bullishSignals = 0;
  let bearishSignals = 0;
  let neutralSignals = 0;
  let totalStrength = 0;
  let signalCount = 0;
  
  let strongestBullish: { indicator: string; strength: number } | null = null;
  let strongestBearish: { indicator: string; strength: number } | null = null;
  
  // Helper function to process indicator results
  const processIndicator = (name: string, results: IndicatorResult[] | MultiValueIndicatorResult[] | undefined) => {
    if (!results || results.length === 0) return;
    
    const latest = results[results.length - 1];
    if (!latest.signal || latest.signal === 'neutral') {
      neutralSignals++;
      return;
    }
    
    signalCount++;
    const strength = latest.strength || 0;
    totalStrength += strength;
    
    if (latest.signal === 'buy') {
      bullishSignals++;
      if (!strongestBullish || strength > strongestBullish.strength) {
        strongestBullish = { indicator: name, strength };
      }
    } else if (latest.signal === 'sell') {
      bearishSignals++;
      if (!strongestBearish || strength > strongestBearish.strength) {
        strongestBearish = { indicator: name, strength };
      }
    }
  };
  
  // Process all indicators
  Object.entries(indicators).forEach(([name, results]) => {
    if (name === 'stochastic') {
      const stoch = results as { k: IndicatorResult[], d: IndicatorResult[] };
      processIndicator(`${name}_k`, stoch.k);
      processIndicator(`${name}_d`, stoch.d);
    } else {
      processIndicator(name, results as IndicatorResult[] | MultiValueIndicatorResult[]);
    }
  });
  
  // Determine overall signal
  let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  const totalSignals = bullishSignals + bearishSignals;
  
  if (totalSignals > 0) {
    const bullishRatio = bullishSignals / totalSignals;
    if (bullishRatio > 0.6) {
      overallSignal = 'buy';
    } else if (bullishRatio < 0.4) {
      overallSignal = 'sell';
    }
  }
  
  const confidence = signalCount > 0 ? totalStrength / signalCount : 0;
  
  return {
    bullishSignals,
    bearishSignals,
    neutralSignals,
    overallSignal,
    confidence,
    strongestBullish,
    strongestBearish
  };
}