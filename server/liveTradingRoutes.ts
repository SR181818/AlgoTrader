import express from 'express';
import { authenticateToken } from './authRoutes';
import { db } from './db';
import { strategies } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// In-memory storage for live trading data (production would use database)
const liveOrders: any[] = [];
const livePositions: any[] = [];
const livePrices: { [symbol: string]: number } = {};

// Real-time market data service
class MarketDataService {
  constructor() {
    this.startPriceUpdates();
  }

  private async startPriceUpdates() {
    // Update prices from Binance API
    setInterval(async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
      
      for (const symbol of symbols) {
        try {
          const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          if (response.ok) {
            const data = await response.json();
            livePrices[symbol] = parseFloat(data.price);
          }
        } catch (error) {
          // Fallback to simulated price if API fails
          livePrices[symbol] = (livePrices[symbol] || 50000) * (0.99 + Math.random() * 0.02);
        }
      }
    }, 3000);
  }

  getPrice(symbol: string): number | null {
    return livePrices[symbol] || null;
  }

  async fetchRealTimePrice(symbol: string): Promise<number> {
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

        // Cache the price
        livePrices[symbol] = price;
        console.log(`Fetched live price for ${symbol}: ${price} (from ${endpoint})`);
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
          livePrices[symbol] = altPrice;
          console.log(`Fetched live price for ${symbol}: ${altPrice} (from futures API)`);
          return altPrice;
        }
      }
    } catch (error) {
      console.warn('Alternative API also failed:', error);
    }

    // Final fallback to cached price or default
    const cachedPrice = livePrices[symbol];
    if (cachedPrice) {
      console.log(`Using cached price for ${symbol}: ${cachedPrice}`);
      return cachedPrice;
    }

    // Default prices as last resort
    const defaultPrices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.5,
      'SOLUSDT': 100,
      'DOTUSDT': 8
    };

    const defaultPrice = defaultPrices[symbol] || 100;
    livePrices[symbol] = defaultPrice;
    console.log(`Using default price for ${symbol}: ${defaultPrice}`);
    return defaultPrice;
  }
}

const marketDataService = new MarketDataService();

// Order execution service
class OrderExecutionService {
  async executeOrder(order: any): Promise<{ success: boolean; orderId?: number; error?: string; executionPrice?: number }> {
    try {
      const currentPrice = marketDataService.getPrice(order.symbol);
      if (!currentPrice) {
        return { success: false, error: 'Unable to get current market price' };
      }

      // Calculate execution price based on order type
      let executionPrice = currentPrice;
      if (order.orderType === 'limit') {
        executionPrice = parseFloat(order.price);
        
        // Check if limit order can be executed
        if (order.side === 'buy' && executionPrice < currentPrice) {
          return { success: false, error: 'Limit buy price too low' };
        }
        if (order.side === 'sell' && executionPrice > currentPrice) {
          return { success: false, error: 'Limit sell price too high' };
        }
      }

      // Create order in memory storage
      const newOrder = {
        id: Date.now(),
        userId: order.userId,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount.toString(),
        orderType: order.orderType,
        price: executionPrice.toString(),
        status: 'filled',
        strategyId: order.strategyId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      liveOrders.push(newOrder);

      // Create position if order is filled
      if (newOrder.status === 'filled') {
        await this.createPosition(newOrder, executionPrice);
      }

      return { 
        success: true, 
        orderId: newOrder.id, 
        executionPrice 
      };
    } catch (error) {
      console.error('Error executing order:', error);
      return { success: false, error: 'Order execution failed' };
    }
  }

  private async createPosition(order: any, executionPrice: number) {
    try {
      const newPosition = {
        id: Date.now() + Math.random(),
        userId: order.userId,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        entryPrice: executionPrice.toString(),
        status: 'open',
        strategyId: order.strategyId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      livePositions.push(newPosition);
    } catch (error) {
      console.error('Error creating position:', error);
    }
  }

  async closePosition(positionId: number, currentPrice: number): Promise<{ success: boolean; pnl?: number; error?: string }> {
    try {
      const positionIndex = livePositions.findIndex(p => p.id === positionId);
      if (positionIndex === -1) {
        return { success: false, error: 'Position not found' };
      }

      const position = livePositions[positionIndex];
      const entryPrice = parseFloat(position.entryPrice);
      const amount = parseFloat(position.amount);
      
      // Calculate PnL
      let pnl = 0;
      if (position.side === 'buy') {
        pnl = (currentPrice - entryPrice) * amount;
      } else {
        pnl = (entryPrice - currentPrice) * amount;
      }

      // Close position
      position.status = 'closed';
      position.exitPrice = currentPrice.toString();
      position.exitTime = new Date();
      position.pnl = pnl.toString();

      return { success: true, pnl };
    } catch (error) {
      console.error('Error closing position:', error);
      return { success: false, error: 'Failed to close position' };
    }
  }
}

const orderExecutionService = new OrderExecutionService();

// Routes

// Get user's strategies for live trading
router.get('/strategies', authenticateToken, async (req: any, res) => {
  try {
    if (typeof db.select !== 'function') {
      return res.json({ success: true, data: [] });
    }
    
    const userStrategies = await db.select().from(strategies).where(eq(strategies.userId, req.user.id));
    res.json({ success: true, data: Array.isArray(userStrategies) ? userStrategies : [] });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch strategies' });
  }
});

// Execute manual order
router.post('/order/execute', authenticateToken, async (req: any, res) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await orderExecutionService.executeOrder(orderData);
    res.json(result);
  } catch (error) {
    console.error('Error executing manual order:', error);
    res.status(500).json({ success: false, error: 'Failed to execute order' });
  }
});

// Get live orders
router.get('/orders', authenticateToken, async (req: any, res) => {
  try {
    const userOrders = liveOrders.filter(order => order.userId === req.user.id);
    res.json({ success: true, data: userOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Get live positions
router.get('/positions', authenticateToken, async (req: any, res) => {
  try {
    const userPositions = livePositions.filter(position => position.userId === req.user.id);
    
    // Add real-time PnL calculation
    const enrichedPositions = userPositions.map((position) => {
      if (position.status === 'open') {
        const currentPrice = marketDataService.getPrice(position.symbol);
        if (currentPrice) {
          const entryPrice = parseFloat(position.entryPrice);
          const amount = parseFloat(position.amount);
          
          let unrealizedPnl = 0;
          if (position.side === 'buy') {
            unrealizedPnl = (currentPrice - entryPrice) * amount;
          } else {
            unrealizedPnl = (entryPrice - currentPrice) * amount;
          }
          
          return {
            ...position,
            currentPrice: currentPrice.toString(),
            unrealizedPnl: unrealizedPnl.toString()
          };
        }
      }
      return position;
    });

    res.json({ success: true, data: enrichedPositions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch positions' });
  }
});

// Close position
router.post('/position/close', authenticateToken, async (req: any, res) => {
  try {
    const { positionId } = req.body;
    const position = livePositions.find(p => p.id === positionId && p.userId === req.user.id);
    
    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    const currentPrice = marketDataService.getPrice(position.symbol);
    if (!currentPrice) {
      return res.status(400).json({ success: false, error: 'Unable to get current price' });
    }

    const result = await orderExecutionService.closePosition(positionId, currentPrice);
    res.json(result);
  } catch (error) {
    console.error('Error closing position:', error);
    res.status(500).json({ success: false, error: 'Failed to close position' });
  }
});

// Get live market data - Enhanced endpoint for frontend to use
router.get('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Try to get fresh price from Binance API
    try {
      const price = await marketDataService.fetchRealTimePrice(symbol);
      res.json({ 
        success: true, 
        data: { 
          symbol, 
          price, 
          timestamp: new Date() 
        } 
      });
    } catch (error) {
      console.error(`Error fetching real-time price for ${symbol}:`, error);
      
      // Fallback to cached price
      const cachedPrice = marketDataService.getPrice(symbol);
      if (cachedPrice) {
        res.json({ 
          success: true, 
          data: { 
            symbol, 
            price: cachedPrice, 
            timestamp: new Date() 
          } 
        });
      } else {
        res.status(404).json({ success: false, error: 'Symbol not found and no cached price available' });
      }
    }
  } catch (error) {
    console.error('Error in market-data endpoint:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market data' });
  }
});

// Get trading dashboard data
router.get('/dashboard', authenticateToken, async (req: any, res) => {
  try {
    const orders = liveOrders.filter(o => o.userId === req.user.id);
    const positions = livePositions.filter(p => p.userId === req.user.id);
    
    // Get strategies from database
    let userStrategies = [];
    if (typeof db.select === 'function') {
      try {
        const strategyResult = await db.select().from(strategies).where(eq(strategies.userId, req.user.id));
        userStrategies = Array.isArray(strategyResult) ? strategyResult : [];
      } catch (error) {
        console.error('Error fetching strategies for dashboard:', error);
      }
    }

    // Calculate portfolio metrics
    let totalPnl = 0;
    let totalValue = 0;
    let openPositions = 0;

    for (const position of positions) {
      if (position.status === 'open') {
        openPositions++;
        const currentPrice = marketDataService.getPrice(position.symbol);
        if (currentPrice) {
          const entryPrice = parseFloat(position.entryPrice);
          const amount = parseFloat(position.amount);
          
          let pnl = 0;
          if (position.side === 'buy') {
            pnl = (currentPrice - entryPrice) * amount;
          } else {
            pnl = (entryPrice - currentPrice) * amount;
          }
          
          totalPnl += pnl;
          totalValue += currentPrice * amount;
        }
      } else if (position.exitPrice) {
        // Calculate realized PnL for closed positions
        const entryPrice = parseFloat(position.entryPrice);
        const exitPrice = parseFloat(position.exitPrice);
        const amount = parseFloat(position.amount);
        
        let realizedPnl = 0;
        if (position.side === 'buy') {
          realizedPnl = (exitPrice - entryPrice) * amount;
        } else {
          realizedPnl = (entryPrice - exitPrice) * amount;
        }
        
        totalPnl += realizedPnl;
      }
    }

    const dashboardData = {
      totalPnl,
      totalValue,
      openPositionsCount: openPositions,
      totalOrders: orders.length,
      activeStrategies: userStrategies.filter((s: any) => s.isActive).length,
      recentOrders: orders.slice(0, 10),
      openPositions: positions.filter(p => p.status === 'open'),
      recentTrades: orders.filter(o => o.status === 'filled').slice(0, 10),
      marketPrices: livePrices
    };

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

export default router;