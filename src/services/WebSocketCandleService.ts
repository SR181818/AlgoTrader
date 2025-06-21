import { Observable, Subject, BehaviorSubject, timer, of, throwError } from 'rxjs';
import { catchError, switchMap, retry, share, takeUntil, tap, finalize } from 'rxjs/operators';
import * as ccxt from 'ccxt';
import { CandleData, MarketData } from '../types/trading';

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

export class WebSocketCandleService {
  private exchange: ccxt.Exchange;
  private wsConnections = new Map<string, WebSocket>();
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

  constructor(exchange: ccxt.Exchange, config?: Partial<WebSocketConfig>) {
    this.exchange = exchange;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.log('WebSocketCandleService initialized');
  }

  /**
   * Subscribe to candlestick data for a specific symbol and interval
   */
  subscribeToCandleStream(symbol: string, interval: string): Observable<CandleData> {
    const streamKey = `${symbol.toLowerCase()}_${interval}_candle`;
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

    // Check if exchange supports WebSocket
    if (this.exchange.has['ws']) {
      this.createWebSocketConnection(symbol, interval, subscriptionId, subject);
    } else {
      // Fallback to REST polling for exchanges without WebSocket
      this.createRESTPollingConnection(symbol, interval, subscriptionId, subject);
    }

    return subject.asObservable();
  }

  /**
   * Subscribe to ticker data for a specific symbol
   */
  subscribeToTickerStream(symbol: string): Observable<MarketData> {
    const streamKey = `${symbol.toLowerCase()}_ticker`;
    const subscriptionId = `ticker_${symbol}`;
    
    if (this.streamSubjects.has(subscriptionId)) {
      return this.streamSubjects.get(subscriptionId)!.asObservable();
    }

    const subject = new Subject<MarketData>();
    this.streamSubjects.set(subscriptionId, subject);

    // Register stream subscription
    this.activeStreams.set(subscriptionId, {
      id: subscriptionId,
      symbol,
      type: 'ticker',
      active: true
    });

    // Check if exchange supports WebSocket
    if (this.exchange.has['ws']) {
      this.createWebSocketTickerConnection(symbol, subscriptionId, subject);
    } else {
      // Fallback to REST polling for exchanges without WebSocket
      this.createRESTTickerPollingConnection(symbol, subscriptionId, subject);
    }

    return subject.asObservable();
  }

  /**
   * Create WebSocket connection for candle data
   */
  private createWebSocketConnection(
    symbol: string, 
    interval: string, 
    subscriptionId: string,
    subject: Subject<CandleData>
  ): void {
    // This implementation depends on the specific exchange
    // Here's a generic approach that would need to be customized per exchange
    
    this.log(`Creating WebSocket connection for ${symbol} ${interval}`);
    this.updateConnectionStatus('connecting');
    
    // For ccxt-supported exchanges with unified WebSocket API
    if (typeof this.exchange.watchOHLCV === 'function') {
      const subscription = new Observable<CandleData>(observer => {
        let isActive = true;
        
        const watchCandles = async () => {
          try {
            // @ts-ignore - ccxt pro typings
            const ohlcvs = await this.exchange.watchOHLCV(symbol, interval);
            
            if (!isActive) return;
            
            if (ohlcvs && ohlcvs.length > 0) {
              const latestOHLCV = ohlcvs[ohlcvs.length - 1];
              
              const candle: CandleData = {
                timestamp: latestOHLCV[0],
                open: latestOHLCV[1],
                high: latestOHLCV[2],
                low: latestOHLCV[3],
                close: latestOHLCV[4],
                volume: latestOHLCV[5]
              };
              
              observer.next(candle);
              this.updateStreamActivity(subscriptionId);
            }
            
            // Continue watching
            watchCandles();
          } catch (error) {
            if (!isActive) return;
            observer.error(error);
          }
        };
        
        watchCandles();
        
        return () => {
          isActive = false;
          // Cleanup
        };
      })
      .pipe(
        retry({
          count: this.config.maxReconnectAttempts,
          delay: (error, retryCount) => {
            this.log(`Retrying connection for ${subscriptionId}, attempt ${retryCount}`);
            this.updateConnectionStatus('reconnecting');
            return timer(this.config.reconnectInterval * Math.pow(1.5, retryCount));
          }
        }),
        takeUntil(this.destroy$),
        share(),
        finalize(() => {
          this.log(`Finalizing WebSocket connection for ${subscriptionId}`);
        })
      )
      .subscribe({
        next: (candle) => {
          subject.next(candle);
          this.updateConnectionStatus('connected');
        },
        error: (error) => {
          this.log(`WebSocket error for ${subscriptionId}:`, error);
          subject.error(error);
          this.updateConnectionStatus('error', error.message);
        }
      });
      
      // Store subscription for cleanup
      this.wsConnections.set(subscriptionId, subscription as any);
    } else {
      // Fallback to REST polling
      this.log(`Exchange ${this.exchange.id} does not support WebSocket OHLCV, falling back to REST polling`);
      this.createRESTPollingConnection(symbol, interval, subscriptionId, subject);
    }
  }

  /**
   * Create WebSocket connection for ticker data
   */
  private createWebSocketTickerConnection(
    symbol: string,
    subscriptionId: string,
    subject: Subject<MarketData>
  ): void {
    this.log(`Creating WebSocket ticker connection for ${symbol}`);
    this.updateConnectionStatus('connecting');
    
    // For ccxt-supported exchanges with unified WebSocket API
    if (typeof this.exchange.watchTicker === 'function') {
      const subscription = new Observable<MarketData>(observer => {
        let isActive = true;
        
        const watchTicker = async () => {
          try {
            // @ts-ignore - ccxt pro typings
            const ticker = await this.exchange.watchTicker(symbol);
            
            if (!isActive) return;
            
            if (ticker) {
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
              
              observer.next(marketData);
              this.updateStreamActivity(subscriptionId);
            }
            
            // Continue watching
            watchTicker();
          } catch (error) {
            if (!isActive) return;
            observer.error(error);
          }
        };
        
        watchTicker();
        
        return () => {
          isActive = false;
          // Cleanup
        };
      })
      .pipe(
        retry({
          count: this.config.maxReconnectAttempts,
          delay: (error, retryCount) => {
            this.log(`Retrying ticker connection for ${subscriptionId}, attempt ${retryCount}`);
            this.updateConnectionStatus('reconnecting');
            return timer(this.config.reconnectInterval * Math.pow(1.5, retryCount));
          }
        }),
        takeUntil(this.destroy$),
        share(),
        finalize(() => {
          this.log(`Finalizing WebSocket ticker connection for ${subscriptionId}`);
        })
      )
      .subscribe({
        next: (marketData) => {
          subject.next(marketData);
          this.updateConnectionStatus('connected');
        },
        error: (error) => {
          this.log(`WebSocket ticker error for ${subscriptionId}:`, error);
          subject.error(error);
          this.updateConnectionStatus('error', error.message);
        }
      });
      
      // Store subscription for cleanup
      this.wsConnections.set(subscriptionId, subscription as any);
    } else {
      // Fallback to REST polling
      this.log(`Exchange ${this.exchange.id} does not support WebSocket ticker, falling back to REST polling`);
      this.createRESTTickerPollingConnection(symbol, subscriptionId, subject);
    }
  }

  /**
   * Create REST polling connection for candle data
   */
  private createRESTPollingConnection(
    symbol: string,
    interval: string,
    subscriptionId: string,
    subject: Subject<CandleData>
  ): void {
    this.log(`Creating REST polling connection for ${symbol} ${interval}`);
    
    const pollingInterval = this.getPollingIntervalForTimeframe(interval);
    
    const subscription = timer(0, pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          return new Observable<CandleData[]>(observer => {
            this.exchange.fetchOHLCV(symbol, interval, undefined, 1)
              .then(ohlcvs => {
                if (ohlcvs && ohlcvs.length > 0) {
                  const candles = ohlcvs.map(ohlcv => ({
                    timestamp: ohlcv[0],
                    open: ohlcv[1],
                    high: ohlcv[2],
                    low: ohlcv[3],
                    close: ohlcv[4],
                    volume: ohlcv[5]
                  }));
                  observer.next(candles);
                  observer.complete();
                } else {
                  observer.error(new Error('No OHLCV data returned'));
                }
              })
              .catch(error => {
                observer.error(error);
              });
          });
        }),
        catchError(error => {
          this.log(`Error fetching OHLCV for ${subscriptionId}:`, error);
          this.updateConnectionStatus('error', error.message);
          return throwError(() => error);
        }),
        retry({
          count: this.config.maxReconnectAttempts,
          delay: (error, retryCount) => {
            this.log(`Retrying REST connection for ${subscriptionId}, attempt ${retryCount}`);
            this.updateConnectionStatus('reconnecting');
            return timer(this.config.reconnectInterval * Math.pow(1.5, retryCount));
          }
        }),
        tap(() => {
          this.updateStreamActivity(subscriptionId);
          this.updateConnectionStatus('connected');
        })
      )
      .subscribe({
        next: (candles) => {
          if (candles.length > 0) {
            subject.next(candles[candles.length - 1]);
          }
        },
        error: (error) => {
          this.log(`REST polling error for ${subscriptionId}:`, error);
          subject.error(error);
        }
      });
    
    // Store subscription for cleanup
    this.wsConnections.set(subscriptionId, subscription as any);
  }

  /**
   * Create REST polling connection for ticker data
   */
  private createRESTTickerPollingConnection(
    symbol: string,
    subscriptionId: string,
    subject: Subject<MarketData>
  ): void {
    this.log(`Creating REST ticker polling connection for ${symbol}`);
    
    const pollingInterval = 5000; // 5 seconds for ticker
    
    const subscription = timer(0, pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          return new Observable<MarketData>(observer => {
            this.exchange.fetchTicker(symbol)
              .then(ticker => {
                if (ticker) {
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
                  observer.next(marketData);
                  observer.complete();
                } else {
                  observer.error(new Error('No ticker data returned'));
                }
              })
              .catch(error => {
                observer.error(error);
              });
          });
        }),
        catchError(error => {
          this.log(`Error fetching ticker for ${subscriptionId}:`, error);
          this.updateConnectionStatus('error', error.message);
          return throwError(() => error);
        }),
        retry({
          count: this.config.maxReconnectAttempts,
          delay: (error, retryCount) => {
            this.log(`Retrying REST ticker connection for ${subscriptionId}, attempt ${retryCount}`);
            this.updateConnectionStatus('reconnecting');
            return timer(this.config.reconnectInterval * Math.pow(1.5, retryCount));
          }
        }),
        tap(() => {
          this.updateStreamActivity(subscriptionId);
          this.updateConnectionStatus('connected');
        })
      )
      .subscribe({
        next: (marketData) => {
          subject.next(marketData);
        },
        error: (error) => {
          this.log(`REST ticker polling error for ${subscriptionId}:`, error);
          subject.error(error);
        }
      });
    
    // Store subscription for cleanup
    this.wsConnections.set(subscriptionId, subscription as any);
  }

  /**
   * Get polling interval for a timeframe
   */
  private getPollingIntervalForTimeframe(timeframe: string): number {
    // Poll more frequently for smaller timeframes
    switch (timeframe) {
      case '1m': return 15000; // 15 seconds
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
   * Update stream activity timestamp
   */
  private updateStreamActivity(subscriptionId: string): void {
    const stream = this.activeStreams.get(subscriptionId);
    if (stream) {
      stream.lastMessage = Date.now();
    }
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
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus.asObservable();
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
  unsubscribeFromStream(subscriptionId: string): void {
    this.log(`Unsubscribing from stream: ${subscriptionId}`);
    
    // Mark as inactive
    const stream = this.activeStreams.get(subscriptionId);
    if (stream) {
      stream.active = false;
    }

    // Close connection
    const connection = this.wsConnections.get(subscriptionId);
    if (connection) {
      if (connection instanceof WebSocket) {
        connection.close();
      } else if (typeof connection.unsubscribe === 'function') {
        connection.unsubscribe();
      }
      this.wsConnections.delete(subscriptionId);
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
   * Disconnect all streams
   */
  disconnectAll(): void {
    this.log('Disconnecting all streams');
    
    // Complete all subjects
    this.streamSubjects.forEach(subject => subject.complete());
    this.streamSubjects.clear();
    
    // Close all connections
    this.wsConnections.forEach(connection => {
      if (connection instanceof WebSocket) {
        connection.close();
      } else if (typeof connection.unsubscribe === 'function') {
        connection.unsubscribe();
      }
    });
    this.wsConnections.clear();
    
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
    this.log('Disposing WebSocketCandleService');
    this.disconnectAll();
    this.destroy$.next();
    this.destroy$.complete();
    this.connectionStatus.complete();
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocketCandle] ${message}`, ...args);
    }
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
      activeConnections: this.wsConnections.size,
      activeStreams: Array.from(this.activeStreams.values()).filter(s => s.active).length,
      totalReconnectAttempts,
      uptime: status.lastConnected ? Date.now() - status.lastConnected : 0
    };
  }
}