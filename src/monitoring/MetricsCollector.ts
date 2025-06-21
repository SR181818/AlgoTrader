import {
  signalCount, 
  tradeCount, 
  tradeVolume, 
  tradePnL, 
  drawdown, 
  accountBalance, 
  positionCount, 
  positionSize, 
  positionPnL, 
  riskUtilization, 
  riskPerTrade, 
  signalLatency, 
  orderExecutionTime, 
  strategyExecutionTime, 
  dataPointsProcessed, 
  dataLatency, 
  dataQuality, 
  systemUptime, 
  systemStatus 
} from './browser-metrics';

import { TradingSignal, Trade, CandleData } from '../types/trading';
import { RiskManager } from '../trading/RiskManager';
import { OrderExecutor, Position } from '../trading/OrderExecutor';

/**
 * Service to collect and update metrics from various parts of the trading system
 */
export class MetricsCollector {
  private startTime: number;
  private isHealthy: boolean = true;
  private updateInterval: number | null = null;
  
  constructor() {
    this.startTime = Date.now();
    
    // Start system metrics collection
    this.startSystemMetricsCollection();
  }
  
  /**
   * Start collecting system metrics at regular intervals
   */
  private startSystemMetricsCollection() {
    this.updateInterval = window.setInterval(() => {
      // Update system uptime
      const uptimeSeconds = (Date.now() - this.startTime) / 1000;
      systemUptime.set({}, uptimeSeconds);
      
      // Update system status
      systemStatus.set({}, this.isHealthy ? 1 : 0);
    }, 5000);
  }
  
  /**
   * Set system health status
   */
  setSystemHealth(isHealthy: boolean) {
    this.isHealthy = isHealthy;
    systemStatus.set({}, isHealthy ? 1 : 0);
  }
  
  /**
   * Record a new trading signal
   */
  recordSignal(signal: TradingSignal, latencyMs: number) {
    // Increment signal counter
    signalCount.inc({
      symbol: signal.ticker,
      timeframe: signal.timeframe,
      signal_type: signal.signal
    });
    
    // Record signal latency
    signalLatency.observe(
      {
        symbol: signal.ticker,
        timeframe: signal.timeframe
      },
      latencyMs / 1000 // Convert to seconds
    );
  }
  
  /**
   * Record a new trade
   */
  recordTrade(trade: Trade) {
    // Increment trade counter
    tradeCount.inc({
      symbol: trade.symbol,
      side: trade.signal.signal,
      status: trade.status
    });
    
    // Update trade volume
    tradeVolume.inc({
      symbol: trade.symbol,
      side: trade.signal.signal
    }, trade.size);
    
    // Update PnL if available
    if (trade.pnl !== undefined) {
      tradePnL.set({
        symbol: trade.symbol,
        timeframe: trade.timeframe
      }, trade.pnl);
    }
  }
  
  /**
   * Record order execution time
   */
  recordOrderExecution(symbol: string, side: 'buy' | 'sell', type: string, durationMs: number) {
    orderExecutionTime.observe(
      {
        symbol,
        side,
        type
      },
      durationMs / 1000 // Convert to seconds
    );
  }
  
  /**
   * Record strategy execution time
   */
  recordStrategyExecution(strategyName: string, durationMs: number) {
    strategyExecutionTime.observe(
      {
        strategy_name: strategyName
      },
      durationMs / 1000 // Convert to seconds
    );
  }
  
  /**
   * Record new candle data
   */
  recordCandleData(symbol: string, timeframe: string, source: string, candle: CandleData, latencyMs: number) {
    // Increment data points counter
    dataPointsProcessed.inc({
      symbol,
      timeframe,
      source
    });
    
    // Record data latency
    dataLatency.set({
      symbol,
      timeframe,
      source
    }, latencyMs / 1000); // Convert to seconds
    
    // Simple data quality score (100 - latency in seconds, min 0)
    const qualityScore = Math.max(0, 100 - (latencyMs / 100));
    dataQuality.set({
      symbol,
      timeframe,
      source
    }, qualityScore);
  }
  
  /**
   * Update account metrics from RiskManager
   */
  updateRiskMetrics(riskManager: RiskManager) {
    const metrics = riskManager.getRiskMetrics();
    
    // Update account balance
    accountBalance.set({ currency: 'USD' }, metrics.accountBalance);
    
    // Update drawdown
    drawdown.set({}, metrics.currentDrawdown * 100); // Convert to percentage
    
    // Update risk utilization
    const riskConfig = riskManager.getRiskConfig();
    const riskPerTradePercent = riskConfig.maxRiskPerTrade * 100;
    riskPerTrade.set({}, riskPerTradePercent);
    
    // Calculate risk utilization
    const riskUtilizationPercent = (metrics.openPositionsCount / riskConfig.maxOpenPositions) * 100;
    riskUtilization.set({}, riskUtilizationPercent);
  }
  
  /**
   * Update position metrics from OrderExecutor
   */
  updatePositionMetrics(positions: Position[]) {
    // Reset position gauges (to handle closed positions)
    // Note: In browser environment, we can't actually reset gauges, so we'll just update them
    
    // Update position metrics for each position
    positions.forEach(position => {
      // Update position count
      positionCount.set({
        symbol: position.symbol,
        side: position.side
      }, 1);
      
      // Update position size
      positionSize.set({
        symbol: position.symbol,
        side: position.side
      }, position.amount);
      
      // Update position PnL
      positionPnL.set({
        symbol: position.symbol,
        side: position.side
      }, position.unrealizedPnL);
    });
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }
  }
}