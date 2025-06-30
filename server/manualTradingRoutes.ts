
import express from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { manualTradingBalances, manualTradingTransactions } from '@shared/schema';

const router = express.Router();

// Get user balances
router.get('/balances/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check if db.select is properly initialized
    if (typeof db.select !== 'function') {
      // Fallback for in-memory database
      const balanceMap: { [key: string]: number } = {
        USDT: 10000,
        BTC: 0,
        ETH: 0,
        ADA: 0,
        SOL: 0,
        DOT: 0
      };
      return res.json(balanceMap);
    }

    const balances = await db.select().from(manualTradingBalances).where(eq(manualTradingBalances.userId, userId));
    
    // Convert to expected format
    const balanceMap: { [key: string]: number } = {
      USDT: 10000,
      BTC: 0,
      ETH: 0,
      ADA: 0,
      SOL: 0,
      DOT: 0
    };

    if (Array.isArray(balances)) {
      balances.forEach(balance => {
        if (balance && balance.currency && balance.balance) {
          balanceMap[balance.currency] = parseFloat(balance.balance);
        }
      });
    }

    res.json(balanceMap);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// Update user balance
router.post('/balances/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { currency, balance, tradeId, description } = req.body;

    // Check if balance record exists
    const existingBalance = await db.select()
      .from(manualTradingBalances)
      .where(and(
        eq(manualTradingBalances.userId, userId),
        eq(manualTradingBalances.currency, currency)
      ));

    let newBalance;
    if (existingBalance.length > 0) {
      // Update existing balance
      [newBalance] = await db.update(manualTradingBalances)
        .set({ 
          balance: balance.toString(),
          updatedAt: new Date()
        })
        .where(and(
          eq(manualTradingBalances.userId, userId),
          eq(manualTradingBalances.currency, currency)
        ))
        .returning();
    } else {
      // Create new balance record
      [newBalance] = await db.insert(manualTradingBalances)
        .values({
          userId,
          currency,
          balance: balance.toString()
        })
        .returning();
    }

    // Record transaction
    if (tradeId) {
      await db.insert(manualTradingTransactions)
        .values({
          userId,
          tradeId,
          currency,
          type: balance >= 0 ? 'credit' : 'debit',
          amount: Math.abs(balance).toString(),
          balanceAfter: newBalance.balance,
          description
        });
    }

    res.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Get transaction history
router.get('/transactions/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const transactions = await db.select()
      .from(manualTradingTransactions)
      .where(eq(manualTradingTransactions.userId, userId))
      .orderBy(manualTradingTransactions.createdAt);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Initialize balances for new user
router.post('/initialize/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const initialBalances = [
      { currency: 'USDT', balance: '10000' },
      { currency: 'BTC', balance: '0' },
      { currency: 'ETH', balance: '0' },
      { currency: 'ADA', balance: '0' },
      { currency: 'SOL', balance: '0' },
      { currency: 'DOT', balance: '0' }
    ];

    for (const balanceData of initialBalances) {
      const existing = await db.select()
        .from(manualTradingBalances)
        .where(and(
          eq(manualTradingBalances.userId, userId),
          eq(manualTradingBalances.currency, balanceData.currency)
        ));

      if (existing.length === 0) {
        await db.insert(manualTradingBalances)
          .values({
            userId,
            currency: balanceData.currency,
            balance: balanceData.balance
          });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error initializing balances:', error);
    res.status(500).json({ error: 'Failed to initialize balances' });
  }
});

export default router;
