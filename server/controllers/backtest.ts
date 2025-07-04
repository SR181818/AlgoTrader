
import { Request, Response } from 'express';
import ccxt from 'ccxt';
import { z } from 'zod';
import { Backtester, BacktestConfig } from '../../client/src/trading/Backtester';
import { CandleData } from '../../client/src/types/trading';
import { StrategyRunner } from '../../client/src/trading/StrategyRunner';

// In-memory cache for OHLCV data (replace with Redis in production)
const ohlcvCache = new Map<string, { data: CandleData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const backtestRequestSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d']),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  strategyName: z.string().min(1),
  strategyConfig: z.object({
    riskPercentage: z.number().min(0.1).max(10).default(2),
    stopLossPercentage: z.number().min(0.5).max(20).default(5),
    takeProfitPercentage: z.number().min(1).max(50).default(10),
    maxPositions: z.number().min(1).max(10).default(3),
    indicators: z.object({
      rsiPeriod: z.number().min(2).max(50).default(14),
      maPeriod: z.number().min(2).max(200).default(20),
      macdFast: z.number().min(2).max(50).default(12),
      macdSlow: z.number().min(2).max(100).default(26),
      macdSignal: z.number().min(2).max(50).default(9)
    }).default({})
  }),
  initialBalance: z.number().min(100).default(10000),
  commission: z.number().min(0).max(1).default(0.001)
});

export class BacktestController {
  private exchange: ccxt.Exchange;

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey: '',
      secret: '',
      sandbox: false,
      enableRateLimit: true,
      options: {
        defaultType: 'spot'
      }
    });
  }

  private getCacheKey(symbol: string, timeframe: string, since: number, until: number): string {
    return `${symbol}_${timeframe}_${since}_${until}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_DURATION;
  }

  private async fetchOHLCVData(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): Promise<CandleData[]> {
    const since = startDate.getTime();
    const until = endDate.getTime();
    const cacheKey = this.getCacheKey(symbol, timeframe, since, until);

    // Check cache first
    const cached = ohlcvCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`Using cached OHLCV data for ${symbol} ${timeframe}`);
      return cached.data;
    }

    console.log(`Fetching OHLCV data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const allCandles: CandleData[] = [];
    let currentSince = since;
    const limit = 1000; // Binance limit

    try {
      while (currentSince < until) {
        const ohlcvs = await this.exchange.fetchOHLCV(symbol, timeframe, currentSince, limit);
        
        if (!ohlcvs || ohlcvs.length === 0) {
          console.log(`No more data available for ${symbol} at ${new Date(currentSince).toISOString()}`);
          break;
        }

        // Convert to CandleData format
        const candles = ohlcvs
          .filter(ohlcv => ohlcv[0] <= until)
          .map(ohlcv => ({
            timestamp: ohlcv[0],
            open: ohlcv[1],
            high: ohlcv[2],
            low: ohlcv[3],
            close: ohlcv[4],
            volume: ohlcv[5]
          }));

        allCandles.push(...candles);

        // Update for next iteration
        if (ohlcvs.length < limit) {
          break; // No more data available
        }

        currentSince = ohlcvs[ohlcvs.length - 1][0] + 1;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Cache the result
      ohlcvCache.set(cacheKey, {
        data: allCandles,
        timestamp: Date.now()
      });

      console.log(`Fetched ${allCandles.length} candles for ${symbol} ${timeframe}`);
      return allCandles;

    } catch (error) {
      console.error('Error fetching OHLCV data:', error);
      throw new Error(`Failed to fetch historical data for ${symbol}: ${error.message}`);
    }
  }

  public async runBacktest(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = backtestRequestSchema.parse(req.body);
      const { symbol, timeframe, startDate, endDate, strategyName, strategyConfig, initialBalance, commission } = validatedData;

      // Validate date range
      if (startDate >= endDate) {
        res.status(400).json({ error: 'Start date must be before end date' });
        return;
      }

      const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        res.status(400).json({ error: 'Date range cannot exceed 90 days' });
        return;
      }

      // Fetch historical data
      const candles = await this.fetchOHLCVData(symbol, timeframe, startDate, endDate);

      if (candles.length === 0) {
        res.status(400).json({ error: 'No historical data available for the specified period' });
        return;
      }

      // Create strategy based on name
      let strategy;
      switch (strategyName) {
        case 'trend_following':
          strategy = StrategyRunner.createTrendFollowingStrategy();
          break;
        case 'mean_reversion':
          strategy = StrategyRunner.createMeanReversionStrategy();
          break;
        default:
          strategy = StrategyRunner.createDefaultStrategy();
      }

      // Configure backtester
      const backtestConfig: BacktestConfig = {
        symbol,
        timeframe,
        startDate,
        endDate,
        initialBalance,
        commission,
        strategy,
        replaySpeed: 1000, // Max speed for backtesting
        riskConfig: {
          maxRiskPerTrade: strategyConfig.riskPercentage / 100,
          maxDrawdown: 0.2,
          maxPositions: strategyConfig.maxPositions,
          stopLossPercentage: strategyConfig.stopLossPercentage / 100,
          takeProfitPercentage: strategyConfig.takeProfitPercentage / 100
        },
        executorConfig: {
          paperTrading: true,
          slippageModel: {
            type: 'percentage',
            value: 0.001
          }
        }
      };

      // Run backtest
      const backtester = new Backtester(backtestConfig);
      backtester.loadData(candles);
      
      const startTime = Date.now();
      const result = await backtester.startBacktest();
      const executionTime = Date.now() - startTime;

      // Add execution metadata
      const response = {
        ...result,
        executionTime,
        candlesProcessed: candles.length,
        symbol,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        strategyName,
        strategyConfig
      };

      res.json(response);

    } catch (error) {
      console.error('Backtest error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      } else if (error.message.includes('symbol')) {
        res.status(400).json({ 
          error: 'Invalid trading symbol', 
          details: error.message 
        });
      } else {
        res.status(500).json({ 
          error: 'Internal server error', 
          details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong' 
        });
      }
    }
  }

  public async getAvailableSymbols(req: Request, res: Response): Promise<void> {
    try {
      const markets = await this.exchange.loadMarkets();
      const symbols = Object.keys(markets)
        .filter(symbol => symbol.includes('/USDT'))
        .slice(0, 50); // Limit to top 50 for performance

      res.json({ symbols });
    } catch (error) {
      console.error('Error fetching symbols:', error);
      res.status(500).json({ error: 'Failed to fetch available symbols' });
    }
  }
}
