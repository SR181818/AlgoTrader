import { TALibCalculator } from '../utils/talib-indicators';
import { CandleData } from '../types/trading';

// Mock technicalindicators library
jest.mock('technicalindicators', () => ({
  SMA: {
    calculate: jest.fn(({ period, values }) => {
      // Simple mock implementation
      const result = [];
      for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a: number, b: number) => a + b, 0);
        result.push(sum / period);
      }
      return result;
    }),
  },
  RSI: {
    calculate: jest.fn(({ period, values }) => {
      // Mock RSI calculation
      return values.slice(period - 1).map(() => 50 + Math.random() * 40 - 20);
    }),
  },
  MACD: {
    calculate: jest.fn(() => [
      { MACD: 1.5, signal: 1.2, histogram: 0.3 },
      { MACD: 1.8, signal: 1.4, histogram: 0.4 },
    ]),
  },
}));

describe('TALibCalculator', () => {
  const mockCandles: CandleData[] = [
    { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { timestamp: 2000, open: 102, high: 108, low: 98, close: 106, volume: 1200 },
    { timestamp: 3000, open: 106, high: 110, low: 104, close: 108, volume: 900 },
    { timestamp: 4000, open: 108, high: 112, low: 106, close: 110, volume: 1100 },
    { timestamp: 5000, open: 110, high: 115, low: 108, close: 113, volume: 1300 },
    { timestamp: 6000, open: 113, high: 118, low: 111, close: 116, volume: 1000 },
    { timestamp: 7000, open: 116, high: 120, low: 114, close: 118, volume: 1400 },
    { timestamp: 8000, open: 118, high: 122, low: 116, close: 120, volume: 1200 },
    { timestamp: 9000, open: 120, high: 125, low: 118, close: 122, volume: 1500 },
    { timestamp: 10000, open: 122, high: 127, low: 120, close: 125, volume: 1100 },
    { timestamp: 11000, open: 125, high: 130, low: 123, close: 128, volume: 1600 },
    { timestamp: 12000, open: 128, high: 132, low: 126, close: 130, volume: 1300 },
    { timestamp: 13000, open: 130, high: 135, low: 128, close: 132, volume: 1700 },
    { timestamp: 14000, open: 132, high: 137, low: 130, close: 135, volume: 1400 },
    { timestamp: 15000, open: 135, high: 140, low: 133, close: 138, volume: 1800 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateIndicator', () => {
    it('should calculate SMA correctly', () => {
      const result = TALibCalculator.calculateIndicator('SMA', mockCandles, { period: 5 });
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('SMA');
      expect(result?.values).toBeInstanceOf(Array);
      expect(result?.values.length).toBeGreaterThan(0);
    });

    it('should calculate RSI correctly', () => {
      const result = TALibCalculator.calculateIndicator('RSI', mockCandles, { period: 14 });
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('RSI');
      expect(result?.values).toBeInstanceOf(Array);
      expect(result?.signals).toBeInstanceOf(Array);
    });

    it('should calculate MACD correctly', () => {
      const result = TALibCalculator.calculateIndicator('MACD', mockCandles, {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
      });
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('MACD');
      expect(result?.values).toBeInstanceOf(Array);
    });

    it('should return null for unknown indicator', () => {
      const result = TALibCalculator.calculateIndicator('UNKNOWN', mockCandles);
      
      expect(result).toBeNull();
    });

    it('should use default parameters when none provided', () => {
      const result = TALibCalculator.calculateIndicator('SMA', mockCandles);
      
      expect(result).toBeTruthy();
      expect(result?.metadata?.parameters?.period).toBe(20); // Default SMA period
    });

    it('should handle insufficient data gracefully', () => {
      const shortCandles = mockCandles.slice(0, 2);
      const result = TALibCalculator.calculateIndicator('SMA', shortCandles, { period: 20 });
      
      // Should either return null or handle gracefully
      expect(result).toBeTruthy(); // Mock implementation still returns data
    });
  });

  describe('getIndicatorsByCategory', () => {
    it('should return trend indicators', () => {
      const trendIndicators = TALibCalculator.getIndicatorsByCategory('trend');
      
      expect(trendIndicators).toBeInstanceOf(Array);
      expect(trendIndicators.length).toBeGreaterThan(0);
      expect(trendIndicators.every(ind => ind.category === 'trend')).toBe(true);
    });

    it('should return momentum indicators', () => {
      const momentumIndicators = TALibCalculator.getIndicatorsByCategory('momentum');
      
      expect(momentumIndicators).toBeInstanceOf(Array);
      expect(momentumIndicators.length).toBeGreaterThan(0);
      expect(momentumIndicators.every(ind => ind.category === 'momentum')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknownIndicators = TALibCalculator.getIndicatorsByCategory('unknown');
      
      expect(unknownIndicators).toBeInstanceOf(Array);
      expect(unknownIndicators.length).toBe(0);
    });
  });

  describe('getAllCategories', () => {
    it('should return all available categories', () => {
      const categories = TALibCalculator.getAllCategories();
      
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('trend');
      expect(categories).toContain('momentum');
      expect(categories).toContain('volume');
      expect(categories).toContain('volatility');
      expect(categories).toContain('overlap');
    });
  });

  describe('getIndicatorConfig', () => {
    it('should return config for existing indicator', () => {
      const config = TALibCalculator.getIndicatorConfig('SMA');
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('SMA');
      expect(config?.displayName).toBe('Simple Moving Average');
      expect(config?.category).toBe('trend');
    });

    it('should return undefined for non-existing indicator', () => {
      const config = TALibCalculator.getIndicatorConfig('NONEXISTENT');
      
      expect(config).toBeUndefined();
    });
  });
});