import { Subject, BehaviorSubject } from 'rxjs';

export interface ManualTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price: number;
  fillPrice?: number;
  entryPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'open';
  timestamp: number;
  pnl?: number;
  currentPrice?: number;
}

export interface ManualBalance {
  USDT: number;
  BTC: number;
  ETH: number;
  [key: string]: number;
}

class ManualTradingService {
  private tradesSubject = new BehaviorSubject<ManualTrade[]>([]);
  private balanceSubject = new BehaviorSubject<ManualBalance>({
    USDT: 10000,
    BTC: 0,
    ETH: 0
  });
  private pnlSubject = new BehaviorSubject<number>(0);

  constructor() {
    this.loadFromStorage();
    this.startPriceUpdates();
  }

  private loadFromStorage() {
    try {
      const storedTrades = localStorage.getItem('manualTrades');
      const storedBalance = localStorage.getItem('manualBalance');

      if (storedTrades) {
        const trades = JSON.parse(storedTrades);
        this.tradesSubject.next(trades);
      }

      if (storedBalance) {
        const balance = JSON.parse(storedBalance);
        this.balanceSubject.next(balance);
      }
    } catch (error) {
      console.warn('Failed to load manual trading data from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('manualTrades', JSON.stringify(this.tradesSubject.value));
      localStorage.setItem('manualBalance', JSON.stringify(this.balanceSubject.value));
    } catch (error) {
      console.warn('Failed to save manual trading data to storage:', error);
    }
  }

  private startPriceUpdates() {
    // Update PnL calculations every 5 seconds with mock price movements
    setInterval(() => {
      this.updatePnL();
    }, 5000);
  }

  private updatePnL() {
    const trades = this.tradesSubject.value;
    const filledTrades = trades.filter(t => t.status === 'filled');

    let totalPnL = 0;
    const updatedTrades = filledTrades.map(trade => {
      // Simulate price movement (±2% random movement)
      const priceChange = (Math.random() - 0.5) * 0.04; // ±2%
      const currentPrice = trade.fillPrice! * (1 + priceChange);

      // Calculate PnL
      let pnl = 0;
      if (trade.side === 'buy') {
        pnl = (currentPrice - trade.fillPrice!) * trade.quantity;
      } else {
        pnl = (trade.fillPrice! - currentPrice) * trade.quantity;
      }

      totalPnL += pnl;

      return {
        ...trade,
        currentPrice,
        pnl
      };
    });

    // Update other trades that haven't changed
    const otherTrades = trades.filter(t => t.status !== 'filled');
    const allTrades = [...updatedTrades, ...otherTrades];

    this.tradesSubject.next(allTrades);
    this.pnlSubject.next(totalPnL);
    this.saveToStorage();
  }

  addTrade(trade: Omit<ManualTrade, 'id' | 'timestamp'>): ManualTrade {
    const newTrade: ManualTrade = {
      ...trade,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fillPrice: trade.type === 'market' ? trade.price : undefined,
      entryPrice: trade.price,
      status: trade.type === 'market' ? 'filled' : trade.status
    };

    const currentTrades = this.tradesSubject.value;
    const updatedTrades = [newTrade, ...currentTrades];
    this.tradesSubject.next(updatedTrades);

    // Update balance for filled trades
    if (newTrade.status === 'filled') {
      this.updateBalance(newTrade);
    }

    // Also save to legacy format for backward compatibility
    this.saveLegacyFormat(newTrade);
    this.saveToStorage();

    // Trigger storage event for cross-component updates
    window.dispatchEvent(new StorageEvent('storage', { 
      key: 'manualTrades', 
      newValue: JSON.stringify(updatedTrades) 
    }));

    return newTrade;
  }

  private saveLegacyFormat(trade: ManualTrade) {
    try {
      const legacyOrders = JSON.parse(localStorage.getItem('manualTradingOrders') || '[]');
      const legacyOrder = {
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        type: trade.type,
        quantity: trade.quantity,
        price: trade.price,
        fillPrice: trade.fillPrice,
        status: trade.status,
        timestamp: trade.timestamp,
        pnl: trade.pnl,
        currentPrice: trade.currentPrice
      };

      legacyOrders.unshift(legacyOrder);
      localStorage.setItem('manualTradingOrders', JSON.stringify(legacyOrders.slice(0, 100))); // Keep last 100
    } catch (error) {
      console.warn('Failed to save legacy format:', error);
    }
  }

  private updateBalance(trade: ManualTrade) {
    const currentBalance = this.balanceSubject.value;
    const symbolBase = trade.symbol.replace('USDT', '');
    const tradeValue = (trade.fillPrice || trade.price) * trade.quantity;

    let newBalance = { ...currentBalance };

    if (trade.side === 'buy') {
      newBalance.USDT -= tradeValue;
      newBalance[symbolBase] = (newBalance[symbolBase] || 0) + trade.quantity;
    } else {
      newBalance.USDT += tradeValue;
      newBalance[symbolBase] = (newBalance[symbolBase] || 0) - trade.quantity;
    }

    this.balanceSubject.next(newBalance);
  }

  getTrades() {
    return this.tradesSubject.asObservable();
  }

  getBalance() {
    return this.balanceSubject.asObservable();
  }

  getPnL() {
    return this.pnlSubject.asObservable();
  }

  getCurrentTrades(): ManualTrade[] {
    return this.tradesSubject.value;
  }

  getCurrentBalance(): ManualBalance {
    return this.balanceSubject.value;
  }

  getCurrentPnL(): number {
    return this.pnlSubject.value;
  }

  clearData() {
    this.tradesSubject.next([]);
    this.balanceSubject.next({ USDT: 10000, BTC: 0, ETH: 0 });
    this.pnlSubject.next(0);
    localStorage.removeItem('manualTrades');
    localStorage.removeItem('manualBalance');
  }

  // Enhanced buy order execution
  async executeBuyOrder(symbol: string, amount: number, orderType: 'market' | 'limit' = 'market', limitPrice?: number): Promise<ManualTrade> {
    try {
      // Validate input parameters
      if (!symbol || amount <= 0) {
        throw new Error('Invalid order parameters');
      }

      // Get current market data
      const ticker = await this.getRealTimeTicker(symbol);
      const currentPrice = ticker.price;
      
      // Determine execution price
      let executionPrice = currentPrice;
      if (orderType === 'limit' && limitPrice) {
        executionPrice = limitPrice;
        // For limit orders, check if price is reasonable (within 10% of market)
        if (Math.abs(limitPrice - currentPrice) / currentPrice > 0.1) {
          throw new Error('Limit price too far from market price');
        }
      }

      // Calculate order value and fees
      const orderValue = amount * executionPrice;
      const estimatedFee = orderValue * 0.001; // 0.1% trading fee
      const totalCost = orderValue + estimatedFee;

      // Check balance
      const currentBalance = this.getCurrentBalance();
      if (currentBalance.USDT < totalCost) {
        throw new Error(`Insufficient balance. Required: ${totalCost.toFixed(2)} USDT, Available: ${currentBalance.USDT.toFixed(2)} USDT`);
      }

      // Execute the buy order
      const trade = this.addTrade({
        symbol,
        side: 'buy',
        type: orderType,
        quantity: amount,
        price: executionPrice,
        status: orderType === 'market' ? 'filled' : 'pending'
      });

      console.log(`Buy order executed: ${amount} ${symbol} at ${executionPrice}`);
      return trade;

    } catch (error) {
      console.error('Buy order execution failed:', error);
      throw error;
    }
  }

  // Enhanced sell order execution
  async executeSellOrder(symbol: string, amount: number, orderType: 'market' | 'limit' = 'market', limitPrice?: number): Promise<ManualTrade> {
    try {
      // Validate input parameters
      if (!symbol || amount <= 0) {
        throw new Error('Invalid order parameters');
      }

      // Get current market data
      const ticker = await this.getRealTimeTicker(symbol);
      const currentPrice = ticker.price;
      
      // Determine execution price
      let executionPrice = currentPrice;
      if (orderType === 'limit' && limitPrice) {
        executionPrice = limitPrice;
        // For limit orders, check if price is reasonable (within 10% of market)
        if (Math.abs(limitPrice - currentPrice) / currentPrice > 0.1) {
          throw new Error('Limit price too far from market price');
        }
      }

      // Check if we have enough of the base currency to sell
      const baseCurrency = symbol.replace('USDT', '');
      const currentBalance = this.getCurrentBalance();
      const availableAmount = currentBalance[baseCurrency] || 0;
      
      if (availableAmount < amount) {
        throw new Error(`Insufficient ${baseCurrency} balance. Required: ${amount}, Available: ${availableAmount}`);
      }

      // Execute the sell order
      const trade = this.addTrade({
        symbol,
        side: 'sell',
        type: orderType,
        quantity: amount,
        price: executionPrice,
        status: orderType === 'market' ? 'filled' : 'pending'
      });

      console.log(`Sell order executed: ${amount} ${symbol} at ${executionPrice}`);
      return trade;

    } catch (error) {
      console.error('Sell order execution failed:', error);
      throw error;
    }
  }

  // Get real-time price from Binance API with fallback
  async getRealTimePrice(symbol: string): Promise<number> {
    try {
      // Try primary endpoint first
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.code) {
        throw new Error(`Binance API Error: ${data.msg}`);
      }

      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price data received');
      }

      return price;
    } catch (error) {
      console.error(`Failed to get real-time price for ${symbol}:`, error);
      
      // Fallback to stored market prices or default values
      const fallbackPrices: { [key: string]: number } = {
        'BTCUSDT': 42500,
        'ETHUSDT': 2650,
        'ADAUSDT': 0.485,
        'SOLUSDT': 85.5,
        'DOTUSDT': 7.85
      };
      
      return fallbackPrices[symbol] || 100;
    }
  }

  // Enhanced real-time ticker data with retry logic
  async getRealTimeTicker(symbol: string, retries: number = 3): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
  }> {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.code) {
          throw new Error(`Binance API Error: ${data.msg}`);
        }

        return {
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          change: parseFloat(data.priceChange),
          changePercent: parseFloat(data.priceChangePercent),
          volume: parseFloat(data.volume),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice)
        };
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed for ${symbol}:`, error);
        
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // If all retries failed, return fallback data
    console.error(`All attempts failed for ${symbol}, using fallback data`);
    const fallbackPrice = await this.getRealTimePrice(symbol);
    
    return {
      symbol,
      price: fallbackPrice,
      change: 0,
      changePercent: 0,
      volume: 10000,
      high: fallbackPrice * 1.05,
      low: fallbackPrice * 0.95
    };
  }

  // Get order book data
  async getOrderBook(symbol: string, limit: number = 10): Promise<{
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
  }> {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`);
      const data = await response.json();

      if (data.code) {
        throw new Error(`Binance API Error: ${data.msg}`);
      }

      return {
        bids: data.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get order book for ${symbol}:`, error);
      throw error;
    }
  }

  // Cancel pending order
  cancelOrder(orderId: string): boolean {
    const trades = this.tradesSubject.value;
    const orderIndex = trades.findIndex(trade => trade.id === orderId);
    
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = trades[orderIndex];
    if (order.status !== 'pending') {
      throw new Error('Cannot cancel order that is not pending');
    }

    // Update order status
    const updatedTrades = [...trades];
    updatedTrades[orderIndex] = { ...order, status: 'cancelled' };
    
    this.tradesSubject.next(updatedTrades);
    this.saveToStorage();
    
    console.log(`Order ${orderId} cancelled`);
    return true;
  }
}

export const manualTradingService = new ManualTradingService();