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
  status: 'pending' | 'filled' | 'cancelled' | 'open' | 'closed';
  timestamp: number;
  pnl?: number;
  currentPrice?: number;
  // Enhanced exchange-like data
  buyPrice?: number;
  sellPrice?: number;
  totalValue?: number;
  fees?: number;
  netValue?: number;
  avgBuyPrice?: number;
  avgSellPrice?: number;
  tradePairId?: string; // Links buy and sell trades
  exchange?: string;
  orderNumber?: number;
  executionTime?: number;
  slippage?: number;
  commission?: number;
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
    ETH: 0,
    ADA: 0,
    SOL: 0,
    DOT: 0
  });
  private pnlSubject = new BehaviorSubject<number>(0);

  constructor() {
    this.loadFromStorage();
    this.initializeDatabase();
    this.startPriceUpdates();
    this.startRealTimePriceMonitoring();
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
        // Ensure all currencies exist in balance
        const fullBalance = {
          USDT: 10000,
          BTC: 0,
          ETH: 0,
          ADA: 0,
          SOL: 0,
          DOT: 0,
          ...balance
        };
        this.balanceSubject.next(fullBalance);
      }
    } catch (error) {
      console.warn('Failed to load manual trading data from storage:', error);
    }
  }

  private async saveToStorage() {
    try {
      localStorage.setItem('manualTrades', JSON.stringify(this.tradesSubject.value));
      localStorage.setItem('manualBalance', JSON.stringify(this.balanceSubject.value));
      
      // Also sync to database
      await this.syncBalancesToDatabase();
    } catch (error) {
      console.warn('Failed to save manual trading data to storage:', error);
    }
  }

  private async initializeDatabase() {
    try {
      // For demo purposes, using userId = 1. In a real app, get from auth context
      const userId = 1;
      await fetch(`/api/manual-trading/initialize/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Load balances from database
      await this.loadBalancesFromDatabase();
    } catch (error) {
      console.warn('Failed to initialize database:', error);
    }
  }

  private async loadBalancesFromDatabase() {
    try {
      const userId = 1; // For demo purposes
      const response = await fetch(`/api/manual-trading/balances/${userId}`);
      if (response.ok) {
        const balances = await response.json();
        this.balanceSubject.next(balances);
      }
    } catch (error) {
      console.warn('Failed to load balances from database:', error);
    }
  }

  private async syncBalancesToDatabase() {
    try {
      const userId = 1; // For demo purposes
      const balances = this.balanceSubject.value;
      
      for (const [currency, balance] of Object.entries(balances)) {
        await fetch(`/api/manual-trading/balances/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency,
            balance,
            description: 'Balance sync'
          })
        });
      }
    } catch (error) {
      console.warn('Failed to sync balances to database:', error);
    }
  }

  private realTimePrices = new Map<string, { price: number; timestamp: number }>();
  private priceUpdateSubject = new BehaviorSubject<{ [symbol: string]: number }>({});

  private startPriceUpdates() {
    // Update PnL calculations every 5 seconds with real prices
    setInterval(() => {
      this.updatePnL();
    }, 5000);
  }

  private startRealTimePriceMonitoring() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];

    // Update prices every 2 seconds for more real-time feel
    setInterval(async () => {
      const priceUpdates: { [symbol: string]: number } = {};

      for (const symbol of symbols) {
        try {
          const price = await this.getRealTimePrice(symbol);
          this.realTimePrices.set(symbol, { price, timestamp: Date.now() });
          priceUpdates[symbol] = price;
        } catch (error) {
          console.warn(`Failed to update price for ${symbol}:`, error);
          // Keep last known price if available
          const lastKnown = this.realTimePrices.get(symbol);
          if (lastKnown) {
            priceUpdates[symbol] = lastKnown.price;
          }
        }
      }

      if (Object.keys(priceUpdates).length > 0) {
        this.priceUpdateSubject.next(priceUpdates);
      }
    }, 2000);
  }

  // Get live price updates observable
  getLivePriceUpdates() {
    return this.priceUpdateSubject.asObservable();
  }

  // Get cached real-time price
  getCachedPrice(symbol: string): number | null {
    const cached = this.realTimePrices.get(symbol);
    if (cached && Date.now() - cached.timestamp < 10000) { // 10 seconds max age
      return cached.price;
    }
    return null;
  }

  private async updatePnL() {
    const trades = this.tradesSubject.value;
    const openTrades = trades.filter(t => t.status === 'filled' && t.side === 'buy'); // Only buy trades that are still open
    const closedTrades = trades.filter(t => t.status === 'closed'); // Closed trades (sells) with final PnL

    let totalPnL = 0;
    
    // Add PnL from closed trades (final, no updates needed)
    closedTrades.forEach(trade => {
      if (trade.pnl !== undefined) {
        totalPnL += trade.pnl;
      }
    });

    // Update PnL for open buy positions only
    const updatedOpenTrades = await Promise.all(openTrades.map(async trade => {
      try {
        // Get real-time price for the symbol
        let currentPrice = this.getCachedPrice(trade.symbol);
        if (!currentPrice) {
          try {
            currentPrice = await this.getRealTimePrice(trade.symbol);
          } catch (error) {
            // Fallback to last known price with small movement
            currentPrice = trade.currentPrice || trade.fillPrice! * (1 + (Math.random() - 0.5) * 0.001);
          }
        }

        // Calculate unrealized PnL for open buy positions
        const pnl = (currentPrice - trade.fillPrice!) * trade.quantity;
        totalPnL += pnl;

        return {
          ...trade,
          currentPrice,
          pnl
        };
      } catch (error) {
        console.warn(`Failed to update PnL for trade ${trade.id}:`, error);
        return trade; // Return unchanged if update fails
      }
    }));

    // Combine all trades (updated open trades, unchanged closed trades, and other statuses)
    const otherTrades = trades.filter(t => t.status !== 'filled' && t.status !== 'closed');
    const allTrades = [...updatedOpenTrades, ...closedTrades, ...otherTrades];

    this.tradesSubject.next(allTrades);
    this.pnlSubject.next(totalPnL);
    this.saveToStorage();
  }

  addTrade(trade: Omit<ManualTrade, 'id' | 'timestamp'>): ManualTrade {
    const executionTime = Date.now();
    const orderNumber = Math.floor(Math.random() * 1000000) + 100000;
    const slippage = Math.random() * 0.002 - 0.001; // Random slippage between -0.1% to +0.1%
    const fillPrice = trade.type === 'market' ? trade.price * (1 + slippage) : trade.price;
    const totalValue = fillPrice * trade.quantity;
    const commission = totalValue * 0.001; // 0.1% commission
    const netValue = trade.side === 'buy' ? totalValue + commission : totalValue - commission;

    const newTrade: ManualTrade = {
      ...trade,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fillPrice: trade.type === 'market' ? fillPrice : undefined,
      entryPrice: trade.price,
      status: trade.type === 'market' ? 'filled' : trade.status,
      // Enhanced exchange-like data
      totalValue,
      fees: commission,
      netValue,
      exchange: 'Manual Trading Simulator',
      orderNumber,
      executionTime,
      slippage: Math.abs(slippage),
      commission
    };

    const currentTrades = this.tradesSubject.value;

    // For sell orders, mark as closed immediately when filled and link to buy trade
    if (newTrade.side === 'sell' && newTrade.status === 'filled') {
      newTrade.status = 'closed';
      const sellPrice = newTrade.fillPrice || newTrade.price;
      newTrade.sellPrice = sellPrice;
      
      // Find corresponding buy trade to calculate comprehensive PnL
      const buyTrade = currentTrades
        .filter(t => t.symbol === newTrade.symbol && t.side === 'buy' && t.status === 'filled')
        .sort((a, b) => b.timestamp - a.timestamp)[0]; // Get most recent buy

      if (buyTrade) {
        const buyPrice = buyTrade.fillPrice || buyTrade.price;
        newTrade.buyPrice = buyPrice;
        newTrade.tradePairId = buyTrade.id;
        newTrade.avgBuyPrice = buyPrice;
        newTrade.avgSellPrice = sellPrice;
        
        // Calculate comprehensive PnL including fees
        const grossPnL = (sellPrice - buyPrice) * newTrade.quantity;
        const totalFees = (buyTrade.fees || 0) + (newTrade.fees || 0);
        newTrade.pnl = grossPnL - totalFees;
        newTrade.currentPrice = sellPrice;
        
        // Update the linked buy trade with sell information
        const buyTradeIndex = currentTrades.findIndex(t => t.id === buyTrade.id);
        if (buyTradeIndex !== -1) {
          currentTrades[buyTradeIndex] = {
            ...buyTrade,
            sellPrice,
            tradePairId: newTrade.id,
            status: 'closed',
            pnl: newTrade.pnl
          };
        }
      }
    } else if (newTrade.side === 'buy' && newTrade.status === 'filled') {
      newTrade.buyPrice = fillPrice;
      newTrade.avgBuyPrice = fillPrice;
    }

    const updatedTrades = [newTrade, ...currentTrades];
    this.tradesSubject.next(updatedTrades);

    // Update balance for filled trades
    if (newTrade.status === 'filled' || newTrade.status === 'closed') {
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

  private async updateBalance(trade: ManualTrade) {
    const currentBalance = this.balanceSubject.value;
    const symbolBase = trade.symbol.replace('USDT', '');
    const tradeValue = (trade.fillPrice || trade.price) * trade.quantity;
    const tradingFee = tradeValue * 0.001; // 0.1% trading fee

    let newBalance = { ...currentBalance };

    if (trade.side === 'buy') {
      // Deduct USDT for purchase + fees
      newBalance.USDT -= (tradeValue + tradingFee);
      // Add the purchased asset
      newBalance[symbolBase] = (newBalance[symbolBase] || 0) + trade.quantity;
    } else {
      // Add USDT from sale - fees
      newBalance.USDT += (tradeValue - tradingFee);
      // Remove the sold asset
      newBalance[symbolBase] = Math.max(0, (newBalance[symbolBase] || 0) - trade.quantity);
    }

    // Ensure no negative balances
    Object.keys(newBalance).forEach(key => {
      if (newBalance[key] < 0) {
        newBalance[key] = 0;
      }
    });

    this.balanceSubject.next(newBalance);
    
    // Sync specific currency balances to database
    try {
      const userId = 1; // For demo purposes
      
      // Update USDT balance
      await fetch(`/api/manual-trading/balances/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: 'USDT',
          balance: newBalance.USDT,
          tradeId: trade.id,
          description: `${trade.side.toUpperCase()} ${trade.quantity} ${trade.symbol}`
        })
      });
      
      // Update asset balance
      await fetch(`/api/manual-trading/balances/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: symbolBase,
          balance: newBalance[symbolBase],
          tradeId: trade.id,
          description: `${trade.side.toUpperCase()} ${trade.quantity} ${trade.symbol}`
        })
      });
    } catch (error) {
      console.warn('Failed to sync balance update to database:', error);
    }
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
    this.balanceSubject.next({ 
      USDT: 10000, 
      BTC: 0, 
      ETH: 0, 
      ADA: 0, 
      SOL: 0, 
      DOT: 0 
    });
    this.pnlSubject.next(0);
    localStorage.removeItem('manualTrades');
    localStorage.removeItem('manualBalance');
    localStorage.removeItem('manualTradingOrders');
  }

  // Add realistic simulation properties
  private simulationConfig = {
    enableSlippage: true,
    enablePartialFills: true,
    enableOrderLatency: true,
    enableMarketImpact: true,
    slippageRange: [0.001, 0.003], // 0.1% to 0.3%
    partialFillProbability: 0.15, // 15% chance
    orderLatencyRange: [100, 500], // 100-500ms
    marketImpactFactor: 0.0001 // 0.01% per $1000 order
  };

  /**
   * Execute paper trading order with realistic simulation
   */
  

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

  // Get real-time price from Binance API with multiple fallbacks
  async getRealTimePrice(symbol: string): Promise<number> {
    const endpoints = [
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      `https://api1.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      `https://api2.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      `https://api3.binance.com/api/v3/ticker/price?symbol=${symbol}`
    ];

    let lastError: any;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

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

        console.log(`Live price for ${symbol}: ${price} (from ${endpoint})`);
        return price;
      } catch (error) {
        lastError = error;
        console.warn(`Failed to get price from ${endpoint}:`, error);
        continue;
      }
    }

    console.error(`All endpoints failed for ${symbol}, last error:`, lastError);

    // Try alternative API as final fallback
    try {
      const altResponse = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      if (altResponse.ok) {
        const altData = await altResponse.json();
        const altPrice = parseFloat(altData.price);
        if (!isNaN(altPrice) && altPrice > 0) {
          console.log(`Live price for ${symbol}: ${altPrice} (from futures API)`);
          return altPrice;
        }
      }
    } catch (error) {
      console.warn('Alternative API also failed:', error);
    }

    throw new Error(`Unable to get real-time price for ${symbol} from any source`);
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