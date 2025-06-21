import { TechnicalIndicators, TradingSignal } from '../types/trading';

export function generateSignal(
  price: number, 
  indicators: TechnicalIndicators, 
  symbol: string,
  timeframe: string,
  config?: any
): TradingSignal {
  const reasoning: string[] = [];
  let confidence = 0;
  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  
  // Skip signals during BB expansion (trending market)
  if (indicators.bb.expansion === 'expanding') {
    reasoning.push('Bollinger Bands expanding - avoiding trending market');
    return createHoldSignal(price, indicators, symbol, timeframe, reasoning);
  }
  
  // Long Entry Conditions
  const longConditions = {
    bbPosition: indicators.bb.position === 'at_lower' || indicators.bb.position === 'below_lower',
    stochCross: indicators.stochRsi.cross === 'bullish_cross',
    macdContracting: indicators.macd.trend === 'contracting_red',
    rsiConfirm: indicators.rsi !== undefined && indicators.rsi > 30,
    sarFlip: indicators.sar?.flip && indicators.sar.trend === 'bullish',
    klingerUptick: indicators.klinger?.trend === 'uptick'
  };
  
  // Short Entry Conditions  
  const shortConditions = {
    bbPosition: indicators.bb.position === 'at_upper' || indicators.bb.position === 'above_upper',
    stochCross: indicators.stochRsi.cross === 'bearish_cross',
    macdContracting: indicators.macd.trend === 'contracting_green',
    rsiConfirm: indicators.rsi !== undefined && indicators.rsi < 70,
    sarFlip: indicators.sar?.flip && indicators.sar.trend === 'bearish',
    klingerDowntick: indicators.klinger?.trend === 'downtick'
  };
  
  // Evaluate Long Signal
  let longScore = 0;
  if (longConditions.bbPosition) {
    reasoning.push('Price at/below lower Bollinger Band');
    confidence += 0.3;
    longScore++;
  }
  
  if (longConditions.stochCross) {
    reasoning.push('Stochastic RSI bullish cross from oversold');
    confidence += 0.4;
    longScore++;
  }
  
  if (longConditions.macdContracting) {
    reasoning.push('MACD histogram contracting (downward momentum weakening)');
    confidence += 0.3;
    longScore++;
  }
  
  // Optional confirmations
  if (longConditions.rsiConfirm) {
    reasoning.push('RSI above 30 (avoiding extreme oversold)');
    confidence += 0.1;
  }
  
  if (longConditions.sarFlip) {
    reasoning.push('Parabolic SAR flip confirms bullish setup');
    confidence += 0.15;
  }
  
  if (longConditions.klingerUptick) {
    reasoning.push('Klinger oscillator shows uptick');
    confidence += 0.1;
  }
  
  // Evaluate Short Signal
  let shortScore = 0;
  let shortConfidence = 0;
  const shortReasoning: string[] = [];
  
  if (shortConditions.bbPosition) {
    shortReasoning.push('Price at/above upper Bollinger Band');
    shortConfidence += 0.3;
    shortScore++;
  }
  
  if (shortConditions.stochCross) {
    shortReasoning.push('Stochastic RSI bearish cross from overbought');
    shortConfidence += 0.4;
    shortScore++;
  }
  
  if (shortConditions.macdContracting) {
    shortReasoning.push('MACD histogram contracting (upward momentum weakening)');
    shortConfidence += 0.3;
    shortScore++;
  }
  
  // Optional confirmations for short
  if (shortConditions.rsiConfirm) {
    shortReasoning.push('RSI below 70 (avoiding extreme overbought)');
    shortConfidence += 0.1;
  }
  
  if (shortConditions.sarFlip) {
    shortReasoning.push('Parabolic SAR flip confirms bearish setup');
    shortConfidence += 0.15;
  }
  
  if (shortConditions.klingerDowntick) {
    shortReasoning.push('Klinger oscillator shows downtick');
    shortConfidence += 0.1;
  }
  
  // Determine signal based on confluence (need at least 2 main conditions)
  if (longScore >= 2 && confidence >= 0.6) {
    signal = 'buy';
  } else if (shortScore >= 2 && shortConfidence >= 0.6) {
    signal = 'sell';
    confidence = shortConfidence;
    reasoning.length = 0;
    reasoning.push(...shortReasoning);
  } else {
    signal = 'hold';
    confidence = 0;
    reasoning.length = 0;
    reasoning.push('Insufficient confluence for entry signal');
  }
  
  // Calculate stop loss and take profit using ATR if available
  const atrMultiplier = 1.5;
  const stopLossPercent = config?.risk?.stop_loss_pct || 0.0035; // 0.35% default
  
  let stopLoss: number;
  let takeProfit: number;
  let takeProfit2: number | undefined;
  
  if (indicators.atr) {
    // ATR-based SL/TP
    const atrValue = indicators.atr * atrMultiplier;
    stopLoss = signal === 'buy' ? price - atrValue : 
               signal === 'sell' ? price + atrValue : price;
    
    takeProfit = indicators.bb.middle; // TP1 at middle BB
    takeProfit2 = signal === 'buy' ? indicators.bb.upper : 
                  signal === 'sell' ? indicators.bb.lower : undefined;
  } else {
    // Percentage-based SL/TP
    stopLoss = signal === 'buy' ? price * (1 - stopLossPercent) :
               signal === 'sell' ? price * (1 + stopLossPercent) : price;
    
    takeProfit = indicators.bb.middle;
    takeProfit2 = signal === 'buy' ? indicators.bb.upper : 
                  signal === 'sell' ? indicators.bb.lower : undefined;
  }
  
  return {
    signal,
    ticker: symbol,
    timeframe,
    entry_price: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    take_profit_2: takeProfit2,
    confidence: Math.min(confidence, 1),
    timestamp: Date.now(),
    indicators,
    reasoning
  };
}

function createHoldSignal(
  price: number, 
  indicators: TechnicalIndicators, 
  symbol: string,
  timeframe: string,
  reasoning: string[]
): TradingSignal {
  return {
    signal: 'hold',
    ticker: symbol,
    timeframe,
    entry_price: price,
    stop_loss: price,
    take_profit: price,
    confidence: 0,
    timestamp: Date.now(),
    indicators,
    reasoning
  };
}