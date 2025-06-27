import axios from 'axios';
import crypto from 'crypto';
import { CandleData, MarketData, TradingPair } from '../types/trading';
import Logger from './logger';

const BINANCE_API_BASE = 'https://api.binance.com';

class BinanceDataService {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = true;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 200): Promise<CandleData[]> {
    // Binance uses KLINE endpoints
    const interval = this.mapTimeframe(timeframe);
    const url = `${BINANCE_API_BASE}/api/v3/klines?symbol=${this.toBinanceSymbol(symbol)}&interval=${interval}&limit=${limit}`;
    try {
      const res = await axios.get(url);
      return res.data.map((candle: any[]) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      Logger.error('Failed to fetch OHLCV from Binance:', error);
      return [];
    }
  }

  async fetchTicker(symbol: string): Promise<MarketData> {
    const url = `${BINANCE_API_BASE}/api/v3/ticker/24hr?symbol=${this.toBinanceSymbol(symbol)}`;
    try {
      const res = await axios.get(url);
      const t = res.data;
      return {
        symbol,
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.volume),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        lastUpdate: Date.now(),
        bid: parseFloat(t.bidPrice),
        ask: parseFloat(t.askPrice),
        spread: parseFloat(t.askPrice) - parseFloat(t.bidPrice)
      };
    } catch (error) {
      Logger.error('Failed to fetch ticker from Binance:', error);
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
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API key/secret required for trading');
    }
    const endpoint = '/api/v3/order';
    const url = `${BINANCE_API_BASE}${endpoint}`;
    const timestamp = Date.now();
    const params = `symbol=${this.toBinanceSymbol(symbol)}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(params).digest('hex');
    try {
      const res = await axios.post(url + '?' + params + `&signature=${signature}`, null, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });
      Logger.info(`Market order placed: ${side} ${quantity} ${symbol}`);
      return res.data;
    } catch (error) {
      Logger.error('Failed to place market order:', error);
      throw error;
    }
  }

  private toBinanceSymbol(symbol: string): string {
    return symbol.replace('/', '');
  }

  private mapTimeframe(timeframe: string): string {
    // Map to Binance intervals
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d'
    };
    return map[timeframe] || '1m';
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
      Logger.error('Failed to send initial data:', error);
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
        Logger.error('Error in real-time updates:', error);
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
}

export default BinanceDataService;