import { Router, Request, Response } from 'express';
import { authenticateToken } from './authRoutes';
import * as ccxt from 'ccxt';
import { db } from './db';
import { users, strategies } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from './storage';

const router = Router();

// Get all strategies for the authenticated user - main endpoint used by frontend
router.get('/strategies', async (req: any, res) => {
  try {
    const userId = req.user?.id || 1; // Fallback for development
    console.log(`Fetching strategies for user ${userId}`);

    const userStrategies = await storage.getStrategies(userId);
    console.log(`Found ${userStrategies.length} strategies for user ${userId}`);

    // Transform database strategies to match Live Trading component format
    const transformedStrategies = userStrategies.map(strategy => {
      try {
        return {
          id: strategy.id.toString(),
          name: strategy.name,
          description: strategy.description || `Custom ${strategy.type || 'trading'} strategy`,
          type: strategy.type || 'custom',
          parameters: {
            symbol: strategy.symbol || 'BTCUSDT',
            timeframe: strategy.timeframe || '1h',
            stopLoss: parseFloat(strategy.stopLoss || '2'),
            takeProfit: parseFloat(strategy.takeProfit || '4'),
            riskPercentage: parseFloat(strategy.riskPercentage || '1'),
            maxPositions: strategy.maxPositions || 1,
          },
          conditions: {
            entry: strategy.entryConditions ? 
              (typeof strategy.entryConditions === 'string' ? 
                JSON.parse(strategy.entryConditions) : strategy.entryConditions) : [],
            exit: strategy.exitConditions ? 
              (typeof strategy.exitConditions === 'string' ? 
                JSON.parse(strategy.exitConditions) : strategy.exitConditions) : []
          },
          isActive: strategy.isActive || false,
          performance: {
            totalTrades: strategy.totalTrades || 0,
            winRate: parseFloat(strategy.winRate || '0'),
            pnl: parseFloat(strategy.pnl || '0'),
            maxDrawdown: parseFloat(strategy.maxDrawdown || '0'),
          },
          source: 'database',
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt
        };
      } catch (parseError) {
        console.error('Error parsing strategy:', strategy.id, parseError);
        return {
          id: strategy.id.toString(),
          name: strategy.name || 'Untitled Strategy',
          description: 'Custom trading strategy',
          type: 'custom',
          parameters: {
            symbol: 'BTCUSDT',
            timeframe: '1h',
            stopLoss: 2,
            takeProfit: 4,
            riskPercentage: 1,
            maxPositions: 1,
          },
          conditions: { entry: [], exit: [] },
          isActive: false,
          performance: { totalTrades: 0, winRate: 0, pnl: 0, maxDrawdown: 0 },
          source: 'database'
        };
      }
    });

    // Add predefined template strategies (always include these)
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
        },
        source: 'template'
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
        },
        source: 'template'
      },
      {
        id: 'momentum_breakout_v1',
        name: 'Momentum Breakout Strategy v1.0',
        description: 'Catch momentum breakouts with volume confirmation',
        type: 'momentum',
        parameters: {
          symbol: 'ADAUSDT',
          timeframe: '4h',
          stopLoss: 2.5,
          takeProfit: 5,
          riskPercentage: 1.2,
          maxPositions: 1,
        },
        conditions: {
          entry: ['Price breaks 20-day high', 'Volume > 2x average', 'RSI > 60'],
          exit: ['Price breaks 10-day low', 'RSI < 40', 'Take Profit Hit']
        },
        isActive: false,
        performance: {
          totalTrades: 0,
          winRate: 0,
          pnl: 0,
          maxDrawdown: 0,
        },
        source: 'template'
      },
      {
        id: 'scalping_ema_v1',
        name: 'EMA Scalping Strategy v1.0',
        description: 'Quick scalping using EMA crossovers',
        type: 'scalping',
        parameters: {
          symbol: 'SOLUSDT',
          timeframe: '5m',
          stopLoss: 0.8,
          takeProfit: 1.6,
          riskPercentage: 0.5,
          maxPositions: 3,
        },
        conditions: {
          entry: ['EMA_9 crosses above EMA_21', 'MACD > 0', 'Volume increase'],
          exit: ['EMA_9 crosses below EMA_21', 'MACD < 0', 'Stop Loss Hit']
        },
        isActive: false,
        performance: {
          totalTrades: 0,
          winRate: 0,
          pnl: 0,
          maxDrawdown: 0,
        },
        source: 'template'
      }
    ];

    // Combine user strategies with predefined templates
    const allStrategies = [...transformedStrategies, ...predefinedStrategies];

    res.json(allStrategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies', details: error.message });
  }
});

// Live strategy execution management
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
router.get('/trading/strategies', authenticateToken, async (req: any, res: Response) => {
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
      },
      source: 'database' // Add source identifier
    }));

    // Add predefined strategies with source identifier
    const predefinedWithSource = predefinedStrategies.map(strategy => ({
      ...strategy,
      source: 'predefined'
    }));

    // Get in-memory strategies (temporary ones not saved to database)
    const memoryStrategies = Array.from(strategyStorage.values()).map(strategy => ({
      ...strategy,
      source: 'memory'
    }));

    // Combine all strategies with database strategies first (higher priority)
    const allStrategies = [...transformedStrategies, ...predefinedWithSource, ...memoryStrategies];

    res.json(allStrategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// Create a new custom strategy
router.post('/strategies', async (req: any, res: Response) => {
  try {
    const { name, type, parameters, conditions, description } = req.body;
    const userId = req.user?.id || 1; // Use authenticated user ID or fallback for development

    // Create strategy object for database
    const strategyData = {
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
    };

    // Save strategy to database using storage service
    const newStrategy = await storage.createStrategy(strategyData);

    const responseStrategy = {
      id: newStrategy.id.toString(),
      name: newStrategy.name,
      description: newStrategy.description,
      type: newStrategy.type,
      parameters: {
        symbol: newStrategy.symbol,
        timeframe: newStrategy.timeframe,
        stopLoss: parseFloat(newStrategy.stopLoss || '0'),
        takeProfit: parseFloat(newStrategy.takeProfit || '0'),
        riskPercentage: parseFloat(newStrategy.riskPercentage || '1'),
        maxPositions: newStrategy.maxPositions || 1,
      },
      conditions: {
        entry: JSON.parse(newStrategy.entryConditions || '[]'),
        exit: JSON.parse(newStrategy.exitConditions || '[]')
      },
      isActive: newStrategy.isActive,
      performance: {
        totalTrades: newStrategy.totalTrades || 0,
        winRate: parseFloat(newStrategy.winRate || '0'),
        pnl: parseFloat(newStrategy.pnl || '0'),
        maxDrawdown: parseFloat(newStrategy.maxDrawdown || '0'),
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
    const userId = req.user.id;

    let strategy = strategyStorage.get(strategyId);

    // If not in memory, try to get from database
    if (!strategy) {
      const dbStrategy = await storage.getStrategy(parseInt(strategyId));
      if (dbStrategy) {
        strategy = {
          id: dbStrategy.id.toString(),
          name: dbStrategy.name,
          description: dbStrategy.description || '',
          type: dbStrategy.type,
          parameters: {
            symbol: dbStrategy.symbol,
            timeframe: dbStrategy.timeframe,
            stopLoss: parseFloat(dbStrategy.stopLoss || '0'),
            takeProfit: parseFloat(dbStrategy.takeProfit || '0'),
            riskPercentage: parseFloat(dbStrategy.riskPercentage || '1'),
            maxPositions: dbStrategy.maxPositions || 1,
          },
          conditions: {
            entry: dbStrategy.entryConditions ? JSON.parse(dbStrategy.entryConditions) : [],
            exit: dbStrategy.exitConditions ? JSON.parse(dbStrategy.exitConditions) : []
          },
          isActive: false,
          performance: {
            totalTrades: dbStrategy.totalTrades || 0,
            winRate: parseFloat(dbStrategy.winRate || '0'),
            pnl: parseFloat(dbStrategy.pnl || '0'),
            maxDrawdown: parseFloat(dbStrategy.maxDrawdown || '0'),
          }
        };
        // Store in memory for active use
        strategyStorage.set(strategyId, strategy);
      }
    }

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

    // Update database if it's a database strategy
    if (!isNaN(parseInt(strategyId))) {
      await storage.updateStrategy(parseInt(strategyId), { isActive: true });
    }

    // Add to active strategies with monitoring data
    activeStrategies.set(strategyId, {
      ...strategy,
      userId: userId,
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

    // Update database if it's a database strategy
    if (!isNaN(parseInt(strategyId))) {
      await storage.updateStrategy(parseInt(strategyId), { isActive: false });
    }

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