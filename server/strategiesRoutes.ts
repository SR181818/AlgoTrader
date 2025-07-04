
import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { strategies } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';

const router = Router();

// Zod schemas
const strategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['trend_following', 'mean_reversion', 'momentum', 'custom']),
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  riskPercentage: z.number().min(0).max(1).optional(),
  maxPositions: z.number().min(1).optional(),
  entryConditions: z.array(z.string()).optional(),
  exitConditions: z.array(z.string()).optional(),
  strategyConfig: z.object({
    indicators: z.array(z.any()).optional(),
    rules: z.object({
      entry: z.array(z.any()),
      exit: z.array(z.any())
    }),
    riskManagement: z.object({
      positionSize: z.number(),
      stopLoss: z.number(),
      takeProfit: z.number(),
      maxDrawdown: z.number()
    }),
    timeframe: z.string(),
    symbol: z.string()
  })
});

const updateStrategySchema = strategySchema.partial().extend({
  id: z.number()
});

// GET /api/strategies - Get user's strategies
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userStrategies = await db
      .select()
      .from(strategies)
      .where(eq(strategies.userId, req.user.userId));

    res.json({
      success: true,
      strategies: userStrategies.map(s => ({
        ...s,
        entryConditions: s.entryConditions ? JSON.parse(s.entryConditions) : [],
        exitConditions: s.exitConditions ? JSON.parse(s.exitConditions) : [],
        strategyConfig: s.strategyConfig ? JSON.parse(s.strategyConfig) : null
      }))
    });
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// POST /api/strategies - Create strategy
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const validation = strategySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid strategy data', 
        details: validation.error.errors 
      });
    }

    const { 
      name, 
      description, 
      type, 
      symbol, 
      timeframe, 
      stopLoss, 
      takeProfit, 
      riskPercentage, 
      maxPositions, 
      entryConditions, 
      exitConditions,
      strategyConfig
    } = validation.data;

    const [strategy] = await db
      .insert(strategies)
      .values({
        userId: req.user.userId,
        name,
        description,
        type,
        symbol,
        timeframe,
        stopLoss: stopLoss?.toString(),
        takeProfit: takeProfit?.toString(),
        riskPercentage: riskPercentage?.toString(),
        maxPositions,
        entryConditions: entryConditions ? JSON.stringify(entryConditions) : null,
        exitConditions: exitConditions ? JSON.stringify(exitConditions) : null,
        strategyConfig: JSON.stringify(strategyConfig)
      })
      .returning();

    res.json({
      success: true,
      strategy: {
        ...strategy,
        entryConditions: strategy.entryConditions ? JSON.parse(strategy.entryConditions) : [],
        exitConditions: strategy.exitConditions ? JSON.parse(strategy.exitConditions) : [],
        strategyConfig: strategy.strategyConfig ? JSON.parse(strategy.strategyConfig) : null
      }
    });
  } catch (error) {
    console.error('Create strategy error:', error);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// PUT /api/strategies/:id - Update strategy
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const strategyId = parseInt(req.params.id);
    const validation = updateStrategySchema.safeParse({ ...req.body, id: strategyId });
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid strategy data', 
        details: validation.error.errors 
      });
    }

    const { 
      name, 
      description, 
      type, 
      symbol, 
      timeframe, 
      stopLoss, 
      takeProfit, 
      riskPercentage, 
      maxPositions, 
      entryConditions, 
      exitConditions,
      strategyConfig 
    } = validation.data;

    const updateData: any = { updatedAt: new Date() };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (symbol) updateData.symbol = symbol;
    if (timeframe) updateData.timeframe = timeframe;
    if (stopLoss !== undefined) updateData.stopLoss = stopLoss.toString();
    if (takeProfit !== undefined) updateData.takeProfit = takeProfit.toString();
    if (riskPercentage !== undefined) updateData.riskPercentage = riskPercentage.toString();
    if (maxPositions !== undefined) updateData.maxPositions = maxPositions;
    if (entryConditions !== undefined) updateData.entryConditions = JSON.stringify(entryConditions);
    if (exitConditions !== undefined) updateData.exitConditions = JSON.stringify(exitConditions);
    if (strategyConfig !== undefined) updateData.strategyConfig = JSON.stringify(strategyConfig);

    const [strategy] = await db
      .update(strategies)
      .set(updateData)
      .where(and(
        eq(strategies.id, strategyId),
        eq(strategies.userId, req.user.userId)
      ))
      .returning();

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({
      success: true,
      strategy: {
        ...strategy,
        entryConditions: strategy.entryConditions ? JSON.parse(strategy.entryConditions) : [],
        exitConditions: strategy.exitConditions ? JSON.parse(strategy.exitConditions) : [],
        strategyConfig: strategy.strategyConfig ? JSON.parse(strategy.strategyConfig) : null
      }
    });
  } catch (error) {
    console.error('Update strategy error:', error);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// DELETE /api/strategies/:id - Delete strategy
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const strategyId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(strategies)
      .where(and(
        eq(strategies.id, strategyId),
        eq(strategies.userId, req.user.userId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ success: true, message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Delete strategy error:', error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

export default router;
