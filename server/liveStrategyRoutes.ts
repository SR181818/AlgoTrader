import { Router, Request, Response } from 'express';
import { authenticateToken } from './authRoutes';
import * as ccxt from 'ccxt';
import { db } from './db';
import { users, strategies } from '../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// In-memory storage for strategies and positions (in production, use database)
const activeStrategies = new Map();
const livePositions = new Map();
const strategyStorage = new Map();

// Predefined strategies
const predefinedStrategies = [
  {
    id: 'trend_following_v1',
    name: 'Trend Following Strategy v1.0',
    description: 'Follow trending markets with RSI and SMA indicators',
    type: 'trend_following',
    parameters: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      stopLoss: 2,
      takeProfit: 4,
      riskPercentage: 1,
      maxPositions: 3,
    },
    conditions: {
      entry: ['RSI < 30', 'Price > SMA_20', 'Volume > Average_Volume * 1.2'],
      exit: ['RSI > 70', 'Price < SMA_20', 'Stop Loss Hit']
    },
    isActive: false,
    performance: {
      totalTrades: 0,
      winRate: 0,
      pnl: 0,
      maxDrawdown: 0,
    }
  },
  {
    id: 'mean_reversion_v1',
    name: 'Mean Reversion Strategy v1.0',
    description: 'Buy oversold and sell overbought conditions',
    type: 'mean_reversion',
    parameters: {
      symbol: 'ETHUSDT',
      timeframe: '15m',
      stopLoss: 1.5,
      takeProfit: 3,
      riskPercentage: 0.8,
      maxPositions: 2,
    },
    conditions: {
      entry: ['RSI < 25', 'Price < Bollinger_Lower', 'MACD_Histogram > 0'],
      exit: ['RSI > 75', 'Price > Bollinger_Upper', 'Take Profit Hit']
    },
    isActive: false,
    performance: {
      totalTrades: 0,
      winRate: 0,
      pnl: 0,
      maxDrawdown: 0,
    }
  }
];

// Initialize predefined strategies
predefinedStrategies.forEach(strategy => {
  strategyStorage.set(strategy.id, strategy);
});

// Decrypt function (same as in settingsRoutes)
function decrypt(encryptedText: string): string {
  // Simple base64 decode for demo - use proper encryption in production
  try {
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    return encryptedText;
  }
}

// Get all available strategies
router.get('/strategies', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Get user's custom strategies from database
    const userStrategies = await db.select().from(strategies).where(eq(strategies.userId, userId));
    
    // Transform database strategies to match frontend format
    const transformedStrategies = userStrategies.map(strategy => ({
      id: strategy.id.toString(),
      name: strategy.name,
      description: strategy.description || '',
      type: strategy.type,
      parameters: {
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        stopLoss: parseFloat(strategy.stopLoss || '0'),
        takeProfit: parseFloat(strategy.takeProfit || '0'),
        riskPercentage: parseFloat(strategy.riskPercentage || '1'),
        maxPositions: strategy.maxPositions || 1,
      },
      conditions: {
        entry: strategy.entryConditions ? JSON.parse(strategy.entryConditions) : [],
        exit: strategy.exitConditions ? JSON.parse(strategy.exitConditions) : []
      },
      isActive: strategy.isActive || false,
      performance: {
        totalTrades: strategy.totalTrades || 0,
        winRate: parseFloat(strategy.winRate || '0'),
        pnl: parseFloat(strategy.pnl || '0'),
        maxDrawdown: parseFloat(strategy.maxDrawdown || '0'),
      }
    }));
    
    // Get in-memory strategies (temporary ones not saved to database)
    const memoryStrategies = Array.from(strategyStorage.values());
    
    // Combine predefined strategies, database strategies, and memory strategies
    const allStrategies = [...predefinedStrategies, ...transformedStrategies, ...memoryStrategies];
    
    res.json(allStrategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// Create a new custom strategy
router.post('/strategies', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, type, parameters, conditions, description } = req.body;
    const userId = req.user.id;
    
    // Save strategy to database
    const newStrategy = await db.insert(strategies).values({
      userId: userId,
      name: name,
      description: description || `Custom ${type} strategy`,
      type: type || 'custom',
      symbol: parameters.symbol || 'BTCUSDT',
      timeframe: parameters.timeframe || '1h',
      stopLoss: parameters.stopLoss?.toString() || '2',
      takeProfit: parameters.takeProfit?.toString() || '4',
      riskPercentage: parameters.riskPercentage?.toString() || '1',
      maxPositions: parameters.maxPositions || 1,
      entryConditions: JSON.stringify(conditions.entry || []),
      exitConditions: JSON.stringify(conditions.exit || []),
      isActive: false,
    }).returning();

    const responseStrategy = {
      id: newStrategy[0].id.toString(),
      name: newStrategy[0].name,
      description: newStrategy[0].description,
      type: newStrategy[0].type,
      parameters: {
        symbol: newStrategy[0].symbol,
        timeframe: newStrategy[0].timeframe,
        stopLoss: parseFloat(newStrategy[0].stopLoss || '0'),
        takeProfit: parseFloat(newStrategy[0].takeProfit || '0'),
        riskPercentage: parseFloat(newStrategy[0].riskPercentage || '1'),
        maxPositions: newStrategy[0].maxPositions || 1,
      },
      conditions: {
        entry: JSON.parse(newStrategy[0].entryConditions || '[]'),
        exit: JSON.parse(newStrategy[0].exitConditions || '[]')
      },
      isActive: newStrategy[0].isActive,
      performance: {
        totalTrades: newStrategy[0].totalTrades || 0,
        winRate: parseFloat(newStrategy[0].winRate || '0'),
        pnl: parseFloat(newStrategy[0].pnl || '0'),
        maxDrawdown: parseFloat(newStrategy[0].maxDrawdown || '0'),
      }
    };
    
    res.json({
      success: true,
      message: 'Strategy created successfully',
      strategy: responseStrategy
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// Start a strategy
router.post('/strategy/start', authenticateToken, async (req: any, res: Response) => {
  try {
    const { strategyId } = req.body;
    
    const strategy = strategyStorage.get(strategyId);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Check if strategy is already active
    if (activeStrategies.has(strategyId)) {
      return res.status(400).json({ error: 'Strategy is already running' });
    }

    // Mark strategy as active
    strategy.isActive = true;
    strategyStorage.set(strategyId, strategy);
    
    // Add to active strategies with monitoring data
    activeStrategies.set(strategyId, {
      ...strategy,
      userId: req.user.userId,
      startedAt: new Date().toISOString(),
      lastCheck: new Date().toISOString(),
      status: 'running'
    });

    res.json({
      success: true,
      isActive: true,
      message: `Strategy "${strategy.name}" started successfully`,
      strategy: strategy
    });
  } catch (error) {
    console.error('Error starting strategy:', error);
    res.status(500).json({ error: 'Failed to start strategy' });
  }
});

// Stop a strategy
router.post('/strategy/stop', authenticateToken, async (req: any, res: Response) => {
  try {
    const { strategyId } = req.body;
    
    const strategy = strategyStorage.get(strategyId);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Mark strategy as inactive
    strategy.isActive = false;
    strategyStorage.set(strategyId, strategy);
    
    // Remove from active strategies
    activeStrategies.delete(strategyId);

    res.json({
      success: true,
      isActive: false,
      message: `Strategy "${strategy.name}" stopped successfully`,
      strategy: strategy
    });
  } catch (error) {
    console.error('Error stopping strategy:', error);
    res.status(500).json({ error: 'Failed to stop strategy' });
  }
});

// Manual trade execution
router.post('/manual-execute', authenticateToken, async (req: any, res: Response) => {
  try {
    const { symbol, side, amount, type, price } = req.body;
    const userId = req.user.userId;

    // Get user's API credentials for live trading
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let executionResult;

    if (user.binanceApiKey && user.binanceApiSecret) {
      // Execute live trade with real API
      try {
        const apiKey = decrypt(user.binanceApiKey);
        const apiSecret = decrypt(user.binanceApiSecret);

        const exchange = new ccxt.binance({
          apiKey,
          secret: apiSecret,
          sandbox: false, // Set to true for testnet
          enableRateLimit: true,
        });

        // Execute the trade
        const order = await exchange.createMarketOrder(symbol, side, amount);
        
        executionResult = {
          success: true,
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          amount: order.amount,
          price: order.price || order.average,
          status: order.status,
          timestamp: order.timestamp,
          live: true
        };

        // Store position
        const positionId = `pos_${Date.now()}_${userId}`;
        livePositions.set(positionId, {
          id: positionId,
          userId,
          symbol,
          side,
          size: amount,
          entryPrice: executionResult.price,
          currentPrice: executionResult.price,
          pnl: 0,
          pnlPercent: 0,
          timestamp: new Date().toISOString(),
          orderId: order.id,
          isLive: true
        });

      } catch (apiError) {
        console.error('Live trading error:', apiError);
        // Fall back to paper trading
        executionResult = await executePaperTrade(symbol, side, amount, type, price);
        executionResult.live = false;
        executionResult.note = 'Executed as paper trade due to API error';
      }
    } else {
      // Execute paper trade
      executionResult = await executePaperTrade(symbol, side, amount, type, price);
      executionResult.live = false;
    }

    res.json(executionResult);
  } catch (error) {
    console.error('Error executing manual trade:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Paper trade execution function
async function executePaperTrade(symbol: string, side: string, amount: number, type: string, price?: number) {
  // Get current market price (you'd use real price feeds here)
  const currentPrice = price || 50000; // Mock price for demo
  
  const orderId = `paper_${Date.now()}`;
  
  return {
    success: true,
    orderId,
    symbol,
    side,
    amount,
    price: currentPrice,
    status: 'filled',
    timestamp: Date.now(),
    paperTrade: true
  };
}

// Get live positions
router.get('/live-positions', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const userPositions = Array.from(livePositions.values())
      .filter((pos: any) => pos.userId === userId);

    // Update current prices and PnL (mock update for demo)
    const updatedPositions = userPositions.map((pos: any) => {
      const currentPrice = pos.entryPrice * (1 + (Math.random() - 0.5) * 0.02); // Mock price movement
      const pnl = (currentPrice - pos.entryPrice) * pos.size * (pos.side === 'buy' ? 1 : -1);
      const pnlPercent = (pnl / (pos.entryPrice * pos.size)) * 100;

      return {
        ...pos,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2))
      };
    });

    res.json(updatedPositions);
  } catch (error) {
    console.error('Error fetching live positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Get strategy performance
router.get('/strategy/:strategyId/performance', authenticateToken, async (req: any, res: Response) => {
  try {
    const { strategyId } = req.params;
    const strategy = strategyStorage.get(strategyId);
    
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({
      success: true,
      performance: strategy.performance,
      isActive: strategy.isActive,
      strategy: strategy
    });
  } catch (error) {
    console.error('Error fetching strategy performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

export default router;