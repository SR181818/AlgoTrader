import { Router, Request, Response } from 'express';
import ccxt from 'ccxt';
import { db } from './db';
import { trades, backtests, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken } from './authRoutes';

const router = Router();

// Validation schemas
const backtestSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  strategyName: z.string(),
  strategyConfig: z.object({}).passthrough(),
});

const tradeSchema = z.object({
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive(),
  type: z.enum(['market', 'limit']).default('market'),
  price: z.number().positive().optional(),
});

const portfolioSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string(),
});

// Initialize exchange
function initializeExchange(apiKey?: string, apiSecret?: string) {
  const exchange = new ccxt.binance({
    apiKey: apiKey || '',
    secret: apiSecret || '',
    sandbox: false, // Set to true for testnet
    enableRateLimit: true,
  });
  return exchange;
}

// Backtest endpoint with real market data
router.post('/backtest', authenticateToken, async (req: any, res: Response) => {
  try {
    const { symbol, timeframe, startDate, endDate, strategyName, strategyConfig } = 
      backtestSchema.parse(req.body);

    // Initialize exchange for data fetching
    const exchange = initializeExchange();

    // Convert dates to timestamps
    const since = new Date(startDate).getTime();
    const until = new Date(endDate).getTime();

    // Fetch historical OHLCV data
    console.log(`Fetching historical data for ${symbol} from ${startDate} to ${endDate}`);
    
    let allCandles: any[] = [];
    let currentSince = since;
    const limit = 1000; // Max candles per request

    while (currentSince < until) {
      try {
        const candles = await exchange.fetchOHLCV(symbol, timeframe, currentSince, limit);
        if (candles.length === 0) break;
        
        allCandles = allCandles.concat(candles);
        currentSince = candles[candles.length - 1][0] + 1;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error fetching OHLCV:', error);
        break;
      }
    }

    // Filter candles within date range and normalize format
    const normalizedCandles = allCandles
      .filter(candle => candle[0] >= since && candle[0] <= until)
      .map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }));

    if (normalizedCandles.length === 0) {
      return res.status(400).json({ error: 'No historical data available for the specified period' });
    }

    // Run backtest simulation
    const backtestResults = await runBacktest(normalizedCandles, strategyConfig);

    // Save backtest to database
    const [savedBacktest] = await db
      .insert(backtests)
      .values({
        userId: req.user.userId,
        strategyName,
        symbol,
        timeframe,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalReturn: backtestResults.totalReturn.toString(),
        sharpeRatio: backtestResults.sharpeRatio.toString(),
        maxDrawdown: backtestResults.maxDrawdown.toString(),
        winRate: backtestResults.winRate.toString(),
        results: JSON.stringify(backtestResults),
      })
      .returning();

    res.json({
      backtestId: savedBacktest.id,
      symbol,
      timeframe,
      candleCount: normalizedCandles.length,
      results: backtestResults,
    });

  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: 'Backtest failed', details: error.message });
  }
});

// Manual trade execution
router.post('/trade', authenticateToken, async (req: any, res: Response) => {
  try {
    const tradeData = tradeSchema.parse(req.body);
    
    // Get user's API credentials
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user.binanceApiKey || !user.binanceApiSecret) {
      return res.status(400).json({ 
        error: 'Binance API credentials not configured. Please set them in Settings.' 
      });
    }

    // Initialize exchange with user's credentials
    const exchange = initializeExchange(user.binanceApiKey, user.binanceApiSecret);

    // Get current market price
    const ticker = await exchange.fetchTicker(tradeData.symbol);
    const currentPrice = ticker.last;

    // For demo purposes, we'll simulate the trade rather than execute it
    // In production, you would execute: await exchange.createMarketOrder(...)
    
    const executedPrice = tradeData.type === 'market' ? currentPrice : (tradeData.price || currentPrice);
    
    // Save trade to database
    const [savedTrade] = await db
      .insert(trades)
      .values({
        userId: req.user.userId,
        symbol: tradeData.symbol,
        side: tradeData.side,
        amount: tradeData.amount.toString(),
        price: executedPrice.toString(),
        status: 'open',
      })
      .returning();

    res.json({
      tradeId: savedTrade.id,
      symbol: tradeData.symbol,
      side: tradeData.side,
      amount: tradeData.amount,
      executedPrice,
      status: 'executed',
      timestamp: savedTrade.createdAt,
    });

  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({ error: 'Trade execution failed', details: error.message });
  }
});

// Get user trades
router.get('/trades', authenticateToken, async (req: any, res: Response) => {
  try {
    const userTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, req.user.userId))
      .orderBy(trades.createdAt);

    // Calculate PnL for each trade (simplified)
    const tradesWithPnL = userTrades.map(trade => ({
      ...trade,
      currentPnL: 0, // Would calculate based on current market price
    }));

    res.json(tradesWithPnL);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Portfolio endpoint
router.get('/portfolio', authenticateToken, async (req: any, res: Response) => {
  try {
    // Get user's API credentials
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user.binanceApiKey || !user.binanceApiSecret) {
      return res.status(400).json({ 
        error: 'Binance API credentials not configured. Please set them in Settings.' 
      });
    }

    // Initialize exchange with user's credentials
    const exchange = initializeExchange(user.binanceApiKey, user.binanceApiSecret);

    // Fetch portfolio data
    const balance = await exchange.fetchBalance();
    const positions = await exchange.fetchPositions();

    // Get user's trading history
    const userTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, req.user.userId));

    res.json({
      balance: balance.total,
      freeBalance: balance.free,
      usedBalance: balance.used,
      positions: positions.filter(p => p.size !== 0),
      totalTrades: userTrades.length,
      equity: Object.values(balance.total).reduce((sum: number, val: any) => sum + (val || 0), 0),
    });

  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data', details: error.message });
  }
});

// Strategy preview endpoint
router.post('/strategy/preview', authenticateToken, async (req: any, res: Response) => {
  try {
    const { symbol, strategyConfig } = req.body;
    
    // Fetch recent market data for preview
    const exchange = initializeExchange();
    const candles = await exchange.fetchOHLCV(symbol, '15m', undefined, 100);
    
    const normalizedCandles = candles.map(candle => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));

    // Generate signals using strategy
    const signals = await generateStrategySignals(normalizedCandles, strategyConfig);

    res.json({
      candles: normalizedCandles.slice(-50), // Last 50 candles
      signals: signals.slice(-10), // Last 10 signals
      summary: {
        totalSignals: signals.length,
        buySignals: signals.filter(s => s.action === 'BUY').length,
        sellSignals: signals.filter(s => s.action === 'SELL').length,
      }
    });

  } catch (error) {
    console.error('Strategy preview error:', error);
    res.status(500).json({ error: 'Strategy preview failed', details: error.message });
  }
});

// Helper function to run backtest
async function runBacktest(candles: any[], strategyConfig: any) {
  let balance = 10000; // Starting balance
  let position = 0;
  let trades = 0;
  let wins = 0;
  let maxBalance = balance;
  let maxDrawdown = 0;
  let returns: number[] = [];

  // Simple moving average crossover strategy for demo
  for (let i = 20; i < candles.length; i++) {
    const recentCandles = candles.slice(i - 20, i);
    const sma10 = recentCandles.slice(-10).reduce((sum, c) => sum + c.close, 0) / 10;
    const sma20 = recentCandles.reduce((sum, c) => sum + c.close, 0) / 20;
    
    const currentPrice = candles[i].close;
    
    // Buy signal: SMA10 crosses above SMA20
    if (sma10 > sma20 && position <= 0) {
      if (position < 0) {
        // Close short position
        const pnl = (position * -1) * (position * -1 * currentPrice - balance);
        balance += pnl;
        wins += pnl > 0 ? 1 : 0;
        trades++;
      }
      // Open long position
      position = balance / currentPrice;
      balance = 0;
    }
    // Sell signal: SMA10 crosses below SMA20
    else if (sma10 < sma20 && position > 0) {
      // Close long position
      const pnl = position * currentPrice - (position * currentPrice);
      balance = position * currentPrice;
      wins += pnl > 0 ? 1 : 0;
      trades++;
      position = 0;
    }

    const totalValue = balance + (position * currentPrice);
    maxBalance = Math.max(maxBalance, totalValue);
    const drawdown = (maxBalance - totalValue) / maxBalance;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    
    returns.push(totalValue / 10000 - 1);
  }

  // Close any remaining position
  if (position > 0) {
    balance = position * candles[candles.length - 1].close;
    position = 0;
    trades++;
  }

  const totalReturn = (balance - 10000) / 10000;
  const winRate = trades > 0 ? wins / trades : 0;
  
  // Calculate Sharpe ratio (simplified)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = returnStd > 0 ? avgReturn / returnStd : 0;

  return {
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades: trades,
    finalBalance: balance,
    equityCurve: returns,
  };
}

// Helper function to generate strategy signals
async function generateStrategySignals(candles: any[], strategyConfig: any) {
  const signals = [];
  
  for (let i = 20; i < candles.length; i++) {
    const recentCandles = candles.slice(i - 20, i);
    const sma10 = recentCandles.slice(-10).reduce((sum, c) => sum + c.close, 0) / 10;
    const sma20 = recentCandles.reduce((sum, c) => sum + c.close, 0) / 20;
    
    let action = 'HOLD';
    let confidence = 0.5;
    
    if (sma10 > sma20 * 1.01) {
      action = 'BUY';
      confidence = 0.8;
    } else if (sma10 < sma20 * 0.99) {
      action = 'SELL';
      confidence = 0.8;
    }
    
    signals.push({
      timestamp: candles[i].timestamp,
      price: candles[i].close,
      action,
      confidence,
      indicators: { sma10, sma20 }
    });
  }
  
  return signals;
}

export default router;