export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  bb: {
    upper: number;
    middle: number;
    lower: number;
    position: 'above_upper' | 'at_upper' | 'middle' | 'at_lower' | 'below_lower';
    expansion: 'expanding' | 'contracting' | 'normal';
  };
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'contracting_red' | 'contracting_green' | 'expanding_red' | 'expanding_green';
  };
  stochRsi: {
    k: number;
    d: number;
    cross: 'bullish_cross' | 'bearish_cross' | 'none';
    zone: 'oversold' | 'neutral' | 'overbought';
  };
  rsi?: number;
  atr?: number;
  sar?: {
    value: number;
    trend: 'bullish' | 'bearish';
    flip: boolean;
  };
  klinger?: {
    value: number;
    signal: number;
    trend: 'uptick' | 'downtick' | 'neutral';
  };
}

export interface TradingSignal {
  signal: 'buy' | 'sell' | 'hold';
  ticker: string;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  take_profit_2?: number;
  confidence: number;
  timestamp: number;
  indicators: TechnicalIndicators;
  reasoning: string[];
}

export interface Trade {
  id: string;
  symbol: string;
  timeframe: string;
  signal: TradingSignal;
  status: 'open' | 'closed' | 'stopped';
  entry_time: number;
  exit_time?: number;
  pnl?: number;
  exit_reason?: 'take_profit' | 'take_profit_2' | 'stop_loss' | 'timeout';
  size: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
  lastUpdate: number;
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface TradingPair {
  symbol: string;
  name: string;
  category: 'crypto' | 'forex' | 'stocks' | 'commodities';
  baseAsset: string;
  quoteAsset: string;
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  exchange: string;
  ccxtSymbol: string;
}

export interface TimeframeConfig {
  id: string;
  name: string;
  minutes: number;
  ccxtTimeframe: string;
}

export interface TradingConfig {
  timeframes: TimeframeConfig[];
  tickers: string[];
  indicators: {
    BB: { period: number; stddev: number };
    MACD: { fast: number; slow: number; signal: number };
    StochRSI: { rsiPeriod: number; stochPeriod: number; smoothK: number };
    RSI: number;
    ATR: number;
    Klinger: boolean;
    SAR: boolean;
  };
  risk: {
    trade_size: number;
    stop_loss_pct: number;
    max_hold_candles: number;
    trailing_sl_after_tp1: boolean;
  };
}