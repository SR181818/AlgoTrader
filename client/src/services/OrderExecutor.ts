import { Observable, Subject } from 'rxjs';

export interface OrderIntent {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface Order extends OrderIntent {
  id: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  averagePrice?: number;
  timestamp: Date;
  fees?: number;
  clientOrderId?: string;
}

export interface ExecutorConfig {
  paperTrading: boolean;
  maxOrderSize: number;
  maxDailyOrders: number;
  enableStopLoss: boolean;
  enableTakeProfit: boolean;
  defaultTimeInForce: 'GTC' | 'IOC' | 'FOK';
}

export interface ExecutionResult {
  success: boolean;
  order?: Order;
  error?: string;
  executionTime: number;
}

/**
 * OrderExecutor handles trade execution and order management
 */
export class OrderExecutor {
  private config: ExecutorConfig;
  private orders: Map<string, Order> = new Map();
  private orderSubject = new Subject<Order>();
  private executionSubject = new Subject<ExecutionResult>();
  private orderCounter = 0;
  private dailyOrderCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      paperTrading: true,
      maxOrderSize: 10000,
      maxDailyOrders: 100,
      enableStopLoss: true,
      enableTakeProfit: true,
      defaultTimeInForce: 'GTC',
      ...config
    };

    console.log(`OrderExecutor initialized in ${this.config.paperTrading ? 'paper trading' : 'live trading'} mode`);
  }

  /**
   * Execute a trade order
   */
  async executeOrder(intent: OrderIntent): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate order
      const validation = this.validateOrder(intent);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          executionTime: Date.now() - startTime
        };
      }

      // Check daily limits
      this.checkDailyLimits();

      // Create order
      const order: Order = {
        ...intent,
        id: this.generateOrderId(),
        status: 'pending',
        filledQuantity: 0,
        timestamp: new Date(),
        timeInForce: intent.timeInForce || this.config.defaultTimeInForce
      };

      // Store order
      this.orders.set(order.id, order);
      this.orderSubject.next({ ...order });

      // Execute based on trading mode
      if (this.config.paperTrading) {
        await this.executePaperOrder(order);
      } else {
        await this.executeLiveOrder(order);
      }

      const result: ExecutionResult = {
        success: true,
        order: { ...order },
        executionTime: Date.now() - startTime
      };

      this.executionSubject.next(result);
      return result;

    } catch (error: any) {
      const result: ExecutionResult = {
        success: false,
        error: error.message || 'Unknown execution error',
        executionTime: Date.now() - startTime
      };

      this.executionSubject.next(result);
      return result;
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === 'filled') {
      return false; // Cannot cancel filled orders
    }

    order.status = 'cancelled';
    this.orders.set(orderId, order);
    this.orderSubject.next({ ...order });

    return true;
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
   * Subscribe to order updates
   */
  onOrderUpdate(): Observable<Order> {
    return this.orderSubject.asObservable();
  }

  /**
   * Subscribe to execution results
   */
  onExecutionResult(): Observable<ExecutionResult> {
    return this.executionSubject.asObservable();
  }

  /**
   * Get execution statistics
   */
  getStats() {
    const orders = Array.from(this.orders.values());
    const filled = orders.filter(o => o.status === 'filled');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const pending = orders.filter(o => o.status === 'pending');

    return {
      totalOrders: orders.length,
      filledOrders: filled.length,
      cancelledOrders: cancelled.length,
      pendingOrders: pending.length,
      fillRate: orders.length > 0 ? (filled.length / orders.length) * 100 : 0,
      dailyOrderCount: this.dailyOrderCount,
      maxDailyOrders: this.config.maxDailyOrders
    };
  }

  /**
   * Validate order parameters
   */
  private validateOrder(intent: OrderIntent): { valid: boolean; error?: string } {
    if (!intent.symbol || !intent.side || !intent.type) {
      return { valid: false, error: 'Missing required order parameters' };
    }

    if (intent.quantity <= 0) {
      return { valid: false, error: 'Order quantity must be positive' };
    }

    if (intent.quantity * (intent.price || 100000) > this.config.maxOrderSize) {
      return { valid: false, error: 'Order size exceeds maximum allowed' };
    }

    if (intent.type === 'limit' && !intent.price) {
      return { valid: false, error: 'Limit orders require a price' };
    }

    if (intent.type === 'stop' && !intent.stopPrice) {
      return { valid: false, error: 'Stop orders require a stop price' };
    }

    return { valid: true };
  }

  /**
   * Check and reset daily limits
   */
  private checkDailyLimits() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyOrderCount = 0;
      this.lastResetDate = today;
    }

    if (this.dailyOrderCount >= this.config.maxDailyOrders) {
      throw new Error('Daily order limit exceeded');
    }

    this.dailyOrderCount++;
  }

  /**
   * Execute order in paper trading mode
   */
  private async executePaperOrder(order: Order): Promise<void> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    // For paper trading, assume all market orders fill immediately
    if (order.type === 'market') {
      order.status = 'filled';
      order.filledQuantity = order.quantity;
      order.averagePrice = order.price || this.getEstimatedPrice(order.symbol);
      order.fees = (order.averagePrice * order.quantity) * 0.001; // 0.1% fee
    } else {
      // For limit/stop orders, they remain pending in paper mode
      order.status = 'pending';
    }

    this.orders.set(order.id, order);
    this.orderSubject.next({ ...order });
  }

  /**
   * Execute order in live trading mode (placeholder)
   */
  private async executeLiveOrder(order: Order): Promise<void> {
    // This would integrate with actual exchange APIs
    throw new Error('Live trading not implemented - use paper trading mode');
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${++this.orderCounter}`;
  }

  /**
   * Get estimated price for paper trading
   */
  private getEstimatedPrice(symbol: string): number {
    // This would typically come from current market data
    const prices: Record<string, number> = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.50,
      'SOLUSDT': 100,
    };
    
    return prices[symbol] || 100;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ExecutorConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all orders (for testing)
   */
  clearOrders() {
    this.orders.clear();
    this.orderCounter = 0;
    this.dailyOrderCount = 0;
  }
}