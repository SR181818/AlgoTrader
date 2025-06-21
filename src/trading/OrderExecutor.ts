import ccxt from 'ccxt';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { StrategySignal } from './StrategyRunner';

export interface OrderIntent {
  id: string;
  signal: StrategySignal;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number; // undefined for market orders
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
  clientOrderId?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
}

export interface Order {
  id: string;
  intent: OrderIntent;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled' | 'expired';
  executedAmount: number;
  executedPrice: number;
  remainingAmount: number;
  fees: number;
  timestamp: number;
  exchangeOrderId?: string;
  error?: string;
  fills?: OrderFill[];
  lastUpdate: number;
}

export interface OrderFill {
  id: string;
  timestamp: number;
  amount: number;
  price: number;
  fee: number;
  feeCurrency: string;
  side: 'buy' | 'sell';
  takerOrMaker: 'taker' | 'maker';
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  timestamp: number;
  lastUpdate: number;
  marginUsed?: number;
  leverage?: number;
}

export interface Balance {
  [currency: string]: {
    free: number;
    used: number;
    total: number;
  };
}

export interface ExecutorConfig {
  paperTrading: boolean;
  exchange: 'binance' | 'bybit' | 'okx' | 'kucoin';
  testnet: boolean;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string; // For OKX
  defaultOrderType: 'market' | 'limit';
  slippageTolerance: number; // percentage
  maxOrderSize: number; // in quote currency
  enableStopLoss: boolean;
  enableTakeProfit: boolean;
  enablePartialFills: boolean;
  orderTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface ExecutorStats {
  totalOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalVolume: number;
  totalFees: number;
  averageFillTime: number;
  successRate: number;
}

export class OrderExecutor {
  private exchange: ccxt.Exchange | null = null;
  private config: ExecutorConfig;
  private orders = new Map<string, Order>();
  private positions = new Map<string, Position>();
  private balance: Balance = {};
  
  // Observables
  private orderSubject = new Subject<Order>();
  private positionSubject = new Subject<Position>();
  private balanceSubject = new BehaviorSubject<Balance>({});
  private errorSubject = new Subject<{ type: string; message: string; data?: any }>();
  
  // Paper trading simulation
  private paperBalance: Balance = {
    USDT: { free: 10000, used: 0, total: 10000 },
    BTC: { free: 0, used: 0, total: 0 },
    ETH: { free: 0, used: 0, total: 0 }
  };
  
  // Statistics
  private stats: ExecutorStats = {
    totalOrders: 0,
    filledOrders: 0,
    cancelledOrders: 0,
    rejectedOrders: 0,
    totalVolume: 0,
    totalFees: 0,
    averageFillTime: 0,
    successRate: 0
  };
  
  // Market data simulation for paper trading
  private marketPrices: Map<string, number> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor(config: ExecutorConfig) {
    this.config = config;
    
    if (!config.paperTrading) {
      this.initializeExchange();
    } else {
      this.initializePaperTrading();
    }
  }

  /**
   * Initialize CCXT exchange
   */
  private async initializeExchange(): Promise<void> {
    try {
      const ExchangeClass = this.getExchangeClass();
      
      const exchangeConfig: any = {
        apiKey: this.config.apiKey,
        secret: this.config.apiSecret,
        sandbox: this.config.testnet,
        enableRateLimit: true,
        timeout: this.config.orderTimeout,
        options: {
          defaultType: 'spot', // or 'future' for derivatives
          recvWindow: 10000,
        },
      };

      // Add passphrase for OKX
      if (this.config.exchange === 'okx' && this.config.passphrase) {
        exchangeConfig.password = this.config.passphrase;
      }

      this.exchange = new ExchangeClass(exchangeConfig);

      // Load markets and initialize
      await this.exchange.loadMarkets();
      console.log(`${this.config.exchange} exchange initialized (testnet: ${this.config.testnet})`);
      
      // Load initial balance
      await this.updateBalance();
      
      // Start monitoring orders
      this.startOrderMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize exchange:', error);
      this.errorSubject.next({
        type: 'initialization_error',
        message: `Failed to initialize ${this.config.exchange}: ${error}`,
        data: { error }
      });
      throw error;
    }
  }

  /**
   * Initialize paper trading mode
   */
  private initializePaperTrading(): void {
    console.log('OrderExecutor initialized in paper trading mode');
    
    // Initialize market prices for simulation
    this.marketPrices.set('BTC/USDT', 45000 + Math.random() * 10000);
    this.marketPrices.set('ETH/USDT', 2500 + Math.random() * 1000);
    this.marketPrices.set('ADA/USDT', 0.3 + Math.random() * 0.5);
    this.marketPrices.set('SOL/USDT', 80 + Math.random() * 60);
    this.marketPrices.set('DOT/USDT', 5 + Math.random() * 10);
    
    // Start price simulation
    this.startPriceSimulation();
    
    // Emit initial balance
    this.balanceSubject.next(this.paperBalance);
  }

  /**
   * Get CCXT exchange class
   */
  private getExchangeClass(): typeof ccxt.Exchange {
    switch (this.config.exchange) {
      case 'binance':
        return ccxt.binance;
      case 'bybit':
        return ccxt.bybit;
      case 'okx':
        return ccxt.okx;
      case 'kucoin':
        return ccxt.kucoin;
      default:
        throw new Error(`Unsupported exchange: ${this.config.exchange}`);
    }
  }

  /**
   * Execute order based on strategy signal
   */
  async executeOrder(intent: OrderIntent): Promise<Order> {
    this.stats.totalOrders++;
    
    if (this.config.paperTrading) {
      return this.executePaperOrder(intent);
    } else {
      return this.executeRealOrder(intent);
    }
  }

  /**
   * Execute real order on exchange
   */
  private async executeRealOrder(intent: OrderIntent): Promise<Order> {
    if (!this.exchange) {
      throw new Error('Exchange not initialized');
    }

    const order: Order = {
      id: intent.id,
      intent,
      status: 'pending',
      executedAmount: 0,
      executedPrice: 0,
      remainingAmount: intent.amount,
      fees: 0,
      timestamp: Date.now(),
      fills: [],
      lastUpdate: Date.now()
    };

    try {
      // Validate order
      await this.validateOrder(intent);

      // Prepare order parameters
      const orderParams: any = {
        timeInForce: intent.timeInForce || 'GTC',
        clientOrderId: intent.clientOrderId || intent.id,
      };

      if (intent.reduceOnly) {
        orderParams.reduceOnly = true;
      }

      // Place order
      const exchangeOrder = await this.exchange.createOrder(
        intent.symbol,
        this.config.defaultOrderType,
        intent.side,
        intent.amount,
        intent.price,
        undefined,
        orderParams
      );

      order.exchangeOrderId = exchangeOrder.id;
      order.status = this.mapExchangeStatus(exchangeOrder.status);
      order.executedAmount = exchangeOrder.filled || 0;
      order.executedPrice = exchangeOrder.average || intent.price || 0;
      order.remainingAmount = (exchangeOrder.remaining || intent.amount) - order.executedAmount;
      order.fees = exchangeOrder.fee?.cost || 0;
      order.lastUpdate = Date.now();

      // Store order
      this.orders.set(order.id, order);
      this.orderSubject.next(order);

      // Place conditional orders if specified
      if (order.status === 'filled' || order.status === 'partially_filled') {
        await this.placeConditionalOrders(intent, order);
        this.updatePositionFromOrder(order);
        this.updateStatsFromOrder(order);
      }

      console.log(`Real order executed: ${intent.side} ${intent.amount} ${intent.symbol} - Status: ${order.status}`);
      
    } catch (error) {
      order.status = 'rejected';
      order.error = error instanceof Error ? error.message : 'Unknown error';
      order.lastUpdate = Date.now();
      
      this.stats.rejectedOrders++;
      this.errorSubject.next({
        type: 'order_execution_error',
        message: `Order execution failed: ${order.error}`,
        data: { order, error }
      });
      
      console.error('Real order execution failed:', error);
    }

    this.orders.set(order.id, order);
    this.orderSubject.next(order);
    return order;
  }

  /**
   * Execute paper trading order
   */
  private async executePaperOrder(intent: OrderIntent): Promise<Order> {
    const order: Order = {
      id: intent.id,
      intent,
      status: 'pending',
      executedAmount: 0,
      executedPrice: 0,
      remainingAmount: intent.amount,
      fees: 0,
      timestamp: Date.now(),
      fills: [],
      lastUpdate: Date.now()
    };

    try {
      // Simulate market price with slippage
      const marketPrice = intent.price || this.getSimulatedMarketPrice(intent.symbol);
      const slippage = this.config.slippageTolerance / 100;
      const executedPrice = this.config.defaultOrderType === 'market' ?
        (intent.side === 'buy' ? marketPrice * (1 + slippage) : marketPrice * (1 - slippage)) :
        (intent.price || marketPrice);

      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));

      // Check if we have sufficient balance
      const [baseCurrency, quoteCurrency] = intent.symbol.split('/');
      const requiredBalance = intent.side === 'buy' ? 
        intent.amount * executedPrice : 
        intent.amount;
      
      const currency = intent.side === 'buy' ? quoteCurrency : baseCurrency;
      const availableBalance = this.paperBalance[currency]?.free || 0;
      
      if (availableBalance < requiredBalance) {
        throw new Error(`Insufficient ${currency} balance. Required: ${requiredBalance}, Available: ${availableBalance}`);
      }

      // Simulate partial fills for large orders
      const shouldPartialFill = this.config.enablePartialFills && 
        intent.amount * executedPrice > 1000 && 
        Math.random() < 0.3;

      if (shouldPartialFill) {
        order.executedAmount = intent.amount * (0.3 + Math.random() * 0.4); // 30-70% fill
        order.status = 'partially_filled';
        order.remainingAmount = intent.amount - order.executedAmount;
      } else {
        order.executedAmount = intent.amount;
        order.status = 'filled';
        order.remainingAmount = 0;
      }

      order.executedPrice = executedPrice;
      order.fees = order.executedAmount * executedPrice * 0.001; // 0.1% fee simulation
      order.lastUpdate = Date.now();

      // Create fill record
      const fill: OrderFill = {
        id: `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        amount: order.executedAmount,
        price: executedPrice,
        fee: order.fees,
        feeCurrency: quoteCurrency,
        side: intent.side,
        takerOrMaker: this.config.defaultOrderType === 'market' ? 'taker' : 'maker'
      };
      
      order.fills = [fill];

      // Update paper balance
      this.updatePaperBalance(order);
      
      // Update position
      this.updatePositionFromOrder(order);
      
      // Update statistics
      this.updateStatsFromOrder(order);

      console.log(`Paper order executed: ${intent.side} ${order.executedAmount} ${intent.symbol} at ${executedPrice}`);

    } catch (error) {
      order.status = 'rejected';
      order.error = error instanceof Error ? error.message : 'Unknown error';
      order.lastUpdate = Date.now();
      
      this.stats.rejectedOrders++;
      console.error('Paper order execution failed:', error);
    }

    this.orders.set(order.id, order);
    this.orderSubject.next(order);
    return order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      return false; // Cannot cancel already filled or cancelled orders
    }

    if (this.config.paperTrading) {
      order.status = 'cancelled';
      order.lastUpdate = Date.now();
      this.stats.cancelledOrders++;
      this.orderSubject.next(order);
      return true;
    }

    if (!this.exchange || !order.exchangeOrderId) {
      throw new Error('Cannot cancel order: exchange not available');
    }

    try {
      await this.exchange.cancelOrder(order.exchangeOrderId, order.intent.symbol);
      order.status = 'cancelled';
      order.lastUpdate = Date.now();
      this.stats.cancelledOrders++;
      this.orderSubject.next(order);
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      this.errorSubject.next({
        type: 'cancel_order_error',
        message: `Failed to cancel order ${orderId}: ${error}`,
        data: { orderId, error }
      });
      return false;
    }
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: Order['status']): Order[] {
    return Array.from(this.orders.values()).filter(order => order.status === status);
  }

  /**
   * Get all positions
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by symbol
   */
  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol);
  }

  /**
   * Get current balance
   */
  getCurrentBalance(): Balance {
    return this.config.paperTrading ? this.paperBalance : this.balance;
  }

  /**
   * Get executor statistics
   */
  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  /**
   * Get order updates as observable
   */
  getOrderUpdates(): Observable<Order> {
    return this.orderSubject.asObservable();
  }

  /**
   * Get position updates as observable
   */
  getPositionUpdates(): Observable<Position> {
    return this.positionSubject.asObservable();
  }

  /**
   * Get balance updates as observable
   */
  getBalanceUpdates(): Observable<Balance> {
    return this.balanceSubject.asObservable();
  }

  /**
   * Get error updates as observable
   */
  getErrorUpdates(): Observable<{ type: string; message: string; data?: any }> {
    return this.errorSubject.asObservable();
  }

  /**
   * Validate order before execution
   */
  private async validateOrder(intent: OrderIntent): Promise<void> {
    // Check order size limits
    const orderValue = intent.amount * (intent.price || 1);
    if (orderValue > this.config.maxOrderSize) {
      throw new Error(`Order size exceeds maximum allowed: ${this.config.maxOrderSize}`);
    }

    // Check minimum order size (exchange specific)
    if (this.exchange && this.exchange.markets[intent.symbol]) {
      const market = this.exchange.markets[intent.symbol];
      if (market.limits.amount?.min && intent.amount < market.limits.amount.min) {
        throw new Error(`Order amount below minimum: ${market.limits.amount.min}`);
      }
      if (market.limits.cost?.min && orderValue < market.limits.cost.min) {
        throw new Error(`Order value below minimum: ${market.limits.cost.min}`);
      }
    }

    // Check balance
    const currentBalance = this.getCurrentBalance();
    const [baseCurrency, quoteCurrency] = intent.symbol.split('/');
    
    if (intent.side === 'buy') {
      const requiredQuote = intent.amount * (intent.price || this.getSimulatedMarketPrice(intent.symbol));
      const availableQuote = currentBalance[quoteCurrency]?.free || 0;
      if (availableQuote < requiredQuote) {
        throw new Error(`Insufficient ${quoteCurrency} balance`);
      }
    } else {
      const availableBase = currentBalance[baseCurrency]?.free || 0;
      if (availableBase < intent.amount) {
        throw new Error(`Insufficient ${baseCurrency} balance`);
      }
    }
  }

  /**
   * Place conditional orders (stop loss, take profit)
   */
  private async placeConditionalOrders(intent: OrderIntent, parentOrder: Order): Promise<void> {
    if (!this.config.enableStopLoss && !this.config.enableTakeProfit) {
      return;
    }

    try {
      // Place stop loss
      if (this.config.enableStopLoss && intent.stopLoss) {
        await this.placeStopLoss(intent, parentOrder);
      }

      // Place take profit
      if (this.config.enableTakeProfit && intent.takeProfit) {
        await this.placeTakeProfit(intent, parentOrder);
      }
    } catch (error) {
      console.error('Failed to place conditional orders:', error);
      this.errorSubject.next({
        type: 'conditional_order_error',
        message: `Failed to place conditional orders: ${error}`,
        data: { intent, parentOrder, error }
      });
    }
  }

  /**
   * Place stop loss order
   */
  private async placeStopLoss(intent: OrderIntent, parentOrder: Order): Promise<void> {
    if (!intent.stopLoss) return;

    const stopLossIntent: OrderIntent = {
      id: `sl_${intent.id}`,
      signal: intent.signal,
      symbol: intent.symbol,
      side: intent.side === 'buy' ? 'sell' : 'buy',
      amount: parentOrder.executedAmount,
      price: intent.stopLoss,
      timestamp: Date.now(),
      reduceOnly: true
    };

    if (this.config.paperTrading) {
      // In paper trading, we'll simulate stop loss execution
      console.log(`Stop loss placed at ${intent.stopLoss} for ${parentOrder.executedAmount} ${intent.symbol}`);
    } else if (this.exchange) {
      try {
        await this.exchange.createOrder(
          intent.symbol,
          'stop_market',
          stopLossIntent.side,
          stopLossIntent.amount,
          undefined,
          undefined,
          { stopPrice: intent.stopLoss, reduceOnly: true }
        );
        console.log(`Stop loss placed at ${intent.stopLoss}`);
      } catch (error) {
        console.error('Failed to place stop loss:', error);
      }
    }
  }

  /**
   * Place take profit order
   */
  private async placeTakeProfit(intent: OrderIntent, parentOrder: Order): Promise<void> {
    if (!intent.takeProfit) return;

    const takeProfitIntent: OrderIntent = {
      id: `tp_${intent.id}`,
      signal: intent.signal,
      symbol: intent.symbol,
      side: intent.side === 'buy' ? 'sell' : 'buy',
      amount: parentOrder.executedAmount,
      price: intent.takeProfit,
      timestamp: Date.now(),
      reduceOnly: true
    };

    if (this.config.paperTrading) {
      // In paper trading, we'll simulate take profit execution
      console.log(`Take profit placed at ${intent.takeProfit} for ${parentOrder.executedAmount} ${intent.symbol}`);
    } else if (this.exchange) {
      try {
        await this.exchange.createOrder(
          intent.symbol,
          'limit',
          takeProfitIntent.side,
          takeProfitIntent.amount,
          intent.takeProfit,
          undefined,
          { reduceOnly: true }
        );
        console.log(`Take profit placed at ${intent.takeProfit}`);
      } catch (error) {
        console.error('Failed to place take profit:', error);
      }
    }
  }

  /**
   * Update balance from exchange
   */
  private async updateBalance(): Promise<void> {
    if (!this.exchange) return;

    try {
      const balance = await this.exchange.fetchBalance();
      this.balance = {};
      
      Object.keys(balance.total).forEach(currency => {
        if (balance.total[currency] > 0) {
          this.balance[currency] = {
            free: balance.free[currency] || 0,
            used: balance.used[currency] || 0,
            total: balance.total[currency] || 0
          };
        }
      });
      
      this.balanceSubject.next(this.balance);
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }

  /**
   * Update paper trading balance
   */
  private updatePaperBalance(order: Order): void {
    const [baseCurrency, quoteCurrency] = order.intent.symbol.split('/');
    const tradeValue = order.executedAmount * order.executedPrice;

    if (order.intent.side === 'buy') {
      // Buying: decrease quote currency, increase base currency
      this.paperBalance[quoteCurrency].free -= tradeValue + order.fees;
      this.paperBalance[quoteCurrency].total -= tradeValue + order.fees;
      
      if (!this.paperBalance[baseCurrency]) {
        this.paperBalance[baseCurrency] = { free: 0, used: 0, total: 0 };
      }
      this.paperBalance[baseCurrency].free += order.executedAmount;
      this.paperBalance[baseCurrency].total += order.executedAmount;
    } else {
      // Selling: decrease base currency, increase quote currency
      this.paperBalance[baseCurrency].free -= order.executedAmount;
      this.paperBalance[baseCurrency].total -= order.executedAmount;
      
      this.paperBalance[quoteCurrency].free += tradeValue - order.fees;
      this.paperBalance[quoteCurrency].total += tradeValue - order.fees;
    }

    this.balanceSubject.next(this.paperBalance);
  }

  /**
   * Update position from order
   */
  private updatePositionFromOrder(order: Order): void {
    const symbol = order.intent.symbol;
    const positionSide = order.intent.side === 'buy' ? 'long' : 'short';
    const existingPosition = this.positions.get(symbol);

    if (existingPosition) {
      // Update existing position
      if (existingPosition.side === positionSide) {
        // Add to position
        const totalAmount = existingPosition.amount + order.executedAmount;
        const avgPrice = (existingPosition.entryPrice * existingPosition.amount + 
                         order.executedPrice * order.executedAmount) / totalAmount;
        existingPosition.amount = totalAmount;
        existingPosition.entryPrice = avgPrice;
      } else {
        // Reduce or reverse position
        if (order.executedAmount >= existingPosition.amount) {
          // Reverse position
          existingPosition.side = positionSide;
          existingPosition.amount = order.executedAmount - existingPosition.amount;
          existingPosition.entryPrice = order.executedPrice;
        } else {
          // Reduce position
          existingPosition.amount -= order.executedAmount;
        }
      }
      existingPosition.lastUpdate = Date.now();
    } else {
      // Create new position
      const newPosition: Position = {
        symbol,
        side: positionSide,
        amount: order.executedAmount,
        entryPrice: order.executedPrice,
        currentPrice: order.executedPrice,
        unrealizedPnL: 0,
        realizedPnL: 0,
        timestamp: Date.now(),
        lastUpdate: Date.now()
      };
      this.positions.set(symbol, newPosition);
    }

    const position = this.positions.get(symbol);
    if (position) {
      this.updatePositionPnL(position);
      this.positionSubject.next(position);
    }
  }

  /**
   * Update position P&L
   */
  private updatePositionPnL(position: Position): void {
    const currentPrice = this.getSimulatedMarketPrice(position.symbol);
    position.currentPrice = currentPrice;
    
    if (position.side === 'long') {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * position.amount;
    } else {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * position.amount;
    }
  }

  /**
   * Update statistics from order
   */
  private updateStatsFromOrder(order: Order): void {
    if (order.status === 'filled') {
      this.stats.filledOrders++;
      this.stats.totalVolume += order.executedAmount * order.executedPrice;
      this.stats.totalFees += order.fees;
      
      // Update average fill time
      const fillTime = order.lastUpdate - order.timestamp;
      this.stats.averageFillTime = (this.stats.averageFillTime * (this.stats.filledOrders - 1) + fillTime) / this.stats.filledOrders;
    }
    
    // Update success rate
    this.stats.successRate = this.stats.filledOrders / this.stats.totalOrders;
  }

  /**
   * Start monitoring orders (for real trading)
   */
  private startOrderMonitoring(): void {
    if (this.config.paperTrading) return;

    setInterval(async () => {
      try {
        await this.updateBalance();
        await this.checkPendingOrders();
      } catch (error) {
        console.error('Order monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check pending orders status
   */
  private async checkPendingOrders(): Promise<void> {
    if (!this.exchange) return;

    const pendingOrders = Array.from(this.orders.values())
      .filter(order => order.status === 'pending' || order.status === 'partially_filled');

    for (const order of pendingOrders) {
      if (!order.exchangeOrderId) continue;

      try {
        const exchangeOrder = await this.exchange.fetchOrder(order.exchangeOrderId, order.intent.symbol);
        
        const newStatus = this.mapExchangeStatus(exchangeOrder.status);
        if (newStatus !== order.status) {
          order.status = newStatus;
          order.executedAmount = exchangeOrder.filled || 0;
          order.executedPrice = exchangeOrder.average || order.executedPrice;
          order.remainingAmount = (exchangeOrder.remaining || 0);
          order.fees = exchangeOrder.fee?.cost || 0;
          order.lastUpdate = Date.now();
          
          this.orderSubject.next(order);
          
          if (order.status === 'filled') {
            this.updatePositionFromOrder(order);
            this.updateStatsFromOrder(order);
          }
        }
      } catch (error) {
        console.error(`Failed to check order ${order.id}:`, error);
      }
    }
  }

  /**
   * Map exchange status to our status
   */
  private mapExchangeStatus(exchangeStatus: string): Order['status'] {
    switch (exchangeStatus?.toLowerCase()) {
      case 'open':
      case 'new':
        return 'pending';
      case 'filled':
      case 'closed':
        return 'filled';
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      case 'rejected':
        return 'rejected';
      case 'partially_filled':
      case 'partial':
        return 'partially_filled';
      case 'expired':
        return 'expired';
      default:
        return 'pending';
    }
  }

  /**
   * Start price simulation for paper trading
   */
  private startPriceSimulation(): void {
    this.priceUpdateInterval = setInterval(() => {
      this.marketPrices.forEach((price, symbol) => {
        const volatility = this.getVolatilityForSymbol(symbol);
        const change = (Math.random() - 0.5) * volatility;
        const newPrice = price * (1 + change);
        this.marketPrices.set(symbol, newPrice);
      });

      // Update position P&L
      this.positions.forEach(position => {
        this.updatePositionPnL(position);
        this.positionSubject.next(position);
      });
    }, 1000);
  }

  /**
   * Get simulated market price
   */
  private getSimulatedMarketPrice(symbol: string): number {
    let price = this.marketPrices.get(symbol);
    
    if (!price) {
      // Initialize price for new symbol
      const basePrices: { [key: string]: number } = {
        'BTC/USDT': 45000,
        'ETH/USDT': 3000,
        'ADA/USDT': 0.5,
        'SOL/USDT': 100,
        'DOT/USDT': 7,
      };
      
      price = basePrices[symbol] || 100;
      this.marketPrices.set(symbol, price);
    }
    
    return price;
  }

  /**
   * Get volatility for symbol (for simulation)
   */
  private getVolatilityForSymbol(symbol: string): number {
    if (symbol.includes('BTC')) return 0.002; // 0.2%
    if (symbol.includes('ETH')) return 0.0025; // 0.25%
    return 0.003; // 0.3% for altcoins
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.orderSubject.complete();
    this.positionSubject.complete();
    this.balanceSubject.complete();
    this.errorSubject.complete();
    
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    
    if (this.exchange) {
      // Close any open connections
      this.exchange = null;
    }
  }
}