import { StrategyConfig } from '../trading/StrategyRunner';

// Create a default strategy template
export function createDefaultStrategy(): StrategyConfig {
  return {
    id: 'default_strategy',
    name: 'My Custom Strategy',
    description: 'A custom trading strategy built with the Strategy Builder',
    version: '1.0.0',
    minConfidence: 0.65,
    maxSignalsPerHour: 5,
    riskRewardRatio: 2.0,
    stopLossMethod: 'atr',
    takeProfitMethod: 'fixed_ratio',
    filters: {
      timeFilters: [],
      volatilityFilter: false,
      trendFilter: false,
      volumeFilter: false,
    },
    parameters: {
      atrMultiplier: 2.0,
      stopLossPercent: 0.02,
    },
    requiredIndicators: [],
    rules: []
  };
}

// Strategy templates for the gallery
export const strategyTemplates: (StrategyConfig & { 
  category: string; 
  rating: number;
  winRate: number;
})[] = [
  {
    id: 'trend_following_ema',
    name: 'EMA Trend Following',
    description: 'A simple trend following strategy using EMA crossovers with RSI confirmation',
    version: '1.0.0',
    category: 'trend',
    rating: 4.2,
    winRate: 58,
    minConfidence: 0.7,
    maxSignalsPerHour: 3,
    riskRewardRatio: 2.5,
    stopLossMethod: 'atr',
    takeProfitMethod: 'fixed_ratio',
    filters: {
      timeFilters: [],
      volatilityFilter: true,
      trendFilter: true,
      volumeFilter: false,
    },
    parameters: {
      atrMultiplier: 2.5,
      stopLossPercent: 0.02,
    },
    requiredIndicators: ['EMA_20', 'EMA_50', 'RSI'],
    rules: [
      {
        id: 'ema_crossover',
        name: 'EMA Crossover',
        description: 'EMA 20 crosses above EMA 50 for bullish trend',
        category: 'entry',
        weight: 0.7,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'rsi_confirmation',
        name: 'RSI Confirmation',
        description: 'RSI above 50 confirms bullish trend',
        category: 'filter',
        weight: 0.5,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'trailing_stop',
        name: 'Trailing Stop',
        description: 'Exit when price falls below trailing stop',
        category: 'exit',
        weight: 1.0,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      }
    ]
  },
  {
    id: 'rsi_momentum',
    name: 'RSI Momentum Strategy',
    description: 'Captures momentum using RSI and MACD with volume confirmation',
    version: '1.0.0',
    category: 'momentum',
    rating: 4.5,
    winRate: 62,
    minConfidence: 0.75,
    maxSignalsPerHour: 2,
    riskRewardRatio: 2.0,
    stopLossMethod: 'percentage',
    takeProfitMethod: 'fixed_ratio',
    filters: {
      timeFilters: ['09:00-16:00'],
      volatilityFilter: false,
      trendFilter: false,
      volumeFilter: true,
    },
    parameters: {
      atrMultiplier: 2.0,
      stopLossPercent: 0.025,
    },
    requiredIndicators: ['RSI', 'MACD', 'VOLUME'],
    rules: [
      {
        id: 'rsi_oversold',
        name: 'RSI Oversold',
        description: 'RSI below 30 indicates oversold condition',
        category: 'entry',
        weight: 0.8,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'macd_confirmation',
        name: 'MACD Confirmation',
        description: 'MACD histogram turning positive',
        category: 'entry',
        weight: 0.6,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'volume_spike',
        name: 'Volume Confirmation',
        description: 'Volume above 150% of average',
        category: 'filter',
        weight: 0.4,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'rsi_exit',
        name: 'RSI Exit',
        description: 'Exit when RSI crosses above 70',
        category: 'exit',
        weight: 0.7,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      }
    ]
  },
  {
    id: 'bollinger_mean_reversion',
    name: 'Bollinger Band Mean Reversion',
    description: 'Trades price reversions to the mean using Bollinger Bands',
    version: '1.0.0',
    category: 'mean_reversion',
    rating: 4.0,
    winRate: 55,
    minConfidence: 0.7,
    maxSignalsPerHour: 4,
    riskRewardRatio: 1.5,
    stopLossMethod: 'percentage',
    takeProfitMethod: 'fixed_ratio',
    filters: {
      timeFilters: [],
      volatilityFilter: true,
      trendFilter: false,
      volumeFilter: false,
    },
    parameters: {
      atrMultiplier: 1.5,
      stopLossPercent: 0.02,
    },
    requiredIndicators: ['BBANDS', 'RSI'],
    rules: [
      {
        id: 'bb_lower_touch',
        name: 'BB Lower Band Touch',
        description: 'Price touches lower Bollinger Band',
        category: 'entry',
        weight: 0.8,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'rsi_oversold',
        name: 'RSI Oversold',
        description: 'RSI below 30 confirms oversold condition',
        category: 'filter',
        weight: 0.6,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'bb_middle_exit',
        name: 'BB Middle Band Exit',
        description: 'Exit when price reaches middle Bollinger Band',
        category: 'exit',
        weight: 0.7,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      }
    ]
  },
  {
    id: 'volatility_breakout',
    name: 'Volatility Breakout',
    description: 'Captures breakouts after periods of low volatility',
    version: '1.0.0',
    category: 'volatility',
    rating: 3.8,
    winRate: 48,
    minConfidence: 0.8,
    maxSignalsPerHour: 2,
    riskRewardRatio: 3.0,
    stopLossMethod: 'atr',
    takeProfitMethod: 'fixed_ratio',
    filters: {
      timeFilters: [],
      volatilityFilter: true,
      trendFilter: false,
      volumeFilter: true,
    },
    parameters: {
      atrMultiplier: 3.0,
      stopLossPercent: 0.03,
    },
    requiredIndicators: ['ATR', 'BBANDS', 'VOLUME'],
    rules: [
      {
        id: 'bb_squeeze',
        name: 'Bollinger Band Squeeze',
        description: 'Bollinger Bands narrowing (low volatility)',
        category: 'filter',
        weight: 0.7,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'price_breakout',
        name: 'Price Breakout',
        description: 'Price breaks out of Bollinger Bands',
        category: 'entry',
        weight: 0.9,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'volume_confirmation',
        name: 'Volume Confirmation',
        description: 'Volume spikes during breakout',
        category: 'filter',
        weight: 0.6,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'atr_exit',
        name: 'ATR-based Exit',
        description: 'Exit after price moves 2x ATR',
        category: 'exit',
        weight: 0.8,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      }
    ]
  },
  {
    id: 'multi_timeframe_momentum',
    name: 'Multi-Timeframe Momentum',
    description: 'Combines signals from multiple timeframes for stronger momentum trades',
    version: '1.0.0',
    category: 'momentum',
    rating: 4.7,
    winRate: 65,
    minConfidence: 0.8,
    maxSignalsPerHour: 1,
    riskRewardRatio: 2.5,
    stopLossMethod: 'atr',
    takeProfitMethod: 'trailing',
    filters: {
      timeFilters: [],
      volatilityFilter: false,
      trendFilter: true,
      volumeFilter: true,
    },
    parameters: {
      atrMultiplier: 2.0,
      stopLossPercent: 0.02,
    },
    requiredIndicators: ['RSI', 'MACD', 'EMA_20'],
    rules: [
      {
        id: 'higher_tf_trend',
        name: 'Higher Timeframe Trend',
        description: 'EMA trend on higher timeframe',
        category: 'filter',
        weight: 0.8,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'current_tf_momentum',
        name: 'Current Timeframe Momentum',
        description: 'RSI showing momentum on current timeframe',
        category: 'entry',
        weight: 0.7,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'macd_confirmation',
        name: 'MACD Confirmation',
        description: 'MACD confirming momentum direction',
        category: 'entry',
        weight: 0.6,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      },
      {
        id: 'trailing_exit',
        name: 'Trailing Exit',
        description: 'Exit using trailing stop based on ATR',
        category: 'exit',
        weight: 1.0,
        enabled: true,
        evaluate: () => ({ signal: 'neutral', confidence: 0, reasoning: '' })
      }
    ]
  }
];