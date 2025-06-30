
import { Router, Request, Response } from 'express';
import { authenticateToken } from './authRoutes';
import * as ccxt from 'ccxt';
import { db, query } from './db';
import { users, strategies } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from './storage';

const router = Router();

// Encryption/Decryption functions for API keys
function encrypt(text: string): string {
  // Simple base64 encode for demo - use proper encryption in production
  return Buffer.from(text).toString('base64');
}

function decrypt(encryptedText: string): string {
  try {
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    return encryptedText;
  }
}

// Get all strategies for the authenticated user
router.get('/strategies', async (req: any, res) => {
  try {
    const userId = req.user?.id || 1; // Fallback for development
    console.log(`Fetching strategies for user ${userId}`);

    let userStrategies = [];

    // Try to fetch from database first
    if (db && typeof db.select === 'function') {
      try {
        userStrategies = await db.select().from(strategies).where(eq(strategies.userId, userId));
      } catch (dbError) {
        console.log('Database not available, using raw SQL');
        // Try raw SQL query for Supabase
        const result = await query(
          'SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        userStrategies = result.rows || [];
      }
    } else {
      // Try raw SQL query for Supabase
      try {
        const result = await query(
          'SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        userStrategies = result.rows || [];
      } catch (error) {
        console.log('Raw SQL failed, using storage service');
        userStrategies = await storage.getStrategies(userId);
      }
    }

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
            stopLoss: parseFloat(strategy.stop_loss || strategy.stopLoss || '2'),
            takeProfit: parseFloat(strategy.take_profit || strategy.takeProfit || '4'),
            riskPercentage: parseFloat(strategy.risk_percentage || strategy.riskPercentage || '1'),
            maxPositions: strategy.max_positions || strategy.maxPositions || 1,
          },
          conditions: {
            entry: strategy.entry_conditions || strategy.entryConditions ? 
              (typeof (strategy.entry_conditions || strategy.entryConditions) === 'string' ? 
                JSON.parse(strategy.entry_conditions || strategy.entryConditions) : 
                (strategy.entry_conditions || strategy.entryConditions)) : [],
            exit: strategy.exit_conditions || strategy.exitConditions ? 
              (typeof (strategy.exit_conditions || strategy.exitConditions) === 'string' ? 
                JSON.parse(strategy.exit_conditions || strategy.exitConditions) : 
                (strategy.exit_conditions || strategy.exitConditions)) : []
          },
          isActive: strategy.is_active || strategy.isActive || false,
          performance: {
            totalTrades: strategy.total_trades || strategy.totalTrades || 0,
            winRate: parseFloat(strategy.win_rate || strategy.winRate || '0'),
            pnl: parseFloat(strategy.pnl || '0'),
            maxDrawdown: parseFloat(strategy.max_drawdown || strategy.maxDrawdown || '0'),
          },
          source: 'database',
          createdAt: strategy.created_at || strategy.createdAt,
          updatedAt: strategy.updated_at || strategy.updatedAt
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

    // Add predefined template strategies
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
        performance: { totalTrades: 0, winRate: 0, pnl: 0, maxDrawdown: 0 },
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
        performance: { totalTrades: 0, winRate: 0, pnl: 0, maxDrawdown: 0 },
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

// Create a new custom strategy
router.post('/strategies', async (req: any, res: Response) => {
  try {
    const { name, type, parameters, conditions, description } = req.body;
    const userId = req.user?.id || 1; // Use authenticated user ID or fallback

    // Create strategy object for database
    const strategyData = {
      user_id: userId,
      name: name,
      description: description || `Custom ${type} strategy`,
      type: type || 'custom',
      symbol: parameters.symbol || 'BTCUSDT',
      timeframe: parameters.timeframe || '1h',
      stop_loss: parameters.stopLoss?.toString() || '2',
      take_profit: parameters.takeProfit?.toString() || '4',
      risk_percentage: parameters.riskPercentage?.toString() || '1',
      max_positions: parameters.maxPositions || 1,
      entry_conditions: JSON.stringify(conditions.entry || []),
      exit_conditions: JSON.stringify(conditions.exit || []),
      is_active: false,
    };

    let newStrategy;

    // Try to insert into database
    try {
      if (db && typeof db.insert === 'function') {
        const [strategy] = await db.insert(strategies).values({
          userId: strategyData.user_id,
          name: strategyData.name,
          description: strategyData.description,
          type: strategyData.type,
          symbol: strategyData.symbol,
          timeframe: strategyData.timeframe,
          stopLoss: strategyData.stop_loss,
          takeProfit: strategyData.take_profit,
          riskPercentage: strategyData.risk_percentage,
          maxPositions: strategyData.max_positions,
          entryConditions: strategyData.entry_conditions,
          exitConditions: strategyData.exit_conditions,
          isActive: strategyData.is_active,
        }).returning();
        newStrategy = strategy;
      } else {
        throw new Error('Drizzle ORM not available, using raw SQL');
      }
    } catch (dbError) {
      console.log('Drizzle failed, using raw SQL');
      // Use raw SQL for Supabase
      const result = await query(`
        INSERT INTO strategies (
          user_id, name, description, type, symbol, timeframe, 
          stop_loss, take_profit, risk_percentage, max_positions,
          entry_conditions, exit_conditions, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        strategyData.user_id, strategyData.name, strategyData.description,
        strategyData.type, strategyData.symbol, strategyData.timeframe,
        strategyData.stop_loss, strategyData.take_profit, strategyData.risk_percentage,
        strategyData.max_positions, strategyData.entry_conditions,
        strategyData.exit_conditions, strategyData.is_active
      ]);
      newStrategy = result.rows[0];
    }

    const responseStrategy = {
      id: newStrategy.id.toString(),
      name: newStrategy.name,
      description: newStrategy.description,
      type: newStrategy.type,
      parameters: {
        symbol: newStrategy.symbol,
        timeframe: newStrategy.timeframe,
        stopLoss: parseFloat(newStrategy.stop_loss || newStrategy.stopLoss || '0'),
        takeProfit: parseFloat(newStrategy.take_profit || newStrategy.takeProfit || '0'),
        riskPercentage: parseFloat(newStrategy.risk_percentage || newStrategy.riskPercentage || '1'),
        maxPositions: newStrategy.max_positions || newStrategy.maxPositions || 1,
      },
      conditions: {
        entry: JSON.parse(newStrategy.entry_conditions || newStrategy.entryConditions || '[]'),
        exit: JSON.parse(newStrategy.exit_conditions || newStrategy.exitConditions || '[]')
      },
      isActive: newStrategy.is_active || newStrategy.isActive,
      performance: {
        totalTrades: newStrategy.total_trades || newStrategy.totalTrades || 0,
        winRate: parseFloat(newStrategy.win_rate || newStrategy.winRate || '0'),
        pnl: parseFloat(newStrategy.pnl || '0'),
        maxDrawdown: parseFloat(newStrategy.max_drawdown || newStrategy.maxDrawdown || '0'),
      }
    };

    res.json({
      success: true,
      message: 'Strategy created successfully',
      strategy: responseStrategy
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Failed to create strategy', details: error.message });
  }
});

// Start a strategy
router.post('/strategy/start', async (req: any, res: Response) => {
  try {
    const { strategyId } = req.body;
    const userId = req.user?.id || 1;

    // Get strategy from database
    let strategy;
    try {
      if (db && typeof db.select === 'function') {
        const [dbStrategy] = await db.select().from(strategies)
          .where(eq(strategies.id, parseInt(strategyId)))
          .limit(1);
        strategy = dbStrategy;
      } else {
        const result = await query('SELECT * FROM strategies WHERE id = $1', [strategyId]);
        strategy = result.rows[0];
      }
    } catch (error) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Update strategy to active
    try {
      if (db && typeof db.update === 'function') {
        await db.update(strategies)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(strategies.id, parseInt(strategyId)));
      } else {
        await query('UPDATE strategies SET is_active = $1, updated_at = $2 WHERE id = $3', 
          [true, new Date(), strategyId]);
      }
    } catch (error) {
      console.error('Error updating strategy status:', error);
    }

    res.json({
      success: true,
      isActive: true,
      message: `Strategy "${strategy.name}" started successfully`,
      strategy: {
        id: strategy.id.toString(),
        name: strategy.name,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error starting strategy:', error);
    res.status(500).json({ error: 'Failed to start strategy' });
  }
});

// Stop a strategy
router.post('/strategy/stop', async (req: any, res: Response) => {
  try {
    const { strategyId } = req.body;

    // Get strategy from database
    let strategy;
    try {
      if (db && typeof db.select === 'function') {
        const [dbStrategy] = await db.select().from(strategies)
          .where(eq(strategies.id, parseInt(strategyId)))
          .limit(1);
        strategy = dbStrategy;
      } else {
        const result = await query('SELECT * FROM strategies WHERE id = $1', [strategyId]);
        strategy = result.rows[0];
      }
    } catch (error) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Update strategy to inactive
    try {
      if (db && typeof db.update === 'function') {
        await db.update(strategies)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(strategies.id, parseInt(strategyId)));
      } else {
        await query('UPDATE strategies SET is_active = $1, updated_at = $2 WHERE id = $3', 
          [false, new Date(), strategyId]);
      }
    } catch (error) {
      console.error('Error updating strategy status:', error);
    }

    res.json({
      success: true,
      isActive: false,
      message: `Strategy "${strategy.name}" stopped successfully`,
      strategy: {
        id: strategy.id.toString(),
        name: strategy.name,
        isActive: false
      }
    });
  } catch (error) {
    console.error('Error stopping strategy:', error);
    res.status(500).json({ error: 'Failed to stop strategy' });
  }
});

// Get live positions
router.get('/live-positions', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || 1;

    let positions = [];
    try {
      const result = await query(
        'SELECT * FROM live_positions WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
        [userId, 'open']
      );
      positions = result.rows;
    } catch (error) {
      console.log('No live positions found');
      positions = [];
    }

    // Update current prices and PnL (mock update for demo)
    const updatedPositions = positions.map((pos: any) => {
      const currentPrice = pos.entry_price * (1 + (Math.random() - 0.5) * 0.02);
      const pnl = (currentPrice - pos.entry_price) * pos.size * (pos.side === 'buy' ? 1 : -1);
      const pnlPercent = (pnl / (pos.entry_price * pos.size)) * 100;

      return {
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side,
        size: parseFloat(pos.size),
        entryPrice: parseFloat(pos.entry_price),
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        timestamp: pos.created_at
      };
    });

    res.json(updatedPositions);
  } catch (error) {
    console.error('Error fetching live positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Manual trade execution
router.post('/manual-execute', async (req: any, res: Response) => {
  try {
    const { symbol, side, amount, type, price } = req.body;
    const userId = req.user?.id || 1;

    // Get user's API credentials
    let user;
    try {
      if (db && typeof db.select === 'function') {
        const [dbUser] = await db.select().from(users)
          .where(eq(users.id, userId))
          .limit(1);
        user = dbUser;
      } else {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        user = result.rows[0];
      }
    } catch (error) {
      console.log('User not found, using paper trading');
    }

    let executionResult;

    if (user && user.binance_api_key && user.binance_api_secret) {
      // Execute live trade with real API
      try {
        const apiKey = decrypt(user.binance_api_key);
        const apiSecret = decrypt(user.binance_api_secret);

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

        // Store position in database
        try {
          await query(`
            INSERT INTO live_positions (
              user_id, symbol, side, size, entry_price, current_price, 
              order_id, is_live, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId, symbol, side, amount, executionResult.price, 
            executionResult.price, order.id, true, 'open'
          ]);
        } catch (dbError) {
          console.error('Error storing position:', dbError);
        }

      } catch (apiError) {
        console.error('Live trading error:', apiError);
        // Fall back to paper trading
        executionResult = await executePaperTrade(symbol, side, amount, type, price, userId);
        executionResult.live = false;
        executionResult.note = 'Executed as paper trade due to API error';
      }
    } else {
      // Execute paper trade
      executionResult = await executePaperTrade(symbol, side, amount, type, price, userId);
      executionResult.live = false;
    }

    res.json(executionResult);
  } catch (error) {
    console.error('Error executing manual trade:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Paper trade execution function
async function executePaperTrade(symbol: string, side: string, amount: number, type: string, price?: number, userId?: number) {
  const currentPrice = price || 50000; // Mock price for demo
  const orderId = `paper_${Date.now()}`;

  // Store paper position in database
  if (userId) {
    try {
      await query(`
        INSERT INTO live_positions (
          user_id, symbol, side, size, entry_price, current_price, 
          order_id, is_live, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId, symbol, side, amount, currentPrice, 
        currentPrice, orderId, false, 'open'
      ]);
    } catch (dbError) {
      console.error('Error storing paper position:', dbError);
    }
  }

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

// Save API keys endpoint
router.post('/api-keys', async (req: any, res: Response) => {
  try {
    const { binanceApiKey, binanceApiSecret } = req.body;
    const userId = req.user?.id || 1;

    if (!binanceApiKey || !binanceApiSecret) {
      return res.status(400).json({ error: 'Both API key and secret are required' });
    }

    // Encrypt the API keys
    const encryptedApiKey = encrypt(binanceApiKey);
    const encryptedApiSecret = encrypt(binanceApiSecret);

    // Update user's API keys in database
    try {
      if (db && typeof db.update === 'function') {
        await db.update(users)
          .set({ 
            binanceApiKey: encryptedApiKey, 
            binanceApiSecret: encryptedApiSecret,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      } else {
        await query(
          'UPDATE users SET binance_api_key = $1, binance_api_secret = $2, updated_at = $3 WHERE id = $4',
          [encryptedApiKey, encryptedApiSecret, new Date(), userId]
        );
      }

      res.json({
        success: true,
        message: 'API keys saved successfully'
      });
    } catch (error) {
      console.error('Error saving API keys:', error);
      res.status(500).json({ error: 'Failed to save API keys' });
    }
  } catch (error) {
    console.error('Error processing API keys:', error);
    res.status(500).json({ error: 'Failed to process API keys' });
  }
});

// Get API keys status endpoint
router.get('/api-keys/status', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || 1;

    let user;
    try {
      if (db && typeof db.select === 'function') {
        const [dbUser] = await db.select().from(users)
          .where(eq(users.id, userId))
          .limit(1);
        user = dbUser;
      } else {
        const result = await query('SELECT binance_api_key, binance_api_secret FROM users WHERE id = $1', [userId]);
        user = result.rows[0];
      }
    } catch (error) {
      return res.json({ hasApiKeys: false });
    }

    const hasApiKeys = !!(user?.binance_api_key && user?.binance_api_secret);

    res.json({
      hasApiKeys,
      isConfigured: hasApiKeys
    });
  } catch (error) {
    console.error('Error checking API keys status:', error);
    res.json({ hasApiKeys: false });
  }
});

export default router;
