import ccxt from 'ccxt';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { StrategySignal } from '../trading/StrategyRunner';
import { OrderExecutor, Order, Position, Balance } from '../trading/OrderExecutor';

export interface TradingBotConfig {
  exchange: 'binance' | 'kucoin' | 'bybit' | 'okx';
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string; // For some exchanges like OKX
  testnet: boolean;
  tradingEnabled: boolean;
  symbols: string[];
  maxPositions: number;
  maxLeverage: number;
  riskPerTrade: number; // Percentage of account balance to risk per trade
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent?: number;
}

export interface TradingBotStatus {
  isRunning: boolean;
  activeSymbols: string[];
  positions: Position[];
  balance: Balance;
  lastSignal?: StrategySignal;
  lastOrder?: Order;
  errors: string[];
  startTime?: Date;
  uptime?: number;
}

export class TradingBotService {
  private exchange: ccxt.Exchange | null = null;
  private config: TradingBotConfig;
  private orderExecutor: OrderExecutor;
  private isRunning = false;
  private startTime: Date | null = null;
  private positions: Position[] = [];
  private balance: Balance = {};
  private lastSignal: StrategySignal | null = null;
  private lastOrder: Order | null = null;
  private errors: string[] = [];
  
  private statusSubject = new BehaviorSubject<TradingBotStatus>({
    isRunning: false,
    activeSymbols: [],
    positions: [],
    balance: {},
    errors: []
  });
  
  private signalSubject = new Subject<StrategySignal>();
  private orderSubject = new Subject<Order>();
  
  constructor(config: TradingBotConfig) {
    this.config = config;
    
    // Initialize order executor for trade execution
    this.orderExecutor = new OrderExecutor({
      paperTrading: !config.tradingEnabled,
      exchange: config.exchange,
      testnet: config.testnet,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      passphrase: config.passphrase,
      defaultOrderType: 'market',
      slippageTolerance: 0.1,
      maxOrderSize: 10000,
      enableStopLoss: true,
      enableTakeProfit: true
    });
    
    // Subscribe to order executor updates
    this.orderExecutor.getOrderUpdates().subscribe(order => {
      this.lastOrder = order;
      this.orderSubject.next(order);
      this.updateStatus();
    });
    
    this.orderExecutor.getPositionUpdates().subscribe(position => {
      // Update positions list
      const existingIndex = this.positions.findIndex(p => p.symbol === position.symbol);
      if (existingIndex >= 0) {
        this.positions[existingIndex] = position;
      } else {
        this.positions.push(position);
      }
      
      // Clean up closed positions
      this.positions = this.positions.filter(p => p.amount > 0);
      
      this.updateStatus();
    });
    
    this.orderExecutor.getBalanceUpdates().subscribe(balance => {
      this.balance = balance;
      this.updateStatus();
    });
    
    this.orderExecutor.getErrorUpdates().subscribe(error => {
      this.errors.push(`${new Date().toISOString()}: ${error.message}`);
      // Keep only the last 100 errors
      if (this.errors.length > 100) {
        this.errors = this.errors.slice(-100);
      }
      this.updateStatus();
    });
  }
  
  /**
   * Start the trading bot
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }
    
    try {
      this.isRunning = true;
      this.startTime = new Date();
      this.errors = [];
      
      // Initialize exchange if using real trading
      if (this.config.tradingEnabled) {
        await this.initializeExchange();
      }
      
      this.updateStatus();
      return true;
    } catch (error) {
      this.isRunning = false;
      this.errors.push(`Failed to start trading bot: ${error instanceof Error ? error.message : String(error)}`);
      this.updateStatus();
      return false;
    }
  }
  
  /**
   * Stop the trading bot
   */
  stop(): void {
    this.isRunning = false;
    this.startTime = null;
    this.updateStatus();
  }
  
  /**
   * Process a trading signal
   */
  async processSignal(signal: StrategySignal): Promise<Order | null> {
    if (!this.isRunning) {
      this.errors.push(`Cannot process signal: Trading bot is not running`);
      return null;
    }
    
    // Check if we're already at max positions
    if (this.positions.length >= this.config.maxPositions) {
      this.errors.push(`Cannot process signal: Maximum positions (${this.config.maxPositions}) reached`);
      return null;
    }
    
    // Check if we already have a position for this symbol
    const existingPosition = this.positions.find(p => 
      p.symbol === signal.metadata.symbol
    );
    
    if (existingPosition) {
      // If signal is opposite to current position, close the position
      if ((existingPosition.side === 'long' && signal.type === 'SHORT') ||
          (existingPosition.side === 'short' && signal.type === 'LONG')) {
        return this.closePosition(existingPosition.symbol);
      }
      
      // If signal matches current position, ignore
      this.errors.push(`Already have a ${existingPosition.side} position for ${existingPosition.symbol}`);
      return null;
    }
    
    // Process new signal
    this.lastSignal = signal;
    this.signalSubject.next(signal);
    
    try {
      // Calculate position size based on risk
      const positionSize = this.calculatePositionSize(
        signal.metadata.symbol,
        signal.price,
        signal.metadata.stopLoss
      );
      
      if (positionSize <= 0) {
        this.errors.push(`Cannot process signal: Invalid position size calculated`);
        return null;
      }
      
      // Create order intent
      const orderIntent = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        signal,
        symbol: signal.metadata.symbol,
        side: signal.type === 'LONG' ? 'buy' : 'sell',
        amount: positionSize,
        price: signal.price,
        stopLoss: signal.metadata.stopLoss,
        takeProfit: signal.metadata.takeProfit,
        timestamp: Date.now()
      };
      
      // Execute order
      const order = await this.orderExecutor.executeOrder(orderIntent);
      this.lastOrder = order;
      
      this.updateStatus();
      return order;
    } catch (error) {
      this.errors.push(`Failed to process signal: ${error instanceof Error ? error.message : String(error)}`);
      this.updateStatus();
      return null;
    }
  }
  
  /**
   * Close a position
   */
  async closePosition(symbol: string): Promise<Order | null> {
    const position = this.positions.find(p => p.symbol === symbol);
    if (!position) {
      this.errors.push(`Cannot close position: No position found for ${symbol}`);
      return null;
    }
    
    try {
      // Create a signal for closing the position
      const closeSignal: StrategySignal = {
        type: position.side === 'long' ? 'SHORT' : 'LONG', // Opposite direction to close
        strength: 'STRONG',
        confidence: 1,
        price: position.currentPrice,
        timestamp: Date.now(),
        reasoning: ['Manual position close'],
        indicators: [],
        metadata: {
          symbol: position.symbol,
          timeframe: '15m', // Default timeframe
          entryConditions: ['Manual close'],
          exitConditions: ['Manual close']
        }
      };
      
      // Create order intent
      const orderIntent = {
        id: `close_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        signal: closeSignal,
        symbol: position.symbol,
        side: position.side === 'long' ? 'sell' : 'buy',
        amount: position.amount,
        price: position.currentPrice,
        timestamp: Date.now()
      };
      
      // Execute order
      const order = await this.orderExecutor.executeOrder(orderIntent);
      this.lastOrder = order;
      
      this.updateStatus();
      return order;
    } catch (error) {
      this.errors.push(`Failed to close position: ${error instanceof Error ? error.message : String(error)}`);
      this.updateStatus();
      return null;
    }
  }
  
  /**
   * Calculate position size based on risk parameters
   */
  private calculatePositionSize(symbol: string, entryPrice: number, stopLoss?: number): number {
    // Get account balance
    const usdtBalance = this.balance.USDT?.free || 10000; // Default to 10000 for paper trading
    
    // Calculate risk amount
    const riskAmount = usdtBalance * this.config.riskPerTrade;
    
    // If no stop loss provided, use default percentage
    if (!stopLoss) {
      stopLoss = entryPrice * (1 - this.config.stopLossPercent);
    }
    
    // Calculate position size based on risk and stop loss
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    if (stopLossDistance <= 0) {
      this.errors.push(`Invalid stop loss distance for ${symbol}`);
      return 0;
    }
    
    const positionSize = riskAmount / stopLossDistance;
    
    // Limit position size to a percentage of balance
    const maxPositionSize = usdtBalance * 0.5 / entryPrice; // Max 50% of balance per position
    
    return Math.min(positionSize, maxPositionSize);
  }
  
  /**
   * Initialize CCXT exchange
   */
  private async initializeExchange(): Promise<void> {
    try {
      const exchangeId = this.config.exchange.toLowerCase();
      const exchangeClass = ccxt[exchangeId as keyof typeof ccxt];
      
      if (!exchangeClass) {
        throw new Error(`Exchange ${this.config.exchange} not supported by CCXT`);
      }
      
      const exchangeConfig: any = {
        apiKey: this.config.apiKey,
        secret: this.config.apiSecret,
        password: this.config.passphrase,
        enableRateLimit: true,
      };
      
      // Configure testnet if enabled
      if (this.config.testnet) {
        if (exchangeId === 'binance') {
          exchangeConfig.options = { defaultType: 'future', testnet: true };
        } else if (exchangeId === 'kucoin') {
          exchangeConfig.sandbox = true;
        } else if (exchangeId === 'bybit') {
          exchangeConfig.options = { testnet: true };
        } else if (exchangeId === 'okx') {
          exchangeConfig.options = { test: true };
        }
      }
      
      this.exchange = new exchangeClass(exchangeConfig);
      
      // Load markets
      await this.exchange.loadMarkets();
      console.log(`${this.config.exchange} exchange initialized (testnet: ${this.config.testnet})`);
      
    } catch (error) {
      this.errors.push(`Failed to initialize exchange: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Update status and emit to subscribers
   */
  private updateStatus(): void {
    const status: TradingBotStatus = {
      isRunning: this.isRunning,
      activeSymbols: this.config.symbols,
      positions: [...this.positions],
      balance: { ...this.balance },
      lastSignal: this.lastSignal || undefined,
      lastOrder: this.lastOrder || undefined,
      errors: [...this.errors],
      startTime: this.startTime || undefined,
      uptime: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : undefined
    };
    
    this.statusSubject.next(status);
  }
  
  /**
   * Get status updates as observable
   */
  getStatus(): Observable<TradingBotStatus> {
    return this.statusSubject.asObservable();
  }
  
  /**
   * Get signal updates as observable
   */
  getSignalUpdates(): Observable<StrategySignal> {
    return this.signalSubject.asObservable();
  }
  
  /**
   * Get order updates as observable
   */
  getOrderUpdates(): Observable<Order> {
    return this.orderSubject.asObservable();
  }
  
  /**
   * Get current positions
   */
  getPositions(): Position[] {
    return [...this.positions];
  }
  
  /**
   * Get current balance
   */
  getBalance(): Balance {
    return { ...this.balance };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): TradingBotConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<TradingBotConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateStatus();
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
    this.orderExecutor.dispose();
    this.statusSubject.complete();
    this.signalSubject.complete();
    this.orderSubject.complete();
  }
}