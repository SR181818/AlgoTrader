import { RiskManager, RiskConfig } from '../trading/RiskManager';

describe('RiskManager', () => {
  const mockRiskConfig: RiskConfig = {
    maxRiskPerTrade: 0.02, // 2%
    maxDailyDrawdown: 0.05, // 5%
    maxOpenPositions: 5,
    maxCorrelatedPositions: 2,
    minRiskRewardRatio: 2,
    maxLeverage: 3,
    emergencyStopLoss: 0.10, // 10%
    cooldownPeriod: 60, // 60 minutes
  };

  const initialBalance = 10000;
  let riskManager: RiskManager;

  beforeEach(() => {
    riskManager = new RiskManager(mockRiskConfig, initialBalance);
  });

  describe('constructor', () => {
    it('should initialize with correct config and balance', () => {
      const metrics = riskManager.getRiskMetrics();
      expect(metrics.accountBalance).toBe(initialBalance);
      expect(metrics.currentDrawdown).toBe(0);
      expect(metrics.dailyPnL).toBe(0);
      expect(metrics.openPositionsCount).toBe(0);
    });

    it('should initialize with a config', () => {
      // TODO: Replace with actual mock config
      const manager = new RiskManager({});
      expect(manager).toBeDefined();
    });
  });

  describe('calculatePositionSize', () => {
    it('should calculate basic position size correctly', () => {
      const entryPrice = 100;
      const stopLossPrice = 98; // 2% stop loss
      
      const result = riskManager.calculatePositionSize(
        initialBalance,
        entryPrice,
        stopLossPrice,
        'BTC/USDT'
      );

      expect(result.approved).toBe(true);
      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(result.recommendedSize * (entryPrice - stopLossPrice));
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should apply ATR adjustment when provided', () => {
      const entryPrice = 100;
      const stopLossPrice = 98;
      const atrValue = 3; // High volatility
      
      const result = riskManager.calculatePositionSize(
        initialBalance,
        entryPrice,
        stopLossPrice,
        'BTC/USDT',
        atrValue
      );

      expect(result.approved).toBe(true);
      expect(result.reasoning.some(r => r.includes('ATR adjustment'))).toBe(true);
    });

    it('should limit position size based on account balance', () => {
      const entryPrice = 100;
      const stopLossPrice = 99.99; // Very tight stop loss
      
      const result = riskManager.calculatePositionSize(
        initialBalance,
        entryPrice,
        stopLossPrice,
        'BTC/USDT'
      );

      expect(result.recommendedSize).toBeLessThanOrEqual(result.maxAllowedSize);
    });

    it('should handle zero or negative stop loss distance', () => {
      const entryPrice = 100;
      const stopLossPrice = 100; // Same as entry price
      
      const result = riskManager.calculatePositionSize(
        initialBalance,
        entryPrice,
        stopLossPrice,
        'BTC/USDT'
      );

      // Should handle gracefully, possibly returning 0 size
      expect(result).toBeDefined();
    });
  });

  describe('assessTradeRisk', () => {
    it('should approve low-risk trade', () => {
      const assessment = riskManager.assessTradeRisk(
        'BTC/USDT',
        'buy',
        1,
        100,
        98,
        104 // 2:1 risk reward
      );

      expect(assessment.approved).toBe(true);
      expect(assessment.riskScore).toBeLessThan(70);
      expect(assessment.restrictions.length).toBe(0);
    });

    it('should reject trade in emergency mode', () => {
      riskManager.setEmergencyMode(true);
      
      const assessment = riskManager.assessTradeRisk(
        'BTC/USDT',
        'buy',
        1,
        100,
        98,
        104
      );

      expect(assessment.approved).toBe(false);
      expect(assessment.restrictions.some(r => r.includes('Emergency mode'))).toBe(true);
    });

    it('should warn about poor risk-reward ratio', () => {
      const assessment = riskManager.assessTradeRisk(
        'BTC/USDT',
        'buy',
        1,
        100,
        98,
        101 // Poor 0.5:1 risk reward
      );

      expect(assessment.warnings.some(w => w.includes('risk-reward ratio'))).toBe(true);
    });

    it('should increase risk score for multiple risk factors', () => {
      // Simulate high drawdown
      riskManager.updateAfterTrade('BTC/USDT', 'sell', 1, 100, -500); // Big loss
      
      const assessment = riskManager.assessTradeRisk(
        'BTC/USDT',
        'buy',
        1,
        100,
        98,
        101 // Poor risk reward
      );

      expect(assessment.riskScore).toBeGreaterThan(20); // Should have multiple risk factors
    });
  });

  describe('updateAfterTrade', () => {
    it('should update position count for buy trade', () => {
      const initialMetrics = riskManager.getRiskMetrics();
      
      riskManager.updateAfterTrade('BTC/USDT', 'buy', 1, 100);
      
      const updatedMetrics = riskManager.getRiskMetrics();
      expect(updatedMetrics.openPositionsCount).toBe(initialMetrics.openPositionsCount + 1);
      expect(updatedMetrics.totalExposure).toBeGreaterThan(initialMetrics.totalExposure);
    });

    it('should update position count for sell trade', () => {
      // First add a position
      riskManager.updateAfterTrade('BTC/USDT', 'buy', 1, 100);
      const afterBuy = riskManager.getRiskMetrics();
      
      // Then close it
      riskManager.updateAfterTrade('BTC/USDT', 'sell', 1, 102, 20); // $20 profit
      
      const afterSell = riskManager.getRiskMetrics();
      expect(afterSell.openPositionsCount).toBe(afterBuy.openPositionsCount - 1);
      expect(afterSell.dailyPnL).toBe(20);
      expect(afterSell.accountBalance).toBe(initialBalance + 20);
    });

    it('should update drawdown on losses', () => {
      riskManager.updateAfterTrade('BTC/USDT', 'sell', 1, 100, -200); // $200 loss
      
      const metrics = riskManager.getRiskMetrics();
      expect(metrics.currentDrawdown).toBeLessThan(0);
      expect(metrics.dailyPnL).toBe(-200);
      expect(metrics.accountBalance).toBe(initialBalance - 200);
    });

    it('should trigger emergency mode on large drawdown', () => {
      const largeDrawdown = initialBalance * mockRiskConfig.emergencyStopLoss + 100; // Exceed emergency threshold
      riskManager.updateAfterTrade('BTC/USDT', 'sell', 1, 100, -largeDrawdown);
      
      expect(riskManager.isEmergencyMode()).toBe(true);
    });
  });

  describe('updateAccountBalance', () => {
    it('should update account balance', () => {
      const newBalance = 12000;
      riskManager.updateAccountBalance(newBalance);
      
      const metrics = riskManager.getRiskMetrics();
      expect(metrics.accountBalance).toBe(newBalance);
    });
  });

  describe('emergency mode', () => {
    it('should set and get emergency mode', () => {
      expect(riskManager.isEmergencyMode()).toBe(false);
      
      riskManager.setEmergencyMode(true);
      expect(riskManager.isEmergencyMode()).toBe(true);
      
      riskManager.setEmergencyMode(false);
      expect(riskManager.isEmergencyMode()).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should get current risk config', () => {
      const config = riskManager.getRiskConfig();
      expect(config).toEqual(mockRiskConfig);
    });

    it('should update risk config', () => {
      const newConfig = { maxRiskPerTrade: 0.01 }; // 1%
      riskManager.updateRiskConfig(newConfig);
      
      const updatedConfig = riskManager.getRiskConfig();
      expect(updatedConfig.maxRiskPerTrade).toBe(0.01);
      expect(updatedConfig.maxDailyDrawdown).toBe(mockRiskConfig.maxDailyDrawdown); // Should remain unchanged
    });
  });

  describe('risk metrics', () => {
    it('should provide comprehensive risk metrics', () => {
      const metrics = riskManager.getRiskMetrics();
      
      expect(metrics).toHaveProperty('currentDrawdown');
      expect(metrics).toHaveProperty('dailyPnL');
      expect(metrics).toHaveProperty('openPositionsCount');
      expect(metrics).toHaveProperty('totalExposure');
      expect(metrics).toHaveProperty('riskPerTrade');
      expect(metrics).toHaveProperty('accountBalance');
      expect(metrics).toHaveProperty('lastResetTime');
    });
  });

  it('should calculate risk correctly', () => {
    // TODO: Provide mock positions and assert risk calculations
    // Example:
    // const risk = manager.calculateRisk(mockPositions);
    // expect(risk).toBe(expectedRisk);
  });

  // Add more tests for edge cases, error handling, etc.
});