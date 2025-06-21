import { Observable, Subject } from 'rxjs';
import { CandleData } from '../types/trading';
import { StrategyRunner, StrategySignal, StrategyConfig } from './StrategyRunner';
import { OrderExecutor, OrderIntent, Order, ExecutorConfig } from './OrderExecutor';
import { RiskManager, RiskConfig } from './RiskManager';

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  strategy: StrategyConfig;
  riskConfig: RiskConfig;
  executorConfig: ExecutorConfig;
  replaySpeed: number; // 1 = real-time, 10 = 10x speed, etc.
  commission: number; // percentage per trade
  slippage: number; // percentage
}

export interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  timeInMarket: number; // percentage
  calmarRatio: number;
  sortinoRatio: number;
  equity: Array<{ timestamp: number; value: number }>;
  trades: BacktestTrade[];
  dailyReturns: number[];
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  commission: number;
  signal: StrategySignal;
  duration?: number; // in milliseconds
  status: 'open' | 'closed';
}

export interface BacktestProgress {
  currentDate: Date;
  progress: number; // 0-100
  processedCandles: number;
  totalCandles: number;
  currentEquity: number;
  currentDrawdown: number;
  tradesExecuted: number;
}

export class Backtester {
  private strategyRunner: StrategyRunner;
  private orderExecutor: OrderExecutor;
  private riskManager: RiskManager;
  private config: BacktestConfig;
  private candles: CandleData[] = [];
  private currentIndex = 0;
  private equity: Array<{ timestamp: number; value: number }> = [];
  private trades: BacktestTrade[] = [];
  private openTrades = new Map<string, BacktestTrade>();
  private progressSubject = new Subject<BacktestProgress>();
  private isRunning = false;
  private isPaused = false;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.strategyRunner = new StrategyRunner(config.strategy);
    this.orderExecutor = new OrderExecutor({
      ...config.executorConfig,
      paperTrading: true, // Always use paper trading for backtesting
    });
    this.riskManager = new RiskManager(config.riskConfig, config.initialBalance);
    
    this.setupEventHandlers();
  }

  /**
   * Load OHLCV data from CSV or array
   */
  loadData(data: CandleData[] | string): void {
    if (typeof data === 'string') {
      this.candles = this.parseCSV(data);
    } else {
      this.candles = data;
    }

    // Filter data by date range
    this.candles = this.candles.filter(candle => {
      const candleDate = new Date(candle.timestamp);
      return candleDate >= this.config.startDate && candleDate <= this.config.endDate;
    });

    console.log(`Loaded ${this.candles.length} candles for backtesting`);
  }

  /**
   * Start backtesting
   */
  async startBacktest(): Promise<BacktestResult> {
    if (this.candles.length === 0) {
      throw new Error('No data loaded for backtesting');
    }

    this.isRunning = true;
    this.isPaused = false;
    this.currentIndex = 0;
    this.equity = [{ timestamp: this.candles[0].timestamp, value: this.config.initialBalance }];
    this.trades = [];
    this.openTrades.clear();

    console.log('Starting backtest...');

    return new Promise((resolve, reject) => {
      const processCandles = async () => {
        try {
          while (this.currentIndex < this.candles.length && this.isRunning) {
            if (this.isPaused) {
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }

            await this.processCandle(this.candles[this.currentIndex]);
            this.currentIndex++;

            // Emit progress
            this.emitProgress();

            // Control replay speed
            if (this.config.replaySpeed < 1000) {
              await new Promise(resolve => setTimeout(resolve, 1000 / this.config.replaySpeed));
            }
          }

          if (this.isRunning) {
            const result = this.generateResults();
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      };

      processCandles();
    });
  }

  /**
   * Pause backtesting
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume backtesting
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Stop backtesting
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Get progress updates
   */
  getProgressUpdates(): Observable<BacktestProgress> {
    return this.progressSubject.asObservable();
  }

  /**
   * Process a single candle
   */
  private async processCandle(candle: CandleData): Promise<void> {
    // Update strategy with new candle
    this.strategyRunner.updateCandle(candle);

    // Update current equity
    const currentEquity = this.calculateCurrentEquity(candle.close);
    this.equity.push({ timestamp: candle.timestamp, value: currentEquity });

    // Check for exit conditions on open trades
    this.checkExitConditions(candle);

    // Update risk manager
    this.riskManager.updateAccountBalance(currentEquity);
  }

  /**
   * Setup event handlers for strategy signals and order execution
   */
  private setupEventHandlers(): void {
    // Listen for strategy signals
    this.strategyRunner.getStrategySignals().subscribe(signal => {
      if (signal.type !== 'HOLD') {
        this.handleStrategySignal(signal);
      }
    });

    // Listen for order updates
    this.orderExecutor.getOrderUpdates().subscribe(order => {
      this.handleOrderUpdate(order);
    });
  }

  /**
   * Handle strategy signal
   */
  private handleStrategySignal(signal: StrategySignal): void {
    const currentCandle = this.candles[this.currentIndex];
    if (!currentCandle) return;

    // Create order intent
    const orderIntent: OrderIntent = {
      id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      signal,
      symbol: signal.metadata.symbol || 'BTC/USDT',
      side: signal.type === 'LONG' ? 'buy' : 'sell',
      amount: 0, // Will be calculated by risk manager
      price: currentCandle.close,
      stopLoss: signal.metadata.stopLoss,
      takeProfit: signal.metadata.takeProfit,
      timestamp: currentCandle.timestamp,
    };

    // Calculate position size using risk manager
    const riskAssessment = this.riskManager.assessTradeRisk(
      orderIntent.symbol,
      orderIntent.side,
      1, // Temporary size for assessment
      orderIntent.price || currentCandle.close,
      orderIntent.stopLoss || currentCandle.close * 0.98,
      orderIntent.takeProfit
    );

    if (!riskAssessment.approved) {
      console.log(`Trade rejected: ${riskAssessment.restrictions.join(', ')}`);
      return;
    }

    orderIntent.amount = riskAssessment.positionSize.recommendedSize;

    // Execute order
    this.orderExecutor.executeOrder(orderIntent);
  }

  /**
   * Handle order update
   */
  private handleOrderUpdate(order: Order): void {
    if (order.status === 'filled') {
      const trade: BacktestTrade = {
        id: order.id,
        symbol: order.intent.symbol,
        side: order.intent.side,
        entryTime: order.timestamp,
        entryPrice: order.executedPrice,
        quantity: order.executedAmount,
        commission: order.fees + (order.executedAmount * order.executedPrice * this.config.commission),
        signal: order.intent.signal,
        status: 'open',
      };

      this.openTrades.set(order.id, trade);
      console.log(`Trade opened: ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entryPrice}`);
    }
  }

  /**
   * Check exit conditions for open trades
   */
  private checkExitConditions(candle: CandleData): void {
    this.openTrades.forEach((trade, tradeId) => {
      let shouldExit = false;
      let exitReason = '';
      let exitPrice = candle.close;

      // Check stop loss
      if (trade.signal.metadata.stopLoss) {
        if (trade.side === 'buy' && candle.low <= trade.signal.metadata.stopLoss) {
          shouldExit = true;
          exitReason = 'stop_loss';
          exitPrice = trade.signal.metadata.stopLoss;
        } else if (trade.side === 'sell' && candle.high >= trade.signal.metadata.stopLoss) {
          shouldExit = true;
          exitReason = 'stop_loss';
          exitPrice = trade.signal.metadata.stopLoss;
        }
      }

      // Check take profit
      if (!shouldExit && trade.signal.metadata.takeProfit) {
        if (trade.side === 'buy' && candle.high >= trade.signal.metadata.takeProfit) {
          shouldExit = true;
          exitReason = 'take_profit';
          exitPrice = trade.signal.metadata.takeProfit;
        } else if (trade.side === 'sell' && candle.low <= trade.signal.metadata.takeProfit) {
          shouldExit = true;
          exitReason = 'take_profit';
          exitPrice = trade.signal.metadata.takeProfit;
        }
      }

      // Check time-based exit (optional)
      const maxHoldTime = 24 * 60 * 60 * 1000; // 24 hours
      if (!shouldExit && candle.timestamp - trade.entryTime > maxHoldTime) {
        shouldExit = true;
        exitReason = 'time_exit';
        exitPrice = candle.close;
      }

      if (shouldExit) {
        this.closeTrade(tradeId, exitPrice, candle.timestamp, exitReason);
      }
    });
  }

  /**
   * Close a trade
   */
  private closeTrade(tradeId: string, exitPrice: number, exitTime: number, reason: string): void {
    const trade = this.openTrades.get(tradeId);
    if (!trade) return;

    // Calculate PnL
    const pnl = trade.side === 'buy' 
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;
    
    const pnlAfterCommission = pnl - trade.commission;
    const pnlPercent = (pnlAfterCommission / (trade.entryPrice * trade.quantity)) * 100;

    // Update trade
    trade.exitTime = exitTime;
    trade.exitPrice = exitPrice;
    trade.pnl = pnlAfterCommission;
    trade.pnlPercent = pnlPercent;
    trade.duration = exitTime - trade.entryTime;
    trade.status = 'closed';

    // Move to closed trades
    this.trades.push(trade);
    this.openTrades.delete(tradeId);

    // Update risk manager
    this.riskManager.updateAfterTrade(
      trade.symbol,
      trade.side === 'buy' ? 'sell' : 'buy', // Closing position
      trade.quantity,
      exitPrice,
      pnlAfterCommission
    );

    console.log(`Trade closed: ${reason} - PnL: ${pnlAfterCommission.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
  }

  /**
   * Calculate current equity including open positions
   */
  private calculateCurrentEquity(currentPrice: number): number {
    let equity = this.config.initialBalance;
    
    // Add realized PnL from closed trades
    this.trades.forEach(trade => {
      if (trade.pnl) {
        equity += trade.pnl;
      }
    });

    // Add unrealized PnL from open trades
    this.openTrades.forEach(trade => {
      const unrealizedPnL = trade.side === 'buy'
        ? (currentPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - currentPrice) * trade.quantity;
      equity += unrealizedPnL;
    });

    return equity;
  }

  /**
   * Emit progress update
   */
  private emitProgress(): void {
    const progress = (this.currentIndex / this.candles.length) * 100;
    const currentCandle = this.candles[this.currentIndex];
    const currentEquity = this.calculateCurrentEquity(currentCandle.close);
    const peak = Math.max(...this.equity.map(e => e.value));
    const currentDrawdown = (currentEquity - peak) / peak;

    this.progressSubject.next({
      currentDate: new Date(currentCandle.timestamp),
      progress,
      processedCandles: this.currentIndex,
      totalCandles: this.candles.length,
      currentEquity,
      currentDrawdown,
      tradesExecuted: this.trades.length,
    });
  }

  /**
   * Generate final backtest results
   */
  private generateResults(): BacktestResult {
    const finalEquity = this.equity[this.equity.length - 1].value;
    const totalReturn = finalEquity - this.config.initialBalance;
    const totalReturnPercent = (totalReturn / this.config.initialBalance) * 100;

    // Calculate drawdown
    let maxDrawdown = 0;
    let peak = this.config.initialBalance;
    this.equity.forEach(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Calculate trade statistics
    const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = this.trades.filter(t => (t.pnl || 0) < 0);
    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0;

    // Calculate daily returns for Sharpe ratio
    const dailyReturns = this.calculateDailyReturns();
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
    const sortinoRatio = this.calculateSortinoRatio(dailyReturns);
    const calmarRatio = totalReturnPercent / (maxDrawdown * 100);

    return {
      totalReturn,
      totalReturnPercent,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown * 100,
      winRate,
      profitFactor,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      consecutiveWins: this.calculateConsecutiveWins(),
      consecutiveLosses: this.calculateConsecutiveLosses(),
      timeInMarket: this.calculateTimeInMarket(),
      calmarRatio,
      sortinoRatio,
      equity: this.equity,
      trades: this.trades,
      dailyReturns,
    };
  }

  /**
   * Parse CSV data
   */
  private parseCSV(csvData: string): CandleData[] {
    const lines = csvData.trim().split('\n');
    const header = lines[0].toLowerCase().split(',');
    
    const timestampIndex = header.findIndex(h => h.includes('timestamp') || h.includes('time') || h.includes('date'));
    const openIndex = header.findIndex(h => h.includes('open'));
    const highIndex = header.findIndex(h => h.includes('high'));
    const lowIndex = header.findIndex(h => h.includes('low'));
    const closeIndex = header.findIndex(h => h.includes('close'));
    const volumeIndex = header.findIndex(h => h.includes('volume'));

    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        timestamp: new Date(values[timestampIndex]).getTime(),
        open: parseFloat(values[openIndex]),
        high: parseFloat(values[highIndex]),
        low: parseFloat(values[lowIndex]),
        close: parseFloat(values[closeIndex]),
        volume: parseFloat(values[volumeIndex] || '0'),
      };
    }).filter(candle => !isNaN(candle.timestamp) && !isNaN(candle.close));
  }

  /**
   * Calculate daily returns
   */
  private calculateDailyReturns(): number[] {
    const dailyEquity = new Map<string, number>();
    
    this.equity.forEach(point => {
      const date = new Date(point.timestamp).toDateString();
      dailyEquity.set(date, point.value);
    });

    const values = Array.from(dailyEquity.values());
    const returns: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      const dailyReturn = (values[i] - values[i - 1]) / values[i - 1];
      returns.push(dailyReturn);
    }

    return returns;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;
    
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)) : 0;
  }

  /**
   * Calculate Sortino ratio
   */
  private calculateSortinoRatio(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;
    
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const negativeReturns = dailyReturns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return Infinity;
    
    const downwardDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    );
    
    return downwardDeviation > 0 ? (avgReturn * Math.sqrt(252)) / (downwardDeviation * Math.sqrt(252)) : 0;
  }

  /**
   * Calculate consecutive wins
   */
  private calculateConsecutiveWins(): number {
    let maxConsecutive = 0;
    let current = 0;
    
    this.trades.forEach(trade => {
      if ((trade.pnl || 0) > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });
    
    return maxConsecutive;
  }

  /**
   * Calculate consecutive losses
   */
  private calculateConsecutiveLosses(): number {
    let maxConsecutive = 0;
    let current = 0;
    
    this.trades.forEach(trade => {
      if ((trade.pnl || 0) < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });
    
    return maxConsecutive;
  }

  /**
   * Calculate time in market percentage
   */
  private calculateTimeInMarket(): number {
    if (this.candles.length === 0) return 0;
    
    const totalTime = this.candles[this.candles.length - 1].timestamp - this.candles[0].timestamp;
    let timeInMarket = 0;
    
    this.trades.forEach(trade => {
      if (trade.exitTime) {
        timeInMarket += trade.exitTime - trade.entryTime;
      }
    });
    
    return totalTime > 0 ? (timeInMarket / totalTime) * 100 : 0;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
    this.progressSubject.complete();
    this.strategyRunner.dispose();
    this.orderExecutor.dispose();
  }
}