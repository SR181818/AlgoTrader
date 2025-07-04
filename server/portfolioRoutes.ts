
import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { userPortfolios, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';

const router = Router();

// Zod schemas
const portfolioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  portfolioConfig: z.object({
    accounts: z.array(z.any()),
    allocations: z.record(z.number()),
    riskLimits: z.object({
      maxRiskPerTrade: z.number().min(0).max(0.05),
      maxDrawdown: z.number().min(0).max(0.2),
      maxPositions: z.number().min(1).max(10)
    }),
    positions: z.array(z.any()).optional(),
    metrics: z.any().optional()
  })
});

const updatePortfolioSchema = portfolioSchema.partial().extend({
  id: z.number()
});

// GET /api/portfolio - Get user's portfolios
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const portfolios = await db
      .select()
      .from(userPortfolios)
      .where(eq(userPortfolios.userId, req.user.userId));

    res.json({
      success: true,
      portfolios: portfolios.map(p => ({
        ...p,
        portfolioConfig: p.portfolioConfig ? JSON.parse(p.portfolioConfig) : null
      }))
    });
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

// POST /api/portfolio - Create portfolio
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const validation = portfolioSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid portfolio data', 
        details: validation.error.errors 
      });
    }

    const { name, description, portfolioConfig } = validation.data;

    const [portfolio] = await db
      .insert(userPortfolios)
      .values({
        userId: req.user.userId,
        name,
        description,
        portfolioConfig: JSON.stringify(portfolioConfig)
      })
      .returning();

    res.json({
      success: true,
      portfolio: {
        ...portfolio,
        portfolioConfig: JSON.parse(portfolio.portfolioConfig || '{}')
      }
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

// PUT /api/portfolio/:id - Update portfolio
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const validation = updatePortfolioSchema.safeParse({ ...req.body, id: portfolioId });
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid portfolio data', 
        details: validation.error.errors 
      });
    }

    const { name, description, portfolioConfig } = validation.data;
    const updateData: any = { updatedAt: new Date() };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (portfolioConfig) updateData.portfolioConfig = JSON.stringify(portfolioConfig);

    const [portfolio] = await db
      .update(userPortfolios)
      .set(updateData)
      .where(and(
        eq(userPortfolios.id, portfolioId),
        eq(userPortfolios.userId, req.user.userId)
      ))
      .returning();

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({
      success: true,
      portfolio: {
        ...portfolio,
        portfolioConfig: portfolio.portfolioConfig ? JSON.parse(portfolio.portfolioConfig) : null
      }
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
});

// DELETE /api/portfolio/:id - Delete portfolio
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const portfolioId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(userPortfolios)
      .where(and(
        eq(userPortfolios.id, portfolioId),
        eq(userPortfolios.userId, req.user.userId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ success: true, message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Failed to delete portfolio' });
  }
});

export default router;
