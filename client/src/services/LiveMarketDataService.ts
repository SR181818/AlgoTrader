import { Observable, Subject, BehaviorSubject, interval, of, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, tap, retry, share, takeUntil, finalize } from 'rxjs/operators';
import * as ccxt from 'ccxt';
import { CandleData, MarketData, TradingPair } from '../types/trading';
import { TRADING_PAIRS } from '../data/tradingPairs';

export interface MarketDataUpdate {
  type: 'market_data';
  symbol: string;
  data: MarketData;
}

export interface CandleDataUpdate {
  type: 'candle_data';
  symbol: string;
  timeframe: string;
  data: CandleData[];
}

export type DataUpdate = MarketDataUpdate | CandleDataUpdate;

export interface ExchangeConfig {
  name: string;
  apiKey?: string;
  secret?: string;
  password?: string; // For some exchanges like OKX
  testnet: boolean;
  rateLimit: number;
}

export interface ServiceConfig {
  defaultExchange: string;
  exchanges: ExchangeConfig[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
  enableLogging: boolean;
  proxyUrl?: string;
}

export class LiveMarketDataService {
  private exchanges = new Map<string, ccxt.Exchange>();
  private subscribers = new Map<string, Subject<DataUpdate>>();
  private marketData = new Map<string, MarketData>();
  private candleData = new Map<string, Map<string, CandleData[]>>();
  private updateIntervals = new Map<string, any>();
  private destroy$ = new Subject<void>();
  private connectionStatus = new BehaviorSubject<{
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
    message?: string;
  }>({ status: 'disconnected' });
  private reconnectAttempts = new Map<string, number>();
  private readonly config: ServiceConfig;
  
  // Callback for metrics collection
  public onDataUpdate: ((symbol: string, timeframe: string, data: any, latencyMs: number) => void) | null = null;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.initializeExchanges();
  }

  /**
   * Initialize CCXT exchanges
   */
  private async initializeExchanges(): Promise<void> {
    try {
      this.updateConnectionStatus('connecting');
      
      for (const exchangeConfig of this.config.exchanges) {
        await this.initializeExchange(exchangeConfig);
      }
      
      this.updateConnectionStatus('connected');
      this.log('All exchanges initialized successfully');
    } catch (error) {
      this.updateConnectionStatus('error', `Failed to initialize exchanges: ${error}`);
      this.log('Failed to initialize exchanges:', error);
      
      // Initialize fallback data
      this.initializeFallbackData();
    }
  }

  /**
   * Initialize a single CCXT exchange
   */
  private async initializeExchange(config: ExchangeConfig): Promise<void> {
    try {
      const exchangeId = config.name.toLowerCase();
      const exchangeClass = ccxt[exchangeId as keyof typeof ccxt];
      
      if (!exchangeClass) {
        throw new Error(`Exchange ${config.name} not supported by CCXT`);
      }
      
      const exchangeOptions: any = {
        apiKey: config.apiKey,
        secret: config.secret,
        password: config.password,
        enableRateLimit: true,
        timeout: 30000,
      };
      
      // Add proxy if configured
      if (this.config.proxyUrl) {
        exchangeOptions.proxy = this.config.proxyUrl;
      }
      
      // Configure testnet if available
      if (config.testnet) {
        if (exchangeId === 'binance') {
          exchangeOptions.options = { defaultType: 'future', testnet: true };
        } else if (exchangeId === 'kucoin') {
          exchangeOptions.sandbox = true;
        } else if (exchangeId === 'bybit') {
          exchangeOptions.options = { testnet: true };
        } else if (exchangeId === 'okx') {
          exchangeOptions.options = { test: true };
        }
      }
      
      const exchange = new exchangeClass(exchangeOptions);
      
      // Load markets
      await exchange.loadMarkets();
      
      this.exchanges.set(exchangeId, exchange);
      this.log(`Exchange ${config.name} initialized successfully`);
    } catch (error) {
      this.log(`Failed to initialize exchange ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize fallback data for when exchanges can't be reached
   */
  private initializeFallbackData(): void {
    this.log('Initializing fallback data');
    
    // Generate fallback market data for all trading pairs
    TRADING_PAIRS.forEach(pair => {
      const basePrice = this.getBasePriceForSymbol(pair.symbol);
      const change24h = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
      
      this.marketData.set(pair.symbol, {
        symbol: pair.symbol,
        price: basePrice,
        change24h,
        volume: this.getVolumeForSymbol(pair.symbol),
        high24h: basePrice * (1 + Math.random() * 0.03),
        low24h: basePrice * (1 - Math.random() * 0.03),
        lastUpdate: Date.now(),
        bid: basePrice * 0.9995,
        ask: basePrice * 1.0005,
        spread: basePrice * 0.001
      });
      
      // Initialize candle data
      if (!this.candleData.has(pair.symbol)) {
        this.candleData.set(pair.symbol, new Map());
      }
      
      const symbolCandles = this.candleData.get(pair.symbol)!;
      ['1m', '5m', '15m', '30m', '1h', '4h', '1d'].forEach(timeframe => {
        symbolCandles.set(timeframe, this.generateFallbackCandles(pair.symbol, basePrice, timeframe));
      });
    });
  }

  /**
   * Get base price for a symbol (for fallback data)
   */
  private getBasePriceForSymbol(symbol: string): number {
    if (symbol === 'BTC/USDT') return 45000 + Math.random() * 20000;
    if (symbol === 'ETH/USDT') return 2500 + Math.random() * 1500;
    if (symbol === 'ADA/USDT') return 0.3 + Math.random() * 0.7;
    if (symbol === 'SOL/USDT') return 80 + Math.random() * 120;
    if (symbol === 'DOT/USDT') return 5 + Math.random() * 15;
    if (symbol === 'EUR/USD') return 1.05 + Math.random() * 0.15;
    if (symbol === 'GBP/USD') return 1.2 + Math.random() * 0.3;
    if (symbol === 'USD/JPY') return 140 + Math.random() * 15;
    if (symbol === 'XAU/USD') return 1900 + Math.random() * 400;
    if (symbol === 'XAG/USD') return 22 + Math.random() * 8;
    return 100 + Math.random() * 100; // Default fallback
  }

  /**
   * Get typical volume for a symbol (for fallback data)
   */
  private getVolumeForSymbol(symbol: string): number {
    if (symbol.includes('BTC')) return 1000 + Math.random() * 5000;
    if (symbol.includes('ETH')) return 5000 + Math.random() * 15000;
    if (symbol.includes('USD')) return 100000 + Math.random() * 500000;
    return 10000 + Math.random() * 50000;
  }

  /**
   * Generate fallback candle data
   */
  private generateFallbackCandles(symbol: string, basePrice: number, timeframe: string): CandleData[] {
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

  /**
   * Get timeframe in minutes
   */
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

  /**
   * Get volatility for a symbol (for fallback data)
   */
  private getVolatilityForSymbol(symbol: string): number {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 0.003; // 0.3%
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 0.0015; // 0.15%
    return 0.001; // 0.1% for major forex pairs
  }

  /**
   * Fetch OHLCV data from exchange
   */
  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 200): Promise<CandleData[]> {
    const startTime = Date.now();
    
    try {
      const pair = this.findTradingPair(symbol);
      if (!pair) {
        throw new Error(`Trading pair not found: ${symbol}`);
      }

      const exchange = this.getExchangeForPair(pair);
      if (!exchange) {
        throw new Error(`No exchange available for ${symbol}`);
      }

      // Check if timeframe is supported by the exchange
      const timeframes = exchange.timeframes;
      if (!timeframes || !timeframes[timeframe]) {
        throw new Error(`Timeframe ${timeframe} not supported by ${exchange.id}`);
      }

      // Fetch OHLCV data
      const ohlcv = await exchange.fetchOHLCV(pair.ccxtSymbol, timeframe, undefined, limit);
      
      // Normalize data
      const candles = ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      }));

      // Update local cache
      if (!this.candleData.has(symbol)) {
        this.candleData.set(symbol, new Map());
      }
      this.candleData.get(symbol)!.set(timeframe, candles);

      // Record metrics
      const latencyMs = Date.now() - startTime;
      if (this.onDataUpdate) {
        this.onDataUpdate(symbol, timeframe, candles, latencyMs);
      }

      return candles;
    } catch (error) {
      this.log(`Failed to fetch OHLCV for ${symbol}:`, error);
      
      // Return cached data if available
      const cached = this.getCachedCandles(symbol, timeframe);
      if (cached && cached.length > 0) {
        return cached;
      }
      
      // Return fallback data
      return this.generateFallbackCandles(symbol, this.getBasePriceForSymbol(symbol), timeframe);
    }
  }

  /**
   * Fetch ticker data from exchange
   */
  async fetchTicker(symbol: string): Promise<MarketData> {
    const startTime = Date.now();
    
    try {
      const pair = this.findTradingPair(symbol);
      if (!pair) {
        throw new Error(`Trading pair not found: ${symbol}`);
      }

      const exchange = this.getExchangeForPair(pair);
      if (!exchange) {
        throw new Error(`No exchange available for ${symbol}`);
      }

      // Fetch ticker
      const ticker = await exchange.fetchTicker(pair.ccxtSymbol);
      
      // Normalize data
      const marketData: MarketData = {
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

      // Update local cache
      this.marketData.set(symbol, marketData);

      // Record metrics
      const latencyMs = Date.now() - startTime;
      if (this.onDataUpdate) {
        this.onDataUpdate(symbol, 'ticker', marketData, latencyMs);
      }

      return marketData;
    } catch (error) {
      this.log(`Failed to fetch ticker for ${symbol}:`, error);
      
      // Return cached data if available
      const cached = this.marketData.get(symbol);
      if (cached) {
        return cached;
      }
      
      // Return fallback data
      return {
        symbol,
        price: this.getBasePriceForSymbol(symbol),
        change24h: (Math.random() - 0.5) * 5,
        volume: this.getVolumeForSymbol(symbol),
        high24h: 0,
        low24h: 0,
        lastUpdate: Date.now()
      };
    }
  }

  /**
   * Subscribe to market data updates
   */
  subscribe(symbol: string, timeframe: string): Observable<DataUpdate> {
    const key = `${symbol}:${timeframe}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Subject<DataUpdate>());
      this.startDataStream(symbol, timeframe);
    }
    
    return this.subscribers.get(key)!.asObservable();
  }

  /**
   * Unsubscribe from market data updates
   */
  unsubscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    const subject = this.subscribers.get(key);
    
    if (subject) {
      this.stopDataStream(symbol, timeframe);
      subject.complete();
      this.subscribers.delete(key);
    }
  }

  /**
   * Start data stream for a symbol and timeframe
   */
  private startDataStream(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    const subject = this.subscribers.get(key);
    
    if (!subject) return;
    
    // Initial data load
    this.loadInitialData(symbol, timeframe, subject);
    
    // Set up interval for regular updates
    const updateInterval = this.getUpdateIntervalForTimeframe(timeframe);
    
    const subscription = interval(updateInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          // Fetch market data and candles
          return this.fetchDataUpdates(symbol, timeframe).pipe(
            catchError(error => {
              this.log(`Error fetching data for ${key}:`, error);
              this.handleReconnection(key);
              return of(null);
            })
          );
        }),
        // Filter out null results
        map(result => result as [MarketData, CandleData[]] | null),
        // Only emit when we have data
        tap(result => {
          if (result) {
            const [marketData, candles] = result;
            
            // Emit market data update
            subject.next({
              type: 'market_data',
              symbol,
              data: marketData
            });
            
            // Emit candle data update
            subject.next({
              type: 'candle_data',
              symbol,
              timeframe,
              data: candles
            });
          }
        })
      )
      .subscribe({
        error: (err) => {
          this.log(`Stream error for ${key}:`, err);
          subject.error(err);
        }
      });
    
    this.updateIntervals.set(key, subscription);
  }

  /**
   * Stop data stream for a symbol and timeframe
   */
  private stopDataStream(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    const subscription = this.updateIntervals.get(key);
    
    if (subscription) {
      subscription.unsubscribe();
      this.updateIntervals.delete(key);
    }
  }

  /**
   * Load initial data for a symbol and timeframe
   */
  private async loadInitialData(symbol: string, timeframe: string, subject: Subject<DataUpdate>): Promise<void> {
    try {
      const [marketData, candles] = await Promise.all([
        this.fetchTicker(symbol),
        this.fetchOHLCV(symbol, timeframe)
      ]);
      
      // Emit market data update
      subject.next({
        type: 'market_data',
        symbol,
        data: marketData
      });
      
      // Emit candle data update
      subject.next({
        type: 'candle_data',
        symbol,
        timeframe,
        data: candles
      });
    } catch (error) {
      this.log(`Failed to load initial data for ${symbol}:${timeframe}:`, error);
      
      // Try to use cached data
      const marketData = this.marketData.get(symbol);
      const candles = this.getCachedCandles(symbol, timeframe);
      
      if (marketData) {
        subject.next({
          type: 'market_data',
          symbol,
          data: marketData
        });
      }
      
      if (candles && candles.length > 0) {
        subject.next({
          type: 'candle_data',
          symbol,
          timeframe,
          data: candles
        });
      }
    }
  }

  /**
   * Fetch data updates for a symbol and timeframe
   */
  private fetchDataUpdates(symbol: string, timeframe: string): Observable<[MarketData, CandleData[]]> {
    return new Observable<[MarketData, CandleData[]]>(observer => {
      Promise.all([
        this.fetchTicker(symbol),
        this.fetchOHLCV(symbol, timeframe, 50) // Fetch last 50 candles for updates
      ])
        .then(([marketData, candles]) => {
          observer.next([marketData, candles]);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(key: string): void {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= this.config.maxReconnectAttempts) {
      this.log(`Max reconnection attempts reached for ${key}`);
      return;
    }
    
    this.reconnectAttempts.set(key, attempts + 1);
    
    const backoffTime = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, attempts),
      60000 // Max 1 minute
    );
    
    this.log(`Reconnecting to ${key} in ${backoffTime}ms (attempt ${attempts + 1}/${this.config.maxReconnectAttempts})`);
    
    // Schedule reconnection
    timer(backoffTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const [symbol, timeframe] = key.split(':');
        const subject = this.subscribers.get(key);
        
        if (subject) {
          this.loadInitialData(symbol, timeframe, subject)
            .then(() => {
              this.log(`Reconnected to ${key} successfully`);
              this.reconnectAttempts.set(key, 0);
            })
            .catch(error => {
              this.log(`Failed to reconnect to ${key}:`, error);
              this.handleReconnection(key);
            });
        }
      });
  }

  /**
   * Get cached candle data
   */
  private getCachedCandles(symbol: string, timeframe: string): CandleData[] | undefined {
    return this.candleData.get(symbol)?.get(timeframe);
  }

  /**
   * Get update interval for a timeframe
   */
  private getUpdateIntervalForTimeframe(timeframe: string): number {
    // Update more frequently for smaller timeframes
    switch (timeframe) {
      case '1m': return 10000; // 10 seconds
      case '5m': return 30000; // 30 seconds
      case '15m': return 60000; // 1 minute
      case '30m': return 120000; // 2 minutes
      case '1h': return 300000; // 5 minutes
      case '4h': return 600000; // 10 minutes
      case '1d': return 1800000; // 30 minutes
      default: return 60000; // 1 minute default
    }
  }

  /**
   * Find trading pair configuration
   */
  private findTradingPair(symbol: string): TradingPair | undefined {
    return TRADING_PAIRS.find(pair => pair.symbol === symbol);
  }

  /**
   * Get exchange for a trading pair
   */
  private getExchangeForPair(pair: TradingPair): ccxt.Exchange | undefined {
    return this.exchanges.get(pair.exchange);
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected' | 'error', message?: string): void {
    this.connectionStatus.next({ status, message });
  }

  /**
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<{ status: string; message?: string }> {
    return this.connectionStatus.asObservable();
  }

  /**
   * Get market data
   */
  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  /**
   * Get all market data
   */
  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  /**
   * Get candle data
   */
  getCandleData(symbol: string, timeframe: string): CandleData[] | undefined {
    return this.candleData.get(symbol)?.get(timeframe);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.log('Disposing LiveMarketDataService');
    
    // Complete all subjects
    this.subscribers.forEach(subject => subject.complete());
    this.subscribers.clear();
    
    // Unsubscribe from all intervals
    this.updateIntervals.forEach(subscription => {
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.updateIntervals.clear();
    
    // Signal completion
    this.destroy$.next();
    this.destroy$.complete();
    this.connectionStatus.complete();
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[LiveMarketData] ${message}`, ...args);
    }
  }
}

// Create singleton instance with default configuration
export const liveMarketDataService = new LiveMarketDataService({
  defaultExchange: 'binance',
  exchanges: [
    {
      name: 'binance',
      testnet: true,
      rateLimit: 1000
    },
    {
      name: 'kucoin',
      testnet: true,
      rateLimit: 1000
    }
  ],
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  enableLogging: true
});