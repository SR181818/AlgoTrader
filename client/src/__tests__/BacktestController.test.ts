
import { jest } from '@jest/globals';
import { BacktestController } from '../../../server/controllers/backtest';

// Mock ccxt
jest.mock('ccxt', () => ({
  binance: jest.fn().mockImplementation(() => ({
    fetchOHLCV: jest.fn(),
    loadMarkets: jest.fn()
  }))
}));

// Mock Backtester
jest.mock('../trading/Backtester', () => ({
  Backtester: jest.fn().mockImplementation(() => ({
    loadData: jest.fn(),
    startBacktest: jest.fn()
  }))
}));

describe('BacktestController', () => {
  let controller: BacktestController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    controller = new BacktestController();
    mockReq = {
      body: {
        symbol: 'BTC/USDT',
        timeframe: '15m',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
        strategyName: 'trend_following',
        strategyConfig: {
          riskPercentage: 2,
          stopLossPercentage: 5,
          takeProfitPercentage: 10,
          maxPositions: 3
        },
        initialBalance: 10000,
        commission: 0.001
      }
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('runBacktest', () => {
    it('should successfully run backtest with valid data', async () => {
      // Mock OHLCV data
      const mockOHLCV = [
        [1704067200000, 42000, 42500, 41500, 42200, 1000], // Sample candle
        [1704067800000, 42200, 42800, 41800, 42600, 1200]
      ];

      // Mock exchange fetchOHLCV
      const mockExchange = (controller as any).exchange;
      mockExchange.fetchOHLCV.mockResolvedValue(mockOHLCV);

      // Mock backtest result
      const mockBacktestResult = {
        totalReturn: 500,
        totalReturnPercent: 5,
        sharpeRatio: 1.2,
        maxDrawdown: 0.05,
        maxDrawdownPercent: 5,
        winRate: 60,
        profitFactor: 1.5,
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        averageWin: 100,
        averageLoss: -50,
        largestWin: 200,
        largestLoss: -80,
        equity: [
          { timestamp: 1704067200000, value: 10000 },
          { timestamp: 1704067800000, value: 10500 }
        ],
        trades: []
      };

      const { Backtester } = require('../trading/Backtester');
      const mockBacktesterInstance = {
        loadData: jest.fn(),
        startBacktest: jest.fn().mockResolvedValue(mockBacktestResult)
      };
      Backtester.mockImplementation(() => mockBacktesterInstance);

      await controller.runBacktest(mockReq, mockRes);

      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith(
        'BTC/USDT',
        '15m',
        1704067200000,
        1000
      );
      expect(mockBacktesterInstance.loadData).toHaveBeenCalled();
      expect(mockBacktesterInstance.startBacktest).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalReturn: 500,
          totalReturnPercent: 5,
          symbol: 'BTC/USDT',
          timeframe: '15m',
          strategyName: 'trend_following'
        })
      );
    });

    it('should return error for invalid date range', async () => {
      mockReq.body.startDate = '2024-01-02T00:00:00Z';
      mockReq.body.endDate = '2024-01-01T00:00:00Z';

      await controller.runBacktest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Start date must be before end date'
      });
    });

    it('should return error for date range exceeding 90 days', async () => {
      mockReq.body.startDate = '2024-01-01T00:00:00Z';
      mockReq.body.endDate = '2024-04-01T00:00:00Z'; // More than 90 days

      await controller.runBacktest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Date range cannot exceed 90 days'
      });
    });

    it('should return error when no historical data is available', async () => {
      const mockExchange = (controller as any).exchange;
      mockExchange.fetchOHLCV.mockResolvedValue([]);

      await controller.runBacktest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No historical data available for the specified period'
      });
    });

    it('should handle exchange errors gracefully', async () => {
      const mockExchange = (controller as any).exchange;
      mockExchange.fetchOHLCV.mockRejectedValue(new Error('Exchange connection failed'));

      await controller.runBacktest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: expect.any(String)
      });
    });
  });

  describe('getAvailableSymbols', () => {
    it('should return available trading symbols', async () => {
      const mockMarkets = {
        'BTC/USDT': { symbol: 'BTC/USDT' },
        'ETH/USDT': { symbol: 'ETH/USDT' },
        'ADA/USDT': { symbol: 'ADA/USDT' }
      };

      const mockExchange = (controller as any).exchange;
      mockExchange.loadMarkets.mockResolvedValue(mockMarkets);

      await controller.getAvailableSymbols(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        symbols: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT']
      });
    });

    it('should handle market loading errors', async () => {
      const mockExchange = (controller as any).exchange;
      mockExchange.loadMarkets.mockRejectedValue(new Error('Failed to load markets'));

      await controller.getAvailableSymbols(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch available symbols'
      });
    });
  });
});
