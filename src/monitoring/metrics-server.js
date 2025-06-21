// This file is only used in Node.js environment, not bundled for the browser
import http from 'node:http';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

// Create a Registry to register metrics
const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// System metrics
export const systemUptime = new Gauge({
  name: 'trading_system_uptime_seconds',
  help: 'System uptime in seconds',
  registers: [register]
});

export const systemStatus = new Gauge({
  name: 'trading_system_status',
  help: 'System status (1 = healthy, 0 = unhealthy)',
  registers: [register]
});

// Trading metrics
export const signalCount = new Counter({
  name: 'trading_signals_total',
  help: 'Total number of trading signals generated',
  labelNames: ['symbol', 'timeframe', 'signal_type'],
  registers: [register]
});

export const tradeCount = new Counter({
  name: 'trading_trades_total',
  help: 'Total number of trades executed',
  labelNames: ['symbol', 'side', 'status'],
  registers: [register]
});

export const tradeVolume = new Counter({
  name: 'trading_volume_total',
  help: 'Total trading volume in base currency',
  labelNames: ['symbol', 'side'],
  registers: [register]
});

export const tradePnL = new Gauge({
  name: 'trading_pnl_current',
  help: 'Current profit and loss',
  labelNames: ['symbol', 'timeframe'],
  registers: [register]
});

export const drawdown = new Gauge({
  name: 'trading_drawdown_percent',
  help: 'Current drawdown as a percentage',
  registers: [register]
});

export const accountBalance = new Gauge({
  name: 'trading_account_balance',
  help: 'Current account balance',
  labelNames: ['currency'],
  registers: [register]
});

export const positionCount = new Gauge({
  name: 'trading_positions_count',
  help: 'Number of open positions',
  labelNames: ['symbol', 'side'],
  registers: [register]
});

export const positionSize = new Gauge({
  name: 'trading_position_size',
  help: 'Size of open positions',
  labelNames: ['symbol', 'side'],
  registers: [register]
});

export const positionPnL = new Gauge({
  name: 'trading_position_pnl',
  help: 'Profit and loss of open positions',
  labelNames: ['symbol', 'side'],
  registers: [register]
});

// Risk metrics
export const riskUtilization = new Gauge({
  name: 'trading_risk_utilization_percent',
  help: 'Current risk utilization as a percentage',
  registers: [register]
});

export const riskPerTrade = new Gauge({
  name: 'trading_risk_per_trade_percent',
  help: 'Risk per trade as a percentage',
  registers: [register]
});

// Performance metrics
export const signalLatency = new Histogram({
  name: 'trading_signal_latency_seconds',
  help: 'Latency of signal generation in seconds',
  labelNames: ['symbol', 'timeframe'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const orderExecutionTime = new Histogram({
  name: 'trading_order_execution_time_seconds',
  help: 'Time taken to execute orders in seconds',
  labelNames: ['symbol', 'side', 'type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

export const strategyExecutionTime = new Histogram({
  name: 'trading_strategy_execution_time_seconds',
  help: 'Time taken to execute strategy in seconds',
  labelNames: ['strategy_name'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Data metrics
export const dataPointsProcessed = new Counter({
  name: 'trading_data_points_processed_total',
  help: 'Total number of data points processed',
  labelNames: ['symbol', 'timeframe', 'source'],
  registers: [register]
});

export const dataLatency = new Gauge({
  name: 'trading_data_latency_seconds',
  help: 'Latency of data feed in seconds',
  labelNames: ['symbol', 'timeframe', 'source'],
  registers: [register]
});

export const dataQuality = new Gauge({
  name: 'trading_data_quality_score',
  help: 'Quality score of data feed (0-100)',
  labelNames: ['symbol', 'timeframe', 'source'],
  registers: [register]
});

// Create a server to expose metrics
const server = http.createServer(async (req, res) => {
  // Expose metrics at /metrics endpoint
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }
  
  // Default response for other routes
  res.statusCode = 404;
  res.end('Not found');
});

const PORT = process.env.METRICS_PORT || 9090;
server.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing metrics server');
  server.close(() => {
    console.log('Metrics server closed');
    process.exit(0);
  });
});