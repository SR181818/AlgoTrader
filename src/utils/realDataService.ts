import { LiveMarketDataService } from '../services/LiveMarketDataService';
import { MarketDataIntegrationService } from '../services/MarketDataIntegrationService';
import { CandleData, MarketData } from '../types/trading';

// Create singleton instances
const liveMarketDataService = new LiveMarketDataService({
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

const marketDataIntegrationService = new MarketDataIntegrationService(liveMarketDataService);

// Wrapper service for backward compatibility
class RealDataService {
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private marketData = new Map<string, MarketData>();
  private candleData = new Map<string, Map<string, CandleData[]>>();
  
  // Callback for metrics collection
  public onDataUpdate: ((symbol: string, timeframe: string, data: any, latencyMs: number) => void) | null = null;

  constructor() {
    // Initialize metrics callback
    liveMarketDataService.onDataUpdate = (symbol, timeframe, data, latencyMs) => {
      if (this.onDataUpdate) {
        this.onDataUpdate(symbol, timeframe, data, latencyMs);
      }
    };
  }

  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 200): Promise<CandleData[]> {
    return liveMarketDataService.fetchOHLCV(symbol, timeframe, limit);
  }

  async fetchTicker(symbol: string): Promise<MarketData> {
    return liveMarketDataService.fetchTicker(symbol);
  }

  subscribe(symbol: string, timeframe: string, callback: (data: any) => void) {
    const key = `${symbol}:${timeframe}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
      
      // Subscribe to market data integration service
      marketDataIntegrationService.subscribeToMarketData(symbol, timeframe).subscribe({
        next: (data) => {
          // Store data
          this.marketData.set(symbol, data.marketData);
          
          if (!this.candleData.has(symbol)) {
            this.candleData.set(symbol, new Map());
          }
          this.candleData.get(symbol)!.set(timeframe, data.candles);
          
          // Notify subscribers
          const subscribers = this.subscribers.get(key);
          if (subscribers) {
            subscribers.forEach(cb => {
              // Send market data
              cb({
                type: 'market_data',
                data: data.marketData
              });
              
              // Send candle data
              cb({
                type: 'candle_data',
                data: data.candles,
                timeframe
              });
            });
          }
        },
        error: (error) => {
          console.error(`Error in data subscription for ${symbol}:${timeframe}:`, error);
        }
      });
    }
    
    this.subscribers.get(key)!.add(callback);
  }

  unsubscribe(symbol: string, timeframe: string, callback: (data: any) => void) {
    const key = `${symbol}:${timeframe}`;
    const subscribers = this.subscribers.get(key);
    
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.subscribers.delete(key);
        marketDataIntegrationService.unsubscribeFromMarketData(symbol, timeframe);
      }
    }
  }

  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  getCandleData(symbol: string, timeframe: string): CandleData[] | undefined {
    return this.candleData.get(symbol)?.get(timeframe);
  }

  disconnect() {
    // Unsubscribe from all data streams
    this.subscribers.forEach((_, key) => {
      const [symbol, timeframe] = key.split(':');
      marketDataIntegrationService.unsubscribeFromMarketData(symbol, timeframe);
    });
    
    this.subscribers.clear();
  }
}

export const realDataService = new RealDataService();