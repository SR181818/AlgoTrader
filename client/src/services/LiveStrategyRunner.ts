import { BehaviorSubject, Observable, combineLatest, interval } from 'rxjs';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { binanceMarketData, CandleData, TickerData } from './BinanceMarketData';

export interface StrategySignal {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  confidence: number;
  reason: string;
  indicators: { [key: string]: number };
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: number;
  status: 'OPEN' | 'CLOSED';
}

export interface StrategyConfig {
  name: string;
  symbol: string;
  enabled: boolean;
  riskPerTrade: number; // Percentage of balance to risk per trade
  stopLoss: number; // Percentage
  takeProfit: number; // Percentage
  indicators: {
    ema20: boolean;
    ema50: boolean;
    rsi: boolean;
    macd: boolean;
  };
}

/**
 * Live strategy runner with real-time Binance data
 */
export class LiveStrategyRunner {
  private signalsSubject = new BehaviorSubject<StrategySignal[]>([]);
  private positionsSubject = new BehaviorSubject<Position[]>([]);
  private isRunning = false;
  private config: StrategyConfig;
  private candles: CandleData[] = [];
  private currentTicker: TickerData | null = null;

  constructor(config: StrategyConfig) {
    this.config = config;
    console.log(`[LiveStrategyRunner] Initialized for ${config.symbol}`);
  }

  /**
   * Start the strategy with live data
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[LiveStrategyRunner] Starting strategy for ${this.config.symbol}`);

    // Subscribe to live candle data
    binanceMarketData.subscribeToCandles(this.config.symbol, '1m').subscribe(
      candles => {
        this.candles = candles;
        this.analyzeMarket();
      }
    );

    // Subscribe to live ticker data
    binanceMarketData.subscribeToTicker(this.config.symbol).subscribe(
      ticker => {
        this.currentTicker = ticker;
        this.updatePositions();
      }
    );

    // Run analysis every 5 seconds
    interval(5000).subscribe(() => {
      if (this.isRunning && this.candles.length > 0) {
        this.analyzeMarket();
      }
    });
  }

  /**
   * Stop the strategy
   */
  stop(): void {
    this.isRunning = false;
    console.log(`[LiveStrategyRunner] Stopped strategy for ${this.config.symbol}`);
  }

  /**
   * Analyze market conditions and generate signals
   */
  private analyzeMarket(): void {
    if (this.candles.length < 50) return; // Need enough data for indicators

    try {
      const indicators = this.calculateIndicators();
      const signal = this.generateSignal(indicators);
      
      if (signal.action !== 'HOLD') {
        const signals = this.signalsSubject.value;
        signals.unshift(signal);
        
        // Keep only last 100 signals
        if (signals.length > 100) {
          signals.splice(100);
        }
        
        this.signalsSubject.next([...signals]);
        
        // Execute trade if signal is strong enough
        if (signal.confidence > 0.7) {
          this.executeTrade(signal);
        }
      }
    } catch (error) {
      console.error('[LiveStrategyRunner] Analysis error:', error);
    }
  }

  /**
   * Calculate technical indicators
   */
  private calculateIndicators(): { [key: string]: number } {
    const closes = this.candles.map(c => c.close);
    const highs = this.candles.map(c => c.high);
    const lows = this.candles.map(c => c.low);
    
    // Simple moving averages (EMA approximation)
    const ema20 = this.calculateSMA(closes.slice(-20));
    const ema50 = this.calculateSMA(closes.slice(-50));
    
    // RSI calculation
    const rsi = this.calculateRSI(closes, 14);
    
    // MACD approximation
    const ema12 = this.calculateSMA(closes.slice(-12));
    const ema26 = this.calculateSMA(closes.slice(-26));
    const macd = ema12 - ema26;
    
    return {
      ema20,
      ema50,
      rsi,
      macd,
      currentPrice: closes[closes.length - 1]
    };
  }

  /**
   * Generate trading signal based on indicators
   */
  private generateSignal(indicators: { [key: string]: number }): StrategySignal {
    const { ema20, ema50, rsi, macd, currentPrice } = indicators;
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    // Multi-indicator confluence strategy
    const signals: { action: 'BUY' | 'SELL' | 'HOLD'; weight: number; reason: string }[] = [];
    
    // EMA crossover
    if (ema20 > ema50) {
      signals.push({ action: 'BUY', weight: 0.3, reason: 'EMA20 > EMA50' });
    } else if (ema20 < ema50) {
      signals.push({ action: 'SELL', weight: 0.3, reason: 'EMA20 < EMA50' });
    }
    
    // RSI oversold/overbought
    if (rsi < 30) {
      signals.push({ action: 'BUY', weight: 0.25, reason: 'RSI oversold' });
    } else if (rsi > 70) {
      signals.push({ action: 'SELL', weight: 0.25, reason: 'RSI overbought' });
    }
    
    // MACD signal
    if (macd > 0) {
      signals.push({ action: 'BUY', weight: 0.2, reason: 'MACD bullish' });
    } else if (macd < 0) {
      signals.push({ action: 'SELL', weight: 0.2, reason: 'MACD bearish' });
    }
    
    // Calculate weighted signal
    const buyWeight = signals.filter(s => s.action === 'BUY').reduce((sum, s) => sum + s.weight, 0);
    const sellWeight = signals.filter(s => s.action === 'SELL').reduce((sum, s) => sum + s.weight, 0);
    
    if (buyWeight > sellWeight && buyWeight > 0.5) {
      action = 'BUY';
      confidence = buyWeight;
      reason = signals.filter(s => s.action === 'BUY').map(s => s.reason).join(', ');
    } else if (sellWeight > buyWeight && sellWeight > 0.5) {
      action = 'SELL';
      confidence = sellWeight;
      reason = signals.filter(s => s.action === 'SELL').map(s => s.reason).join(', ');
    }
    
    return {
      id: Date.now().toString(),
      timestamp: Date.now(),
      symbol: this.config.symbol,
      action,
      price: currentPrice,
      confidence,
      reason,
      indicators
    };
  }

  /**
   * Execute trade based on signal
   */
  private executeTrade(signal: StrategySignal): void {
    console.log(`[LiveStrategyRunner] Executing ${signal.action} signal for ${signal.symbol} at ${signal.price}`);
    
    // Close opposite positions first
    const positions = this.positionsSubject.value;
    const oppositePositions = positions.filter(p => 
      p.symbol === signal.symbol && 
      p.status === 'OPEN' && 
      ((signal.action === 'BUY' && p.side === 'SHORT') || (signal.action === 'SELL' && p.side === 'LONG'))
    );
    
    oppositePositions.forEach(pos => this.closePosition(pos.id));
    
    // Open new position
    if (signal.action === 'BUY' || signal.action === 'SELL') {
      const position: Position = {
        id: Date.now().toString(),
        symbol: signal.symbol,
        side: signal.action === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: signal.price,
        currentPrice: signal.price,
        quantity: this.calculatePositionSize(signal.price),
        pnl: 0,
        pnlPercent: 0,
        entryTime: Date.now(),
        status: 'OPEN'
      };
      
      const updatedPositions = [position, ...positions];
      this.positionsSubject.next(updatedPositions);
    }
  }

  /**
   * Calculate position size based on risk management
   */
  private calculatePositionSize(price: number): number {
    // Simple position sizing: risk 1% of $10000 mock balance
    const balance = 10000;
    const riskAmount = balance * (this.config.riskPerTrade / 100);
    const stopLossDistance = price * (this.config.stopLoss / 100);
    
    return riskAmount / stopLossDistance;
  }

  /**
   * Update all open positions with current prices
   */
  private async updatePositions(): Promise<void> {
    if (!this.currentTicker) return;
    
    const positions = this.positionsSubject.value;
    const openPositions = positions.filter(p => p.status === 'OPEN');
    
    for (const position of openPositions) {
      try {
        const pnlData = await binanceMarketData.calculatePnL(
          position.symbol,
          position.side,
          position.entryPrice,
          position.quantity
        );
        
        position.currentPrice = pnlData.currentPrice;
        position.pnl = pnlData.pnl;
        position.pnlPercent = pnlData.pnlPercent;
        
        // Check stop loss and take profit
        if (position.pnlPercent <= -this.config.stopLoss) {
          this.closePosition(position.id, 'Stop Loss');
        } else if (position.pnlPercent >= this.config.takeProfit) {
          this.closePosition(position.id, 'Take Profit');
        }
      } catch (error) {
        console.error(`[LiveStrategyRunner] Failed to update position ${position.id}:`, error);
      }
    }
    
    this.positionsSubject.next([...positions]);
  }

  /**
   * Close a position
   */
  private closePosition(positionId: string, reason?: string): void {
    const positions = this.positionsSubject.value;
    const position = positions.find(p => p.id === positionId);
    
    if (position) {
      position.status = 'CLOSED';
      console.log(`[LiveStrategyRunner] Closed position ${positionId} - ${reason || 'Manual close'} - PnL: ${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)`);
      this.positionsSubject.next([...positions]);
    }
  }

  /**
   * Simple moving average calculation
   */
  private calculateSMA(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * RSI calculation
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Get signals observable
   */
  getSignals(): Observable<StrategySignal[]> {
    return this.signalsSubject.asObservable();
  }

  /**
   * Get positions observable
   */
  getPositions(): Observable<Position[]> {
    return this.positionsSubject.asObservable();
  }

  /**
   * Update strategy configuration
   */
  updateConfig(config: StrategyConfig): void {
    this.config = config;
    console.log(`[LiveStrategyRunner] Updated config for ${config.symbol}`);
  }

  /**
   * Get current strategy status
   */
  getStatus(): { isRunning: boolean; symbol: string; signalCount: number; openPositions: number } {
    return {
      isRunning: this.isRunning,
      symbol: this.config.symbol,
      signalCount: this.signalsSubject.value.length,
      openPositions: this.positionsSubject.value.filter(p => p.status === 'OPEN').length
    };
  }
}