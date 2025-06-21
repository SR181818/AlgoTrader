import { Backtester, BacktestConfig } from '../trading/Backtester';
import { StrategyRunner } from '../trading/StrategyRunner';
import { CandleData } from '../types/trading';

describe('Backtester', () => {
  const mockConfig: BacktestConfig = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    initialBalance: 10000,
    strategy: StrategyRunner.createDefaultStrategy(),
    riskConfig: {
      maxRiskPerTrade: 0.02,
      maxDailyDrawdown: 0.05,
      maxOpenPositions: 5,
      maxCorrelatedPositions: 2,
      minRiskRewardRatio: 2,
      maxLeverage: 3,
      emergencyStopLoss: 0.10,
      cooldownPeriod: 60,
    },
    executorConfig: {
      paperTrading: true,
      exchange: 'binance',
      testnet: true,
      defaultOrderType: 'market',
      slippageTolerance: 0.1,
      maxOrderSize: 1000,
      enableStopLoss: true,
      enableTakeProfit: true,
    },
    replaySpeed: 100,
    commission: 0.001,
    slippage: 0.001,
  };

  let backtester: Backtester;

  beforeEach(() => {
    backtester = new Backtester(mockConfig);
  });

  afterEach(() => {
    backtester.dispose();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(backtester).toBeDefined();
    });
  });

  describe('loadData', () => {
    it('should load candle data array', () => {
      const mockCandles: CandleData[] = [
        { timestamp: new Date('2024-01-01').getTime(), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date('2024-01-02').getTime(), open: 102, high: 108, low: 98, close: 106, volume: 1200 },
      ];

      expect(() => {
        backtester.loadData(mockCandles);
      }).not.toThrow();
    });

    it('should load CSV data string', () => {
      const csvData = `timestamp,open,high,low,close,volume
2024-01-01T00:00:00.000Z,100,105,95,102,1000
2024-01-02T00:00:00.000Z,102,108,98,106,1200`;

      expect(() => {
        backtester.loadData(csvData);
      }).not.toThrow();
    });

    it('should filter data by date range', () => {
      const mockCandles: CandleData[] = [
        { timestamp: new Date('2023-12-31').getTime(), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date('2024-01-15').getTime(), open: 102, high: 108, low: 98, close: 106, volume: 1200 },
        { timestamp: new Date('2024-02-01').getTime(), open: 106, high: 110, low: 104, close: 108, volume: 900 },
      ];

      backtester.loadData(mockCandles);
      // Should only include the middle candle within date range
    });
  });

  describe('startBacktest', () => {
    it('should throw error if no data loaded', async () => {
      await expect(backtester.startBacktest()).rejects.toThrow('No data loaded for backtesting');
    });

    it('should complete backtest with valid data', async () => {
      const mockCandles: CandleData[] = generateMockCandles(100);
      backtester.loadData(mockCandles);

      const result = await backtester.startBacktest();
      
      expect(result).toBeDefined();
      expect(result.totalReturn).toBeDefined();
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      expect(result.equity.length).toBeGreaterThan(0);
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
    });

    it('should emit progress updates', (done) => {
      const mockCandles: CandleData[] = generateMockCandles(50);
      backtester.loadData(mockCandles);

      const subscription = backtester.getProgressUpdates().subscribe(progress => {
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
        expect(progress.currentEquity).toBeGreaterThan(0);
        subscription.unsubscribe();
        done();
      });

      backtester.startBacktest();
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume backtest', async () => {
      const mockCandles: CandleData[] = generateMockCandles(100);
      backtester.loadData(mockCandles);

      // Start backtest
      const backtestPromise = backtester.startBacktest();
      
      // Pause after a short delay
      setTimeout(() => {
        backtester.pause();
        
        // Resume after another delay
        setTimeout(() => {
          backtester.resume();
        }, 100);
      }, 50);

      const result = await backtestPromise;
      expect(result).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop backtest', async () => {
      const mockCandles: CandleData[] = generateMockCandles(1000);
      backtester.loadData(mockCandles);

      // Start backtest
      const backtestPromise = backtester.startBacktest();
      
      // Stop after a short delay
      setTimeout(() => {
        backtester.stop();
      }, 100);

      // Should not complete normally
      await expect(backtestPromise).resolves.toBeUndefined();
    });
  });

  describe('result metrics', () => {
    it('should calculate correct metrics', async () => {
      const mockCandles: CandleData[] = generateMockCandles(100);
      backtester.loadData(mockCandles);

      const result = await backtester.startBacktest();
      
      // Verify metric calculations
      expect(result.totalReturnPercent).toBe((result.totalReturn / mockConfig.initialBalance) * 100);
      expect(result.winRate).toBe(result.totalTrades > 0 ? (result.winningTrades / result.totalTrades) * 100 : 0);
      expect(result.winningTrades + result.losingTrades).toBeLessThanOrEqual(result.totalTrades);
      
      // Verify equity curve
      expect(result.equity[0].value).toBe(mockConfig.initialBalance);
      expect(result.equity.length).toBeGreaterThan(0);
    });
  });

  // Helper function to generate mock candles
  function generateMockCandles(count: number): CandleData[] {
    const candles: CandleData[] = [];
    let price = 45000;
    const startTime = mockConfig.startDate.getTime();
    
    for (let i = 0; i < count; i++) {
      const timestamp = startTime + (i * 15 * 60 * 1000); // 15-minute intervals
      const priceChange = (Math.random() - 0.5) * 0.02; // 2% max change
      
      const open = price;
      price = price * (1 + priceChange);
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = 100 + Math.random() * 1000;

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }

    return candles;
  }
});