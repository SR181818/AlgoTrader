// This file is for browser-side metrics tracking
// It provides a simplified API that matches the server metrics
// but doesn't depend on Node.js-specific libraries

// Simple counter implementation for browser
class BrowserCounter {
  private count: Map<string, number> = new Map();
  
  constructor(public name: string, public help: string, public labelNames: string[] = []) {}
  
  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getLabelKey(labels);
    const currentValue = this.count.get(key) || 0;
    this.count.set(key, currentValue + value);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${this.name}${key} += ${value}`);
    }
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    return '{' + Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',') + '}';
  }
}

// Simple gauge implementation for browser
class BrowserGauge {
  private values: Map<string, number> = new Map();
  
  constructor(public name: string, public help: string, public labelNames: string[] = []) {}
  
  set(labels: Record<string, string> = {}, value: number): void {
    const key = this.getLabelKey(labels);
    this.values.set(key, value);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${this.name}${key} = ${value}`);
    }
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    return '{' + Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',') + '}';
  }
}

// Simple histogram implementation for browser
class BrowserHistogram {
  private observations: Map<string, number[]> = new Map();
  
  constructor(public name: string, public help: string, public labelNames: string[] = [], public buckets: number[] = []) {}
  
  observe(labels: Record<string, string> = {}, value: number): void {
    const key = this.getLabelKey(labels);
    if (!this.observations.has(key)) {
      this.observations.set(key, []);
    }
    this.observations.get(key)?.push(value);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${this.name}${key} observed ${value}`);
    }
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    return '{' + Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',') + '}';
  }
}

// Export browser-compatible metrics
export const signalCount = new BrowserCounter(
  'trading_signals_total',
  'Total number of trading signals generated',
  ['symbol', 'timeframe', 'signal_type']
);

export const tradeCount = new BrowserCounter(
  'trading_trades_total',
  'Total number of trades executed',
  ['symbol', 'side', 'status']
);

export const tradeVolume = new BrowserCounter(
  'trading_volume_total',
  'Total trading volume in base currency',
  ['symbol', 'side']
);

export const tradePnL = new BrowserGauge(
  'trading_pnl_current',
  'Current profit and loss',
  ['symbol', 'timeframe']
);

export const drawdown = new BrowserGauge(
  'trading_drawdown_percent',
  'Current drawdown as a percentage'
);

export const accountBalance = new BrowserGauge(
  'trading_account_balance',
  'Current account balance',
  ['currency']
);

export const positionCount = new BrowserGauge(
  'trading_positions_count',
  'Number of open positions',
  ['symbol', 'side']
);

export const positionSize = new BrowserGauge(
  'trading_position_size',
  'Size of open positions',
  ['symbol', 'side']
);

export const positionPnL = new BrowserGauge(
  'trading_position_pnl',
  'Profit and loss of open positions',
  ['symbol', 'side']
);

export const riskUtilization = new BrowserGauge(
  'trading_risk_utilization_percent',
  'Current risk utilization as a percentage'
);

export const riskPerTrade = new BrowserGauge(
  'trading_risk_per_trade_percent',
  'Risk per trade as a percentage'
);

export const signalLatency = new BrowserHistogram(
  'trading_signal_latency_seconds',
  'Latency of signal generation in seconds',
  ['symbol', 'timeframe'],
  [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
);

export const orderExecutionTime = new BrowserHistogram(
  'trading_order_execution_time_seconds',
  'Time taken to execute orders in seconds',
  ['symbol', 'side', 'type'],
  [0.1, 0.5, 1, 2, 5, 10, 30]
);

export const strategyExecutionTime = new BrowserHistogram(
  'trading_strategy_execution_time_seconds',
  'Time taken to execute strategy in seconds',
  ['strategy_name'],
  [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
);

export const dataPointsProcessed = new BrowserCounter(
  'trading_data_points_processed_total',
  'Total number of data points processed',
  ['symbol', 'timeframe', 'source']
);

export const dataLatency = new BrowserGauge(
  'trading_data_latency_seconds',
  'Latency of data feed in seconds',
  ['symbol', 'timeframe', 'source']
);

export const dataQuality = new BrowserGauge(
  'trading_data_quality_score',
  'Quality score of data feed (0-100)',
  ['symbol', 'timeframe', 'source']
);

export const systemUptime = new BrowserGauge(
  'trading_system_uptime_seconds',
  'System uptime in seconds'
);

export const systemStatus = new BrowserGauge(
  'trading_system_status',
  'System status (1 = healthy, 0 = unhealthy)'
);