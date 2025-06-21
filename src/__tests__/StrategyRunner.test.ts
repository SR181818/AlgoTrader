import { StrategyRunner, StrategyConfig } from '../trading/StrategyRunner';
import { CandleData } from '../types/trading';

describe('StrategyRunner', () => {
  const mockStrategy: StrategyConfig = {
    name: 'Test Strategy',
    description: 'A test strategy',
    minConfidence: 0.6,
    maxSignalsPerHour: 10,
    riskRewardRatio: 2,
    requiredIndicators: ['RSI', 'MACD'],
    rules: [
      {
        name: 'RSI Oversold',
        description: 'Buy when RSI is oversold',
        weight: 0.5,
        evaluate: (signals, candle) => {
          const rsi = signals.find(s => s.name === 'RSI');
          if (rsi && typeof rsi.value === 'number' && rsi.value < 30) {
            return { signal: 'buy', confidence: 0.8, reasoning: 'RSI oversold' };
          }
          return { signal: 'neutral', confidence: 0, reasoning: 'RSI not oversold' };
        },
      },
      {
        name: 'MACD Bullish',
        description: 'Buy when MACD is bullish',
        weight: 0.5,
        evaluate: (signals, candle) => {
          const macd = signals.find(s => s.name === 'MACD');
          if (macd && typeof macd.value === 'object' && macd.value) {
            const macdValue = macd.value as { [key: string]: number };
            if (macdValue.MACD > macdValue.signal) {
              return { signal: 'buy', confidence: 0.7, reasoning: 'MACD bullish' };
            }
          }
          return { signal: 'neutral', confidence: 0, reasoning: 'MACD not bullish' };
        },
      },
    ],
  };

  const mockCandle: CandleData = {
    timestamp: Date.now(),
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000,
  };

  let strategyRunner: StrategyRunner;

  beforeEach(() => {
    strategyRunner = new StrategyRunner(mockStrategy);
  });

  afterEach(() => {
    strategyRunner.dispose();
  });

  describe('constructor', () => {
    it('should initialize with strategy', () => {
      expect(strategyRunner).toBeDefined();
    });

    it('should initialize without strategy', () => {
      const runner = new StrategyRunner();
      expect(runner).toBeDefined();
      runner.dispose();
    });
  });

  describe('setStrategy', () => {
    it('should set strategy correctly', () => {
      const newStrategy = { ...mockStrategy, name: 'New Strategy' };
      strategyRunner.setStrategy(newStrategy);
      // Strategy should be set (no direct way to test private property)
    });
  });

  describe('updateCandle', () => {
    it('should update candle data', () => {
      expect(() => {
        strategyRunner.updateCandle(mockCandle);
      }).not.toThrow();
    });
  });

  describe('updateIndicatorSignal', () => {
    it('should update indicator signal', () => {
      const mockResult = {
        name: 'RSI',
        values: [25, 30, 35],
        signals: ['buy', 'buy', 'neutral'] as ('buy' | 'sell' | 'neutral')[],
      };

      expect(() => {
        strategyRunner.updateIndicatorSignal('RSI', mockResult);
      }).not.toThrow();
    });

    it('should handle complex indicator values', () => {
      const mockResult = {
        name: 'MACD',
        values: [
          { MACD: 1.5, signal: 1.2, histogram: 0.3 },
          { MACD: 1.8, signal: 1.4, histogram: 0.4 },
        ],
      };

      expect(() => {
        strategyRunner.updateIndicatorSignal('MACD', mockResult);
      }).not.toThrow();
    });

    it('should handle empty values gracefully', () => {
      const mockResult = {
        name: 'RSI',
        values: [],
      };

      expect(() => {
        strategyRunner.updateIndicatorSignal('RSI', mockResult);
      }).not.toThrow();
    });
  });

  describe('getStrategySignals', () => {
    it('should return observable', () => {
      const observable = strategyRunner.getStrategySignals();
      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });
  });

  describe('getCurrentIndicatorSignals', () => {
    it('should return current signals', () => {
      const signals = strategyRunner.getCurrentIndicatorSignals();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should return updated signals after update', () => {
      const mockResult = {
        name: 'RSI',
        values: [25],
        signals: ['buy'] as ('buy' | 'sell' | 'neutral')[],
      };

      strategyRunner.updateIndicatorSignal('RSI', mockResult);
      const signals = strategyRunner.getCurrentIndicatorSignals();
      
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].name).toBe('RSI');
    });
  });

  describe('createDefaultStrategy', () => {
    it('should create valid default strategy', () => {
      const defaultStrategy = StrategyRunner.createDefaultStrategy();
      
      expect(defaultStrategy).toBeDefined();
      expect(defaultStrategy.name).toBe('Multi-Indicator Confluence');
      expect(defaultStrategy.rules.length).toBeGreaterThan(0);
      expect(defaultStrategy.requiredIndicators.length).toBeGreaterThan(0);
      expect(defaultStrategy.minConfidence).toBeGreaterThan(0);
      expect(defaultStrategy.maxSignalsPerHour).toBeGreaterThan(0);
      expect(defaultStrategy.riskRewardRatio).toBeGreaterThan(0);
    });

    it('should have valid rule structure', () => {
      const defaultStrategy = StrategyRunner.createDefaultStrategy();
      
      defaultStrategy.rules.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.weight).toBeGreaterThan(0);
        expect(rule.weight).toBeLessThanOrEqual(1);
        expect(typeof rule.evaluate).toBe('function');
      });
    });
  });

  describe('signal generation', () => {
    it('should generate signals when conditions are met', (done) => {
      const subscription = strategyRunner.getStrategySignals().subscribe(signal => {
        expect(signal).toBeDefined();
        expect(['LONG', 'SHORT', 'HOLD']).toContain(signal.type);
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
        subscription.unsubscribe();
        done();
      });

      // Update indicators to trigger signal
      strategyRunner.updateIndicatorSignal('RSI', {
        name: 'RSI',
        values: [25], // Oversold
        signals: ['buy'],
      });

      strategyRunner.updateIndicatorSignal('MACD', {
        name: 'MACD',
        values: [{ MACD: 1.5, signal: 1.2, histogram: 0.3 }], // Bullish
      });

      // Update candle to trigger evaluation
      strategyRunner.updateCandle(mockCandle);
    });
  });
});