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

import { StrategyRunner } from '../trading/StrategyRunner';
import { OrderExecutor } from '../trading/OrderExecutor';
import { RiskManager } from '../trading/RiskManager';
import { realDataService } from '../utils/realDataService';

/**
 * Integrate metrics collection with the trading system components
 */
export function integrateMetrics(
  strategyRunner: StrategyRunner,
  orderExecutor: OrderExecutor,
  riskManager: RiskManager
) {
  // Initialize system metrics
  systemStatus.set({}, 1); // System is healthy
  const startTime = Date.now();
  setInterval(() => {
    systemUptime.set({}, (Date.now() - startTime) / 1000);
  }, 10000);

  // Integrate with StrategyRunner
  strategyRunner.getStrategySignals().subscribe(signal => {
    // Record signal
    signalCount.inc({
      symbol: signal.metadata.symbol || 'unknown',
      timeframe: signal.metadata.timeframe || 'unknown',
      signal_type: signal.type
    });
  });

  // Integrate with OrderExecutor
  orderExecutor.getOrderUpdates().subscribe(order => {
    if (order.status === 'filled') {
      // Record trade
      tradeCount.inc({
        symbol: order.intent.symbol,
        side: order.intent.side,
        status: order.status
      });

      // Record trade volume
      tradeVolume.inc({
        symbol: order.intent.symbol,
        side: order.intent.side
      }, order.executedAmount * order.executedPrice);
    }
  });

  orderExecutor.getPositionUpdates().subscribe(position => {
    // Update position metrics
    positionCount.set({
      symbol: position.symbol,
      side: position.side
    }, position.amount > 0 ? 1 : 0);

    positionSize.set({
      symbol: position.symbol,
      side: position.side
    }, position.amount);

    positionPnL.set({
      symbol: position.symbol,
      side: position.side
    }, position.unrealizedPnL);
  });

  orderExecutor.getBalanceUpdates().subscribe(balance => {
    // Update account balance
    const usdtBalance = balance.USDT?.total || 0;
    accountBalance.set({ currency: 'USD' }, usdtBalance);
  });

  // Integrate with RiskManager
  setInterval(() => {
    const metrics = riskManager.getRiskMetrics();
    
    // Update drawdown
    drawdown.set({}, metrics.currentDrawdown * 100); // Convert to percentage
    
    // Update risk metrics
    const config = riskManager.getRiskConfig();
    riskPerTrade.set({}, config.maxRiskPerTrade * 100); // Convert to percentage
    
    // Calculate risk utilization
    const riskUtilizationPercent = (metrics.openPositionsCount / config.maxOpenPositions) * 100;
    riskUtilization.set({}, riskUtilizationPercent);
  }, 5000);

  // Integrate with data service
  realDataService.onDataUpdate = (symbol, timeframe, data, latencyMs) => {
    // Record data metrics
    dataPointsProcessed.inc({
      symbol,
      timeframe,
      source: 'realtime'
    });
    
    dataLatency.set({
      symbol,
      timeframe,
      source: 'realtime'
    }, latencyMs / 1000); // Convert to seconds
    
    // Simple data quality score (100 - latency in seconds, min 0)
    const qualityScore = Math.max(0, 100 - (latencyMs / 100));
    dataQuality.set({
      symbol,
      timeframe,
      source: 'realtime'
    }, qualityScore);
  };

  // Return cleanup function
  return () => {
    // Clean up any subscriptions or intervals if needed
  };
}