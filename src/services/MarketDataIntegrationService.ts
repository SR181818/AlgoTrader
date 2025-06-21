import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, filter, catchError, tap, shareReplay } from 'rxjs/operators';
import { LiveMarketDataService, DataUpdate } from './LiveMarketDataService';
import { TechnicalIndicatorService, IndicatorConfig, IndicatorResult } from './TechnicalIndicatorService';
import { CandleData, MarketData } from '../types/trading';

export interface MarketDataWithIndicators {
  symbol: string;
  timeframe: string;
  marketData: MarketData;
  candles: CandleData[];
  indicators: Record<string, IndicatorResult | null>;
  lastUpdate: number;
}

export class MarketDataIntegrationService {
  private dataService: LiveMarketDataService;
  private activeSubscriptions = new Map<string, Observable<MarketDataWithIndicators>>();
  private indicatorConfigs = new Map<string, IndicatorConfig[]>();
  private errorSubject = new Subject<{ symbol: string; timeframe: string; error: any }>();
  private statusSubject = new BehaviorSubject<{ status: string; message?: string }>({ status: 'idle' });
  
  constructor(dataService: LiveMarketDataService) {
    this.dataService = dataService;
  }
  
  /**
   * Subscribe to market data with indicators
   */
  subscribeToMarketData(
    symbol: string,
    timeframe: string,
    indicators: IndicatorConfig[] = []
  ): Observable<MarketDataWithIndicators> {
    const key = `${symbol}:${timeframe}`;
    
    // Return existing subscription if available
    if (this.activeSubscriptions.has(key)) {
      return this.activeSubscriptions.get(key)!;
    }
    
    // Store indicator configs
    this.indicatorConfigs.set(key, indicators);
    
    // Create new subscription
    this.statusSubject.next({ status: 'connecting', message: `Connecting to ${symbol} ${timeframe}` });
    
    // Subscribe to market data
    const dataStream = this.dataService.subscribe(symbol, timeframe);
    
    // Track latest market data and candles
    let latestMarketData: MarketData | null = null;
    let latestCandles: CandleData[] | null = null;
    
    // Create integrated data stream
    const integratedStream = dataStream.pipe(
      tap(update => {
        if (update.type === 'market_data') {
          latestMarketData = update.data;
        } else if (update.type === 'candle_data') {
          latestCandles = update.data;
        }
      }),
      filter(() => latestMarketData !== null && latestCandles !== null && latestCandles.length > 0),
      map(() => {
        // Calculate indicators
        const calculatedIndicators = TechnicalIndicatorService.calculateIndicators(
          latestCandles!,
          this.indicatorConfigs.get(key) || []
        );
        
        return {
          symbol,
          timeframe,
          marketData: latestMarketData!,
          candles: latestCandles!,
          indicators: calculatedIndicators,
          lastUpdate: Date.now()
        };
      }),
      catchError(error => {
        this.errorSubject.next({ symbol, timeframe, error });
        this.statusSubject.next({ 
          status: 'error', 
          message: `Error processing data for ${symbol} ${timeframe}: ${error.message}` 
        });
        return of({
          symbol,
          timeframe,
          marketData: latestMarketData || this.createEmptyMarketData(symbol),
          candles: latestCandles || [],
          indicators: {},
          lastUpdate: Date.now()
        });
      }),
      tap(() => {
        this.statusSubject.next({ status: 'connected', message: `Connected to ${symbol} ${timeframe}` });
      }),
      shareReplay(1)
    );
    
    // Store subscription
    this.activeSubscriptions.set(key, integratedStream);
    
    return integratedStream;
  }
  
  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    
    if (this.activeSubscriptions.has(key)) {
      this.dataService.unsubscribe(symbol, timeframe);
      this.activeSubscriptions.delete(key);
      this.indicatorConfigs.delete(key);
    }
  }
  
  /**
   * Update indicator configurations
   */
  updateIndicators(
    symbol: string,
    timeframe: string,
    indicators: IndicatorConfig[]
  ): void {
    const key = `${symbol}:${timeframe}`;
    this.indicatorConfigs.set(key, indicators);
  }
  
  /**
   * Get errors as observable
   */
  getErrors(): Observable<{ symbol: string; timeframe: string; error: any }> {
    return this.errorSubject.asObservable();
  }
  
  /**
   * Get status as observable
   */
  getStatus(): Observable<{ status: string; message?: string }> {
    return this.statusSubject.asObservable();
  }
  
  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }
  
  /**
   * Create empty market data object
   */
  private createEmptyMarketData(symbol: string): MarketData {
    return {
      symbol,
      price: 0,
      change24h: 0,
      volume: 0,
      high24h: 0,
      low24h: 0,
      lastUpdate: Date.now()
    };
  }
  
  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Unsubscribe from all data streams
    this.activeSubscriptions.forEach((_, key) => {
      const [symbol, timeframe] = key.split(':');
      this.dataService.unsubscribe(symbol, timeframe);
    });
    
    // Clear all collections
    this.activeSubscriptions.clear();
    this.indicatorConfigs.clear();
    
    // Complete subjects
    this.errorSubject.complete();
    this.statusSubject.complete();
  }
}