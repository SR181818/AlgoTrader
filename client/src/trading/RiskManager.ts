/**
 * Risk configuration interface
 */
export interface RiskConfig {
  maxRiskPerTrade: number;
  maxDrawdown: number;
  maxLeverage: number;
  maxPositions: number;
  dailyLossLimit: number;
  emergencyStopLoss: number;
  correlationLimit: number;
}

/**
 * Risk metrics interface
 */
export interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  openPositionsCount: number;
  totalExposure: number;
  riskPerTrade: number;
  accountBalance: number;
  lastResetTime: number;
}

/**
 * RiskManager enforces risk controls, calculates position sizing, and tracks risk metrics for trading operations.
 *
 * @remarks
 * - Supports max risk per trade, drawdown, leverage, and correlation controls
 * - Provides position size recommendations and risk assessments
 * - Tracks and resets daily risk metrics
 */
export class RiskManager {
  private config: RiskConfig;
  private metrics: RiskMetrics;
  private dailyTrades: Array<{ timestamp: number; pnl: number; size: number }> = [];
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private emergencyMode = false;
  private lastEmergencyTime = 0;

  constructor(config: RiskConfig, initialBalance: number) {
    this.config = config;
    this.metrics = {
      currentDrawdown: 0,
      dailyPnL: 0,
      openPositionsCount: 0,
      totalExposure: 0,
      riskPerTrade: 0,
      accountBalance: initialBalance,
      lastResetTime: Date.now(),
    };
    
    this.initializeCorrelationMatrix();
  }

  /**
   * Calculate position size based on risk parameters
   */
  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLossPrice: number,
    symbol: string,
    atrValue?: number
  ): PositionSizeCalculation {
    const reasoning: string[] = [];
    
    // Calculate risk amount per trade
    const maxRiskAmount = accountBalance * this.config.maxRiskPerTrade;
    reasoning.push(`Max risk per trade: ${(this.config.maxRiskPerTrade * 100).toFixed(2)}% = $${maxRiskAmount.toFixed(2)}`);

    // Calculate stop loss distance
    const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
    const stopLossPercent = stopLossDistance / entryPrice;
    reasoning.push(`Stop loss distance: ${(stopLossPercent * 100).toFixed(2)}% ($${stopLossDistance.toFixed(2)})`);

    // Basic position size calculation
    let recommendedSize = maxRiskAmount / stopLossDistance;
    reasoning.push(`Basic calculation: $${maxRiskAmount.toFixed(2)} / $${stopLossDistance.toFixed(2)} = ${recommendedSize.toFixed(4)} units`);

    // Apply ATR-based adjustment if available
    if (atrValue) {
      const atrPercent = atrValue / entryPrice;
      const volatilityMultiplier = Math.min(1, 0.02 / atrPercent); // Reduce size for high volatility
      recommendedSize *= volatilityMultiplier;
      reasoning.push(`ATR adjustment: ${(volatilityMultiplier * 100).toFixed(1)}% (ATR: ${(atrPercent * 100).toFixed(2)}%)`);
    }

    // Apply correlation adjustment
    const correlationAdjustment = this.getCorrelationAdjustment(symbol);
    recommendedSize *= correlationAdjustment;
    if (correlationAdjustment < 1) {
      reasoning.push(`Correlation adjustment: ${(correlationAdjustment * 100).toFixed(1)}% (correlated positions detected)`);
    }

    // Apply drawdown adjustment
    const drawdownAdjustment = this.getDrawdownAdjustment();
    recommendedSize *= drawdownAdjustment;
    if (drawdownAdjustment < 1) {
      reasoning.push(`Drawdown adjustment: ${(drawdownAdjustment * 100).toFixed(1)}% (current drawdown: ${(this.metrics.currentDrawdown * 100).toFixed(2)}%)`);
    }

    // Calculate maximum allowed size based on account balance
    const maxAccountExposure = accountBalance * 0.1; // Max 10% of account per trade
    const maxAllowedSize = maxAccountExposure / entryPrice;
    
    // Apply final limits
    const finalSize = Math.min(recommendedSize, maxAllowedSize);
    const approved = finalSize > 0 && !this.emergencyMode;

    return {
      recommendedSize: finalSize,
      maxAllowedSize,
      riskAmount: finalSize * stopLossDistance,
      reasoning,
      approved,
    };
  }

  /**
   * Assess overall risk for a potential trade
   */
  assessTradeRisk(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice?: number
  ): RiskAssessment {
    const warnings: string[] = [];
    const restrictions: string[] = [];
    let riskScore = 0;

    // Check emergency mode
    if (this.emergencyMode) {
      restrictions.push('Emergency mode active - no new trades allowed');
      return {
        approved: false,
        positionSize: {
          recommendedSize: 0,
          maxAllowedSize: 0,
          riskAmount: 0,
          reasoning: ['Emergency mode active'],
          approved: false,
        },
        warnings,
        restrictions,
        riskScore: 100,
      };
    }

    // Calculate position size
    const positionSize = this.calculatePositionSize(
      this.metrics.accountBalance,
      entryPrice,
      stopLossPrice,
      symbol
    );

    // Check daily drawdown limit
    if (this.metrics.dailyPnL < -this.config.maxDailyDrawdown * this.metrics.accountBalance) {
      restrictions.push(`Daily drawdown limit exceeded: ${(this.metrics.dailyPnL / this.metrics.accountBalance * 100).toFixed(2)}%`);
      riskScore += 30;
    }

    // Check maximum open positions
    if (this.metrics.openPositionsCount >= this.config.maxOpenPositions) {
      restrictions.push(`Maximum open positions reached: ${this.metrics.openPositionsCount}/${this.config.maxOpenPositions}`);
      riskScore += 20;
    }

    // Check risk-reward ratio
    if (takeProfitPrice) {
      const riskAmount = Math.abs(entryPrice - stopLossPrice);
      const rewardAmount = Math.abs(takeProfitPrice - entryPrice);
      const riskRewardRatio = rewardAmount / riskAmount;
      
      if (riskRewardRatio < this.config.minRiskRewardRatio) {
        warnings.push(`Poor risk-reward ratio: ${riskRewardRatio.toFixed(2)} (minimum: ${this.config.minRiskRewardRatio})`);
        riskScore += 15;
      }
    }

    // Check correlation with existing positions
    const correlatedPositions = this.getCorrelatedPositionsCount(symbol);
    if (correlatedPositions >= this.config.maxCorrelatedPositions) {
      warnings.push(`Too many correlated positions: ${correlatedPositions}/${this.config.maxCorrelatedPositions}`);
      riskScore += 10;
    }

    // Check total exposure
    const tradeValue = size * entryPrice;
    const newTotalExposure = this.metrics.totalExposure + tradeValue;
    const exposurePercent = newTotalExposure / this.metrics.accountBalance;
    
    if (exposurePercent > 0.5) { // 50% max exposure
      warnings.push(`High total exposure: ${(exposurePercent * 100).toFixed(1)}%`);
      riskScore += 15;
    }

    // Check recent trading frequency
    const recentTrades = this.getRecentTradesCount(60); // Last hour
    if (recentTrades > 10) {
      warnings.push(`High trading frequency: ${recentTrades} trades in last hour`);
      riskScore += 10;
    }

    const approved = restrictions.length === 0 && positionSize.approved && riskScore < 70;

    return {
      approved,
      positionSize,
      warnings,
      restrictions,
      riskScore,
    };
  }

  /**
   * Update metrics after trade execution
   */
  updateAfterTrade(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    entryPrice: number,
    pnl?: number
  ): void {
    const tradeValue = size * entryPrice;
    
    // Update position count
    if (side === 'buy') {
      this.metrics.openPositionsCount++;
      this.metrics.totalExposure += tradeValue;
    } else {
      this.metrics.openPositionsCount = Math.max(0, this.metrics.openPositionsCount - 1);
      this.metrics.totalExposure = Math.max(0, this.metrics.totalExposure - tradeValue);
    }

    // Update PnL if provided
    if (pnl !== undefined) {
      this.metrics.dailyPnL += pnl;
      this.metrics.accountBalance += pnl;
      
      // Update drawdown
      if (pnl < 0) {
        this.metrics.currentDrawdown = Math.min(this.metrics.currentDrawdown + pnl, 0);
      } else {
        this.metrics.currentDrawdown = Math.min(this.metrics.currentDrawdown, 0);
      }

      // Record trade
      this.dailyTrades.push({
        timestamp: Date.now(),
        pnl,
        size: tradeValue,
      });
    }

    // Check for emergency conditions
    this.checkEmergencyConditions();
    
    // Reset daily metrics if needed
    this.resetDailyMetricsIfNeeded();
  }

  /**
   * Update account balance
   */
  updateAccountBalance(newBalance: number): void {
    this.metrics.accountBalance = newBalance;
  }

  /**
   * Check if emergency stop should be triggered
   */
  private checkEmergencyConditions(): void {
    const emergencyDrawdown = this.config.emergencyStopLoss * this.metrics.accountBalance;
    
    if (this.metrics.currentDrawdown <= -emergencyDrawdown) {
      this.emergencyMode = true;
      this.lastEmergencyTime = Date.now();
      console.warn('EMERGENCY MODE ACTIVATED: Maximum drawdown exceeded');
    }

    // Check if cooldown period has passed
    if (this.emergencyMode && Date.now() - this.lastEmergencyTime > this.config.cooldownPeriod * 60 * 1000) {
      this.emergencyMode = false;
      console.log('Emergency mode deactivated after cooldown period');
    }
  }

  /**
   * Get correlation adjustment factor
   */
  private getCorrelationAdjustment(symbol: string): number {
    const correlatedCount = this.getCorrelatedPositionsCount(symbol);
    if (correlatedCount === 0) return 1;
    
    // Reduce position size by 20% for each correlated position
    return Math.max(0.2, 1 - (correlatedCount * 0.2));
  }

  /**
   * Get drawdown adjustment factor
   */
  private getDrawdownAdjustment(): number {
    const drawdownPercent = Math.abs(this.metrics.currentDrawdown) / this.metrics.accountBalance;
    
    if (drawdownPercent < 0.05) return 1; // No adjustment for <5% drawdown
    if (drawdownPercent < 0.1) return 0.8; // 20% reduction for 5-10% drawdown
    if (drawdownPercent < 0.15) return 0.6; // 40% reduction for 10-15% drawdown
    return 0.4; // 60% reduction for >15% drawdown
  }

  /**
   * Get count of correlated positions
   */
  private getCorrelatedPositionsCount(symbol: string): number {
    // Simplified correlation check - in reality, this would check actual open positions
    const correlations = this.correlationMatrix.get(symbol);
    if (!correlations) return 0;
    
    let correlatedCount = 0;
    correlations.forEach((correlation, otherSymbol) => {
      if (correlation > 0.7 && this.hasOpenPosition(otherSymbol)) {
        correlatedCount++;
      }
    });
    
    return correlatedCount;
  }

  /**
   * Check if there's an open position for a symbol
   */
  private hasOpenPosition(symbol: string): boolean {
    // This would check actual open positions in a real implementation
    return false; // Simplified for this example
  }

  /**
   * Get recent trades count
   */
  private getRecentTradesCount(minutes: number): number {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.dailyTrades.filter(trade => trade.timestamp > cutoffTime).length;
  }

  /**
   * Reset daily metrics if new day
   */
  private resetDailyMetricsIfNeeded(): void {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - this.metrics.lastResetTime > dayInMs) {
      this.metrics.dailyPnL = 0;
      this.metrics.currentDrawdown = 0;
      this.dailyTrades = [];
      this.metrics.lastResetTime = now;
      console.log('Daily risk metrics reset');
    }
  }

  /**
   * Initialize correlation matrix with common crypto correlations
   */
  private initializeCorrelationMatrix(): void {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT'];
    const correlations = [
      [1.0, 0.8, 0.6, 0.7, 0.6],  // BTC
      [0.8, 1.0, 0.7, 0.8, 0.7],  // ETH
      [0.6, 0.7, 1.0, 0.6, 0.8],  // ADA
      [0.7, 0.8, 0.6, 1.0, 0.6],  // SOL
      [0.6, 0.7, 0.8, 0.6, 1.0],  // DOT
    ];

    symbols.forEach((symbol, i) => {
      const correlationMap = new Map<string, number>();
      symbols.forEach((otherSymbol, j) => {
        correlationMap.set(otherSymbol, correlations[i][j]);
      });
      this.correlationMatrix.set(symbol, correlationMap);
    });
  }

  /**
   * Get current risk metrics
   */
  getRiskMetrics(): RiskMetrics {
    return { ...this.metrics };
  }

  /**
   * Get risk configuration
   */
  getRiskConfig(): RiskConfig {
    return { ...this.config };
  }

  /**
   * Update risk configuration
   */
  updateRiskConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Force emergency mode (for testing or manual intervention)
   */
  setEmergencyMode(enabled: boolean): void {
    this.emergencyMode = enabled;
    if (enabled) {
      this.lastEmergencyTime = Date.now();
    }
  }

  /**
   * Get emergency mode status
   */
  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }
}