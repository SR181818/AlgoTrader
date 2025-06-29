import { Router, Request, Response } from 'express';
import ccxt from 'ccxt';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken } from './authRoutes';
import crypto from 'crypto';

const router = Router();

// Simple encryption for API keys (in production, use proper encryption)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';

function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Validation schema
const apiKeySchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
});

// Save Binance API credentials
router.post('/apikey', authenticateToken, async (req: any, res: Response) => {
  try {
    const { apiKey, apiSecret } = apiKeySchema.parse(req.body);

    // Test the API credentials
    const exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      sandbox: false,
      enableRateLimit: true,
    });

    try {
      // Validate credentials by fetching account info
      await exchange.fetchBalance();
      
      // If successful, encrypt and save to database
      const encryptedApiKey = encrypt(apiKey);
      const encryptedApiSecret = encrypt(apiSecret);

      await db
        .update(users)
        .set({
          binanceApiKey: encryptedApiKey,
          binanceApiSecret: encryptedApiSecret,
        })
        .where(eq(users.id, req.user.userId));

      res.json({
        success: true,
        message: 'Binance API credentials saved and validated successfully',
      });

    } catch (apiError) {
      console.error('API validation error:', apiError);
      res.status(400).json({
        error: 'Invalid API credentials. Please check your Binance API key and secret.',
        details: apiError.message,
      });
    }

  } catch (error) {
    console.error('Settings error:', error);
    res.status(400).json({ error: 'Failed to save API credentials' });
  }
});

// Get API key status (without exposing the actual keys)
router.get('/apikey', authenticateToken, async (req: any, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const hasApiKey = !!(user.binanceApiKey && user.binanceApiSecret);
    
    res.json({
      hasApiKey,
      apiKeyPreview: hasApiKey ? user.binanceApiKey?.substring(0, 8) + '...' : null,
    });

  } catch (error) {
    console.error('Error fetching API key status:', error);
    res.status(500).json({ error: 'Failed to fetch API key status' });
  }
});

// Test API credentials
router.post('/apikey/test', authenticateToken, async (req: any, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user.binanceApiKey || !user.binanceApiSecret) {
      return res.status(400).json({ error: 'No API credentials found' });
    }

    // Decrypt credentials
    const apiKey = decrypt(user.binanceApiKey);
    const apiSecret = decrypt(user.binanceApiSecret);

    // Test the credentials
    const exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      sandbox: false,
      enableRateLimit: true,
    });

    const balance = await exchange.fetchBalance();
    const accountInfo = await exchange.fetchStatus();

    res.json({
      success: true,
      message: 'API credentials are working correctly',
      accountStatus: accountInfo,
      totalBalance: Object.values(balance.total).reduce((sum: number, val: any) => sum + (val || 0), 0),
    });

  } catch (error) {
    console.error('API test error:', error);
    res.status(400).json({
      error: 'API credentials test failed',
      details: error.message,
    });
  }
});

// Delete API credentials
router.delete('/apikey', authenticateToken, async (req: any, res: Response) => {
  try {
    await db
      .update(users)
      .set({
        binanceApiKey: null,
        binanceApiSecret: null,
      })
      .where(eq(users.id, req.user.userId));

    res.json({
      success: true,
      message: 'API credentials removed successfully',
    });

  } catch (error) {
    console.error('Error removing API credentials:', error);
    res.status(500).json({ error: 'Failed to remove API credentials' });
  }
});

// Update user subscription status (for paywall)
router.post('/subscription', authenticateToken, async (req: any, res: Response) => {
  try {
    const { isPaidUser } = req.body;

    await db
      .update(users)
      .set({ isPaidUser })
      .where(eq(users.id, req.user.userId));

    res.json({
      success: true,
      message: `Subscription status updated to ${isPaidUser ? 'paid' : 'free'}`,
    });

  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
});

export default router;