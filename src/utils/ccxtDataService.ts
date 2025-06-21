import ccxt from 'ccxt';
import { CandleData, MarketData, TradingPair } from '../types/trading';

class CCXTDataService {
  private exchanges: Map<string, ccxt.Exchange> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private candleData: Map<string, Map<string, CandleData[]>> = new Map(); // symbol -> timeframe -> candles
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private isRealMode = false;

  constructor() {
    this.initializeExchanges();
  }

  private async initializeExchanges() {
    try {
      // Check if CCXT constructors are available in browser environment
      if (typeof ccxt.binance !== 'function' || typeof ccxt.oanda !== 'function') {
        console.log('CCXT not available in browser environment, switching to demo mode');
        this.initializeDemoMode();
        return;
      }

      // Initialize Binance for crypto
      const binance = new ccxt.binance({
        apiKey: '', // Add your API keys if needed for higher rate limits
        secret: '',
        sandbox: false,
        enableRateLimit: true,
      });

      // Initialize OANDA for forex and commodities
      const oanda = new ccxt.oanda({
        apiKey: '', // Add your OANDA API key
        secret: '',
        sandbox: true, // Set to false for live trading
        enableRateLimit: true,
      });

      this.exchanges.set('binance', binance);
      this.exchanges.set('oanda', oanda);

      // Load markets
      await Promise.all([
        binance.loadMarkets(),
        oanda.loadMarkets()
      ]);

      this.isInitialized = true;
      this.isRealMode = true;
      console.log('CCXT exchanges initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CCXT exchanges:', error);
      // Fallback to demo mode if CCXT fails
      this.initializeDemoMode();
    }
  }

  private initializeDemoMode() {
    console.log('Running in demo mode with simulated data');
    this.isInitialized = true;
    this.isRealMode = false;
    // Initialize with demo data similar to the previous implementation
    this.initializeSimulatedData();
  }

  private initializeSimulatedData() {
    // Fallback simulation data (same as before)
    const basePrices: Record<string, number> = {
      'BTC/USDT': 45000 + Math.random() * 20000,
      'ETH/USDT': 2500 + Math.random() * 1500,
      'ADA/USDT': 0.3 + Math.random() * 0.7,
      'SOL/USDT': 80 + Math.random() * 120,
      'DOT/USDT': 5 + Math.random() * 15,
      'EUR/USD': 1.0500 + Math.random() * 0.1500,
      'GBP/USD': 1.2000 + Math.random() * 0.3000,
      'USD/JPY': 140.00 + Math.random() * 15.00,
      'USD/CHF': 0.9000 + Math.random() * 0.2000,
      'AUD/USD': 0.6500 + Math.random() * 0.1500,
      'USD/CAD': 1.3500 + Math.random() * 0.2000,
      'NZD/USD': 0.6000 + Math.random() * 0.1500,
      'EUR/GBP': 0.8500 + Math.random() * 0.1000,
      'EUR/JPY': 150.00 + Math.random() * 15.00,
      'GBP/JPY': 180.00 + Math.random() * 15.00,
      'XAU/USD': 1900.00 + Math.random() * 400.00,
      'XAG/USD': 22.00 + Math.random() * 8.00,
      'WTI/USD': 70.00 + Math.random() * 30.00
    };

    Object.entries(basePrices).forEach(([symbol, basePrice]) => {
      const change24h = (Math.random() - 0.5) * 10;
      const volume = this.getVolumeForSymbol(symbol);
      
      this.marketData.set(symbol, {
        symbol,
        price: basePrice,
        change24h,
        volume,
        high24h: basePrice * (1 + Math.random() * 0.05),
        low24h: basePrice * (1 - Math.random() * 0.05),
        lastUpdate: Date.now(),
        bid: basePrice * 0.9999,
        ask: basePrice * 1.0001,
        spread: basePrice * 0.0002
      });

      // Initialize candle data for different timeframes
      if (!this.candleData.has(symbol)) {
        this.candleData.set(symbol, new Map());
      }
      
      const symbolCandles = this.candleData.get(symbol)!;
      ['1m', '5m', '15m', '30m', '1h', '4h', '1d'].forEach(timeframe => {
        symbolCandles.set(timeframe, this.generateInitialCandles(symbol, basePrice, timeframe));
      });
    });
  }

  private getVolumeForSymbol(symbol: string): number {
    if (symbol.includes('BTC')) return 1000 + Math.random() * 5000;
    if (symbol.includes('ETH')) return 5000 + Math.random() * 15000;
    if (symbol.includes('USD')) return 100000 + Math.random() * 500000;
    return 10000 + Math.random() * 50000;
  }

  private generateInitialCandles(symbol: string, basePrice: number, timeframe: string): CandleData[] {
    const candles: CandleData[] = [];
    const now = Date.now();
    const timeframeMinutes = this.getTimeframeMinutes(timeframe);
    let currentPrice = basePrice;

    for (let i = 199; i >= 0; i--) {
      const timestamp = now - (i * timeframeMinutes * 60 * 1000);
      const volatility = this.getVolatilityForSymbol(symbol);
      const priceChange = (Math.random() - 0.5) * volatility;
      
      const open = currentPrice;
      currentPrice = currentPrice * (1 + priceChange);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = this.getVolumeForSymbol(symbol) * (0.5 + Math.random());

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }

    return candles;
  }

  private getTimeframeMinutes(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };
    return timeframeMap[timeframe] || 15;
  }

  private getVolatilityForSymbol(symbol: string): number {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 0.003;
    if (symbol.includes('TRY') || symbol.includes('ZAR')) return 0.002;
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 0.0015;
    return 0.001;
  }

  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 200): Promise<CandleData[]> {
    if (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If not in real mode, return simulated data directly
    if (!this.isRealMode) {
      return this.getSimulatedCandles(symbol, timeframe);
    }

    try {
      const pair = this.findTradingPair(symbol);
      if (!pair) {
        throw new Error(`Trading pair not found: ${symbol}`);
      }

      const exchange = this.exchanges.get(pair.exchange);
      if (!exchange) {
        throw new Error(`Exchange not found: ${pair.exchange}`);
      }

      const ohlcv = await exchange.fetchOHLCV(pair.ccxtSymbol, timeframe, undefined, limit);
      
      return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      }));
    } catch (error) {
      console.error(`Failed to fetch OHLCV for ${symbol}:`, error);
      // Return simulated data as fallback
      return this.getSimulatedCandles(symbol, timeframe);
    }
  }

  async fetchTicker(symbol: string): Promise<MarketData> {
    if (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If not in real mode, return simulated data directly
    if (!this.isRealMode) {
      return this.getSimulatedMarketData(symbol);
    }

    try {
      const pair = this.findTradingPair(symbol);
      if (!pair) {
        throw new Error(`Trading pair not found: ${symbol}`);
      }

      const exchange = this.exchanges.get(pair.exchange);
      if (!exchange) {
        throw new Error(`Exchange not found: ${pair.exchange}`);
      }

      const ticker = await exchange.fetchTicker(pair.ccxtSymbol);
      
      return {
        symbol,
        price: ticker.last || 0,
        change24h: ticker.percentage || 0,
        volume: ticker.baseVolume || 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        lastUpdate: Date.now(),
        bid: ticker.bid,
        ask: ticker.ask,
        spread: ticker.ask && ticker.bid ? ticker.ask - ticker.bid : undefined
      };
    } catch (error) {
      console.error(`Failed to fetch ticker for ${symbol}:`, error);
      // Return simulated data as fallback
      return this.getSimulatedMarketData(symbol);
    }
  }

  private findTradingPair(symbol: string): TradingPair | undefined {
    // This would be imported from tradingPairs.ts
    // For now, return a basic mapping
    const pairs: Record<string, TradingPair> = {
      'BTC/USDT': {
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
      'EUR/USD': {
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
      }
    };
    
    return pairs[symbol];
  }

  private getSimulatedCandles(symbol: string, timeframe: string): CandleData[] {
    const symbolCandles = this.candleData.get(symbol);
    if (symbolCandles) {
      return symbolCandles.get(timeframe) || [];
    }
    return [];
  }

  private getSimulatedMarketData(symbol: string): MarketData {
    return this.marketData.get(symbol) || {
      symbol,
      price: 0,
      change24h: 0,
      volume: 0,
      high24h: 0,
      low24h: 0,
      lastUpdate: Date.now()
    };
  }

  subscribe(symbol: string, timeframe: string, callback: (data: any) => void) {
    const key = `${symbol}:${timeframe}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Start real-time updates
    if (!this.updateIntervals.has(key)) {
      this.startRealTimeUpdates(symbol, timeframe);
    }

    // Send initial data
    this.sendInitialData(symbol, timeframe, callback);
  }

  unsubscribe(symbol: string, timeframe: string, callback: (data: any) => void) {
    const key = `${symbol}:${timeframe}`;
    const symbolSubscribers = this.subscribers.get(key);
    if (symbolSubscribers) {
      symbolSubscribers.delete(callback);
      if (symbolSubscribers.size === 0) {
        this.subscribers.delete(key);
        this.stopRealTimeUpdates(key);
      }
    }
  }

  private async sendInitialData(symbol: string, timeframe: string, callback: (data: any) => void) {
    try {
      const [marketData, candles] = await Promise.all([
        this.fetchTicker(symbol),
        this.fetchOHLCV(symbol, timeframe)
      ]);

      callback({
        type: 'market_data',
        data: marketData
      });

      callback({
        type: 'candle_data',
        data: candles,
        timeframe
      });
    } catch (error) {
      console.error('Failed to send initial data:', error);
    }
  }

  private startRealTimeUpdates(symbol: string, timeframe: string) {
    const key = `${symbol}:${timeframe}`;
    const timeframeMinutes = this.getTimeframeMinutes(timeframe);
    const updateInterval = Math.min(timeframeMinutes * 60 * 1000, 30000); // Max 30 seconds

    const interval = setInterval(async () => {
      try {
        const [marketData, candles] = await Promise.all([
          this.fetchTicker(symbol),
          this.fetchOHLCV(symbol, timeframe, 50) // Get last 50 candles
        ]);

        const subscribers = this.subscribers.get(key);
        if (subscribers) {
          subscribers.forEach(callback => {
            callback({
              type: 'market_data',
              data: marketData
            });
            callback({
              type: 'candle_data',
              data: candles,
              timeframe
            });
          });
        }
      } catch (error) {
        console.error(`Failed to update data for ${key}:`, error);
      }
    }, updateInterval);

    this.updateIntervals.set(key, interval);
  }

  private stopRealTimeUpdates(key: string) {
    const interval = this.updateIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(key);
    }
  }

  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  getCandleData(symbol: string, timeframe: string): CandleData[] | undefined {
    const symbolCandles = this.candleData.get(symbol);
    return symbolCandles?.get(timeframe);
  }

  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  disconnect() {
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    this.subscribers.clear();
  }
}

export const ccxtDataService = new CCXTDataService();