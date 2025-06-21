import { Observable, Subject, BehaviorSubject, timer, EMPTY, fromEvent, merge } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { 
  retryWhen, 
  delay, 
  take, 
  catchError, 
  switchMap, 
  filter, 
  map, 
  tap, 
  share,
  takeUntil,
  distinctUntilChanged,
  throttleTime
} from 'rxjs/operators';
import { CandleData } from '../types/trading';

export interface BinanceKlineMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
  };
}

export interface BinanceTickerMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  P: string; // Price change percent
  p: string; // Price change
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
}

export interface WebSocketConfig {
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  enableLogging: boolean;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}

export interface StreamSubscription {
  id: string;
  symbol: string;
  interval?: string;
  type: 'kline' | 'ticker' | 'depth' | 'trade';
  active: boolean;
  lastMessage?: number;
}

export class BinanceWebSocketService {
  private readonly baseUrl = 'wss://stream.binance.com:9443/ws/';
  private readonly streamUrl = 'wss://stream.binance.com:9443/stream?streams=';
  
  // Connection management
  private connections = new Map<string, WebSocketSubject<any>>();
  private connectionStatus = new BehaviorSubject<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  
  // Stream management
  private activeStreams = new Map<string, StreamSubscription>();
  private streamSubjects = new Map<string, Subject<any>>();
  private reconnectAttempts = new Map<string, number>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  
  // Configuration
  private config: WebSocketConfig = {
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
    enableLogging: true,
  };

  // Cleanup subjects
  private destroy$ = new Subject<void>();

  constructor(config?: Partial<WebSocketConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.setupNetworkMonitoring();
    this.log('BinanceWebSocketService initialized');
  }

  /**
   * Subscribe to candlestick data for a specific symbol and interval
   */
  subscribeToCandleStream(symbol: string, interval: string): Observable<CandleData> {
    const streamKey = `${symbol.toLowerCase()}@kline_${interval}`;
    const subscriptionId = `candle_${symbol}_${interval}`;
    
    if (this.streamSubjects.has(subscriptionId)) {
      return this.streamSubjects.get(subscriptionId)!.asObservable();
    }

    const subject = new Subject<CandleData>();
    this.streamSubjects.set(subscriptionId, subject);

    // Register stream subscription
    this.activeStreams.set(subscriptionId, {
      id: subscriptionId,
      symbol,
      interval,
      type: 'kline',
      active: true
    });

    this.createConnection(streamKey, subscriptionId)
      .pipe(
        filter((message: BinanceKlineMessage) => message.e === 'kline'),
        map((message: BinanceKlineMessage) => this.normalizeKlineMessage(message)),
        tap(() => this.updateStreamActivity(subscriptionId)),
        retryWhen(errors => this.handleReconnection(errors, subscriptionId)),
        takeUntil(this.destroy$),
        share()
      )
      .subscribe({
        next: (candle) => {
          subject.next(candle);
          this.updateConnectionStatus('connected');
        },
        error: (error) => {
          this.log(`Stream error for ${subscriptionId}:`, error);
          subject.error(error);
          this.updateConnectionStatus('error', error.message);
        }
      });

    return subject.asObservable();
  }

  /**
   * Subscribe to 24hr ticker statistics
   */
  subscribeToTickerStream(symbol: string): Observable<BinanceTickerMessage> {
    const streamKey = `${symbol.toLowerCase()}@ticker`;
    const subscriptionId = `ticker_${symbol}`;
    
    if (this.streamSubjects.has(subscriptionId)) {
      return this.streamSubjects.get(subscriptionId)!.asObservable();
    }

    const subject = new Subject<BinanceTickerMessage>();
    this.streamSubjects.set(subscriptionId, subject);

    this.activeStreams.set(subscriptionId, {
      id: subscriptionId,
      symbol,
      type: 'ticker',
      active: true
    });

    this.createConnection(streamKey, subscriptionId)
      .pipe(
        filter((message: BinanceTickerMessage) => message.e === '24hrTicker'),
        tap(() => this.updateStreamActivity(subscriptionId)),
        retryWhen(errors => this.handleReconnection(errors, subscriptionId)),
        takeUntil(this.destroy$),
        share()
      )
      .subscribe({
        next: (ticker) => {
          subject.next(ticker);
          this.updateConnectionStatus('connected');
        },
        error: (error) => {
          this.log(`Ticker stream error for ${subscriptionId}:`, error);
          subject.error(error);
          this.updateConnectionStatus('error', error.message);
        }
      });

    return subject.asObservable();
  }

  /**
   * Subscribe to multiple streams simultaneously
   */
  subscribeToMultipleStreams(subscriptions: Array<{
    symbol: string;
    interval?: string;
    type: 'kline' | 'ticker';
  }>): Observable<{ type: string; symbol: string; data: any }> {
    const streams = subscriptions.map(sub => {
      if (sub.type === 'kline' && sub.interval) {
        return this.subscribeToCandleStream(sub.symbol, sub.interval).pipe(
          map(data => ({ type: 'kline', symbol: sub.symbol, data }))
        );
      } else if (sub.type === 'ticker') {
        return this.subscribeToTickerStream(sub.symbol).pipe(
          map(data => ({ type: 'ticker', symbol: sub.symbol, data }))
        );
      }
      return EMPTY;
    }).filter(stream => stream !== EMPTY);

    return merge(...streams);
  }

  /**
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus.asObservable().pipe(
      distinctUntilChanged((prev, curr) => 
        prev.status === curr.status && prev.reconnectAttempts === curr.reconnectAttempts
      )
    );
  }

  /**
   * Get active stream subscriptions
   */
  getActiveStreams(): StreamSubscription[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Unsubscribe from a specific stream
   */
  unsubscribeFromStream(symbol: string, interval?: string, type: 'kline' | 'ticker' = 'kline'): void {
    const subscriptionId = interval ? 
      `${type}_${symbol}_${interval}` : 
      `${type}_${symbol}`;
    
    this.log(`Unsubscribing from stream: ${subscriptionId}`);
    
    // Mark as inactive
    const stream = this.activeStreams.get(subscriptionId);
    if (stream) {
      stream.active = false;
    }

    // Close connection
    const streamKey = interval ? 
      `${symbol.toLowerCase()}@kline_${interval}` : 
      `${symbol.toLowerCase()}@ticker`;
    
    const connection = this.connections.get(streamKey);
    if (connection) {
      connection.complete();
      this.connections.delete(streamKey);
    }

    // Complete subject
    const subject = this.streamSubjects.get(subscriptionId);
    if (subject) {
      subject.complete();
      this.streamSubjects.delete(subscriptionId);
    }

    // Clean up
    this.activeStreams.delete(subscriptionId);
    this.reconnectAttempts.delete(subscriptionId);
    this.clearHeartbeat(subscriptionId);
  }

  /**
   * Disconnect all streams
   */
  disconnectAll(): void {
    this.log('Disconnecting all streams');
    
    // Complete all subjects
    this.streamSubjects.forEach(subject => subject.complete());
    this.streamSubjects.clear();
    
    // Close all connections
    this.connections.forEach(connection => connection.complete());
    this.connections.clear();
    
    // Clear all timers
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    this.heartbeatTimers.clear();
    
    // Reset state
    this.activeStreams.clear();
    this.reconnectAttempts.clear();
    this.updateConnectionStatus('disconnected');
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.log('Disposing BinanceWebSocketService');
    this.disconnectAll();
    this.destroy$.next();
    this.destroy$.complete();
    this.connectionStatus.complete();
  }

  /**
   * Create WebSocket connection for a stream
   */
  private createConnection(streamKey: string, subscriptionId: string): Observable<any> {
    const url = `${this.baseUrl}${streamKey}`;
    
    this.log(`Creating connection for: ${streamKey}`);
    this.updateConnectionStatus('connecting');
    
    const connection = webSocket({
      url,
      openObserver: {
        next: () => {
          this.log(`WebSocket connected: ${streamKey}`);
          this.updateConnectionStatus('connected');
          this.resetReconnectAttempts(subscriptionId);
          this.startHeartbeat(subscriptionId);
        }
      },
      closeObserver: {
        next: (event) => {
          this.log(`WebSocket disconnected: ${streamKey}`, event);
          this.updateConnectionStatus('disconnected');
          this.clearHeartbeat(subscriptionId);
        }
      },
      serializer: (value) => JSON.stringify(value),
      deserializer: (e) => {
        try {
          return JSON.parse(e.data);
        } catch (error) {
          this.log('Failed to parse WebSocket message:', error);
          return null;
        }
      }
    });

    this.connections.set(streamKey, connection);
    return connection.asObservable().pipe(
      filter(message => message !== null),
      throttleTime(10) // Prevent message flooding
    );
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(errors: Observable<any>, subscriptionId: string): Observable<any> {
    return errors.pipe(
      switchMap((error, index) => {
        const attempts = this.reconnectAttempts.get(subscriptionId) || 0;
        
        if (attempts >= this.config.maxReconnectAttempts) {
          this.log(`Max reconnection attempts reached for ${subscriptionId}`);
          this.updateConnectionStatus('error', 'Max reconnection attempts reached');
          return EMPTY;
        }

        this.reconnectAttempts.set(subscriptionId, attempts + 1);
        this.log(`Reconnecting to ${subscriptionId}, attempt ${attempts + 1}`);
        this.updateConnectionStatus('reconnecting');
        
        const delayTime = Math.min(
          this.config.reconnectInterval * Math.pow(2, attempts), // Exponential backoff
          30000 // Max 30 seconds
        );
        
        return timer(delayTime);
      })
    );
  }

  /**
   * Normalize Binance kline message to our CandleData format
   */
  private normalizeKlineMessage(message: BinanceKlineMessage): CandleData {
    const kline = message.k;
    
    return {
      timestamp: kline.t,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
    };
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(
    status: ConnectionStatus['status'], 
    error?: string
  ): void {
    const currentStatus = this.connectionStatus.value;
    
    this.connectionStatus.next({
      status,
      lastConnected: status === 'connected' ? Date.now() : currentStatus.lastConnected,
      reconnectAttempts: status === 'connected' ? 0 : currentStatus.reconnectAttempts,
      error
    });
  }

  /**
   * Update stream activity timestamp
   */
  private updateStreamActivity(subscriptionId: string): void {
    const stream = this.activeStreams.get(subscriptionId);
    if (stream) {
      stream.lastMessage = Date.now();
    }
  }

  /**
   * Reset reconnection attempts for a subscription
   */
  private resetReconnectAttempts(subscriptionId: string): void {
    this.reconnectAttempts.set(subscriptionId, 0);
  }

  /**
   * Start heartbeat monitoring for a subscription
   */
  private startHeartbeat(subscriptionId: string): void {
    this.clearHeartbeat(subscriptionId);
    
    const timer = setInterval(() => {
      const stream = this.activeStreams.get(subscriptionId);
      if (!stream || !stream.active) {
        this.clearHeartbeat(subscriptionId);
        return;
      }

      const now = Date.now();
      const lastMessage = stream.lastMessage || 0;
      const timeSinceLastMessage = now - lastMessage;

      // If no message received in 2x heartbeat interval, consider connection stale
      if (timeSinceLastMessage > this.config.heartbeatInterval * 2) {
        this.log(`Heartbeat timeout for ${subscriptionId}, forcing reconnection`);
        this.forceReconnection(subscriptionId);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(subscriptionId, timer);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(subscriptionId: string): void {
    const timer = this.heartbeatTimers.get(subscriptionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(subscriptionId);
    }
  }

  /**
   * Force reconnection for a subscription
   */
  private forceReconnection(subscriptionId: string): void {
    const stream = this.activeStreams.get(subscriptionId);
    if (!stream) return;

    // Find and close the connection
    let streamKey: string;
    if (stream.type === 'kline' && stream.interval) {
      streamKey = `${stream.symbol.toLowerCase()}@kline_${stream.interval}`;
    } else if (stream.type === 'ticker') {
      streamKey = `${stream.symbol.toLowerCase()}@ticker`;
    } else {
      return;
    }

    const connection = this.connections.get(streamKey);
    if (connection) {
      connection.error(new Error('Heartbeat timeout - forcing reconnection'));
    }
  }

  /**
   * Setup network connectivity monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      fromEvent(window, 'online').pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.log('Network connection restored');
        this.handleNetworkReconnection();
      });

      fromEvent(window, 'offline').pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.log('Network connection lost');
        this.updateConnectionStatus('disconnected', 'Network offline');
      });
    }
  }

  /**
   * Handle network reconnection
   */
  private handleNetworkReconnection(): void {
    // Restart all active streams after network reconnection
    const activeStreamIds = Array.from(this.activeStreams.keys());
    activeStreamIds.forEach(subscriptionId => {
      const stream = this.activeStreams.get(subscriptionId);
      if (stream && stream.active) {
        this.forceReconnection(subscriptionId);
      }
    });
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[BinanceWS] ${message}`, ...args);
    }
  }

  /**
   * Get available intervals for Binance
   */
  static getAvailableIntervals(): string[] {
    return [
      '1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h',
      '1d', '3d', '1w', '1M'
    ];
  }

  /**
   * Validate symbol format for Binance
   */
  static validateSymbol(symbol: string): boolean {
    // Binance symbols are typically like BTCUSDT, ETHUSDT, etc.
    return /^[A-Z]{2,10}[A-Z]{3,6}$/.test(symbol.replace('/', ''));
  }

  /**
   * Convert our symbol format to Binance format
   */
  static formatSymbolForBinance(symbol: string): string {
    return symbol.replace('/', '').toUpperCase();
  }

  /**
   * Convert Binance symbol format to our format
   */
  static formatSymbolFromBinance(binanceSymbol: string): string {
    // Convert BTCUSDT to BTC/USDT
    if (binanceSymbol.endsWith('USDT')) {
      const base = binanceSymbol.replace('USDT', '');
      return `${base}/USDT`;
    }
    if (binanceSymbol.endsWith('BTC')) {
      const base = binanceSymbol.replace('BTC', '');
      return `${base}/BTC`;
    }
    if (binanceSymbol.endsWith('ETH')) {
      const base = binanceSymbol.replace('ETH', '');
      return `${base}/ETH`;
    }
    return binanceSymbol;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    activeConnections: number;
    activeStreams: number;
    totalReconnectAttempts: number;
    uptime: number;
  } {
    const status = this.connectionStatus.value;
    const totalReconnectAttempts = Array.from(this.reconnectAttempts.values())
      .reduce((sum, attempts) => sum + attempts, 0);
    
    return {
      activeConnections: this.connections.size,
      activeStreams: Array.from(this.activeStreams.values()).filter(s => s.active).length,
      totalReconnectAttempts,
      uptime: status.lastConnected ? Date.now() - status.lastConnected : 0
    };
  }
}

// Singleton instance
export const binanceWebSocketService = new BinanceWebSocketService({
  enableLogging: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 15,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
});