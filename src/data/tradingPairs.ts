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
  
  // Major Forex pairs (OANDA)
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'forex',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    minPrice: 0.8000,
    maxPrice: 1.5000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'EUR/USD'
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    category: 'forex',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    minPrice: 1.0000,
    maxPrice: 2.0000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'GBP/USD'
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    minPrice: 100.00,
    maxPrice: 160.00,
    tickSize: 0.001,
    exchange: 'oanda',
    ccxtSymbol: 'USD/JPY'
  },
  {
    symbol: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    category: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'CHF',
    minPrice: 0.8000,
    maxPrice: 1.2000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'USD/CHF'
  },
  {
    symbol: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    category: 'forex',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    minPrice: 0.6000,
    maxPrice: 0.9000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'AUD/USD'
  },
  {
    symbol: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    category: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'CAD',
    minPrice: 1.2000,
    maxPrice: 1.6000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'USD/CAD'
  },
  {
    symbol: 'NZD/USD',
    name: 'New Zealand Dollar / US Dollar',
    category: 'forex',
    baseAsset: 'NZD',
    quoteAsset: 'USD',
    minPrice: 0.5000,
    maxPrice: 0.8000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'NZD/USD'
  },
  
  // Cross pairs
  {
    symbol: 'EUR/GBP',
    name: 'Euro / British Pound',
    category: 'forex',
    baseAsset: 'EUR',
    quoteAsset: 'GBP',
    minPrice: 0.8000,
    maxPrice: 1.0000,
    tickSize: 0.00001,
    exchange: 'oanda',
    ccxtSymbol: 'EUR/GBP'
  },
  {
    symbol: 'EUR/JPY',
    name: 'Euro / Japanese Yen',
    category: 'forex',
    baseAsset: 'EUR',
    quoteAsset: 'JPY',
    minPrice: 120.00,
    maxPrice: 170.00,
    tickSize: 0.001,
    exchange: 'oanda',
    ccxtSymbol: 'EUR/JPY'
  },
  {
    symbol: 'GBP/JPY',
    name: 'British Pound / Japanese Yen',
    category: 'forex',
    baseAsset: 'GBP',
    quoteAsset: 'JPY',
    minPrice: 140.00,
    maxPrice: 200.00,
    tickSize: 0.001,
    exchange: 'oanda',
    ccxtSymbol: 'GBP/JPY'
  },
  
  // Commodities (OANDA)
  {
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    category: 'commodities',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    minPrice: 1500.00,
    maxPrice: 2500.00,
    tickSize: 0.01,
    exchange: 'oanda',
    ccxtSymbol: 'XAU/USD'
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver / US Dollar',
    category: 'commodities',
    baseAsset: 'XAG',
    quoteAsset: 'USD',
    minPrice: 15.00,
    maxPrice: 35.00,
    tickSize: 0.001,
    exchange: 'oanda',
    ccxtSymbol: 'XAG/USD'
  },
  {
    symbol: 'WTI/USD',
    name: 'WTI Crude Oil / US Dollar',
    category: 'commodities',
    baseAsset: 'WTI',
    quoteAsset: 'USD',
    minPrice: 40.00,
    maxPrice: 120.00,
    tickSize: 0.01,
    exchange: 'oanda',
    ccxtSymbol: 'BCO/USD'
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'All Markets', icon: '🌐' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
  { id: 'forex', name: 'Forex', icon: '💱' },
  { id: 'commodities', name: 'Commodities', icon: '🥇' },
  { id: 'stocks', name: 'Stocks', icon: '📈' }
];

export const DEFAULT_CONFIG = {
  timeframes: ['15m'],
  tickers: [
    'BTC/USDT',
    'ETH/USDT',
    'EUR/USD',
    'GBP/USD',
    'USD/JPY',
    'XAU/USD',
    'XAG/USD'
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