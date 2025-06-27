import { TradingPair, TimeframeConfig } from '../types/trading';

export const TIMEFRAMES: TimeframeConfig[] = [
  { id: '1m', name: '1 Minute', minutes: 1, ccxtTimeframe: '1m' },
  { id: '5m', name: '5 Minutes', minutes: 5, ccxtTimeframe: '5m' },
  { id: '15m', name: '15 Minutes', minutes: 15, ccxtTimeframe: '15m' },
  { id: '30m', name: '30 Minutes', minutes: 30, ccxtTimeframe: '30m' },
  { id: '1h', name: '1 Hour', minutes: 60, ccxtTimeframe: '1h' },
  { id: '4h', name: '4 Hours', minutes: 240, ccxtTimeframe: '4h' },
  { id: '1d', name: '1 Day', minutes: 1440, ccxtTimeframe: '1d' }
];

export const TRADING_PAIRS: TradingPair[] = [
  // Cryptocurrency pairs (Binance)
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin / Tether',
    category: 'crypto',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    minPrice: 0.01,
    maxPrice: 200000,
    tickSize: 0.01,
    exchange: 'binance',
    ccxtSymbol: 'BTC/USDT'
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum / Tether',
    category: 'crypto',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    minPrice: 0.01,
    maxPrice: 10000,
    tickSize: 0.01,
    exchange: 'binance',
    ccxtSymbol: 'ETH/USDT'
  },
  {
    symbol: 'ADA/USDT',
    name: 'Cardano / Tether',
    category: 'crypto',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    minPrice: 0.0001,
    maxPrice: 10,
    tickSize: 0.0001,
    exchange: 'binance',
    ccxtSymbol: 'ADA/USDT'
  },
  {
    symbol: 'SOL/USDT',
    name: 'Solana / Tether',
    category: 'crypto',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    minPrice: 0.01,
    maxPrice: 1000,
    tickSize: 0.01,
    exchange: 'binance',
    ccxtSymbol: 'SOL/USDT'
  },
  {
    symbol: 'DOT/USDT',
    name: 'Polkadot / Tether',
    category: 'crypto',
    baseAsset: 'DOT',
    quoteAsset: 'USDT',
    minPrice: 0.001,
    maxPrice: 100,
    tickSize: 0.001,
    exchange: 'binance',
    ccxtSymbol: 'DOT/USDT'
  },
  {
    symbol: 'DOGE/USDT',
    name: 'Dogecoin / Tether',
    category: 'crypto',
    baseAsset: 'DOGE',
    quoteAsset: 'USDT',
    minPrice: 0.00001,
    maxPrice: 1,
    tickSize: 0.00001,
    exchange: 'binance',
    ccxtSymbol: 'DOGE/USDT'
  },
  {
    symbol: 'XRP/USDT',
    name: 'Ripple / Tether',
    category: 'crypto',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    minPrice: 0.0001,
    maxPrice: 5,
    tickSize: 0.0001,
    exchange: 'binance',
    ccxtSymbol: 'XRP/USDT'
  },
  {
    symbol: 'LINK/USDT',
    name: 'Chainlink / Tether',
    category: 'crypto',
    baseAsset: 'LINK',
    quoteAsset: 'USDT',
    minPrice: 0.001,
    maxPrice: 100,
    tickSize: 0.001,
    exchange: 'binance',
    ccxtSymbol: 'LINK/USDT'
  },
  {
    symbol: 'MATIC/USDT',
    name: 'Polygon / Tether',
    category: 'crypto',
    baseAsset: 'MATIC',
    quoteAsset: 'USDT',
    minPrice: 0.0001,
    maxPrice: 10,
    tickSize: 0.0001,
    exchange: 'binance',
    ccxtSymbol: 'MATIC/USDT'
  },
  {
    symbol: 'AVAX/USDT',
    name: 'Avalanche / Tether',
    category: 'crypto',
    baseAsset: 'AVAX',
    quoteAsset: 'USDT',
    minPrice: 0.01,
    maxPrice: 500,
    tickSize: 0.01,
    exchange: 'binance',
    ccxtSymbol: 'AVAX/USDT'
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'All Markets', icon: '🌐' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿' }
];

export const DEFAULT_CONFIG = {
  timeframes: ['15m'],
  tickers: [
    'BTC/USDT',
    'ETH/USDT',
    'ADA/USDT',
    'SOL/USDT',
    'DOT/USDT',
    'DOGE/USDT',
    'XRP/USDT'
  ],
  indicators: {
    BB: { period: 20, stddev: 2 },
    MACD: { fast: 34, slow: 144, signal: 9 },
    StochRSI: { rsiPeriod: 20, stochPeriod: 1, smoothK: 1 },
    RSI: 14,
    ATR: 14,
    Klinger: true,
    SAR: true
  },
  risk: {
    trade_size: 50,
    stop_loss_pct: 0.35,
    max_hold_candles: 3,
    trailing_sl_after_tp1: true
  }
};