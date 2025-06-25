// src/monitoring/prometheusHistograms.ts
import { Histogram, register } from 'prom-client';

export const apiLatencyHistogram = new Histogram({
  name: 'api_latency_seconds',
  help: 'API endpoint latency in seconds',
  labelNames: ['route', 'method', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const ccxtCallDurationHistogram = new Histogram({
  name: 'ccxt_call_duration_seconds',
  help: 'CCXT exchange call duration in seconds',
  labelNames: ['exchange', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const backtesterRunTimeHistogram = new Histogram({
  name: 'backtester_run_time_seconds',
  help: 'Backtester run time in seconds',
  labelNames: ['strategy', 'symbol', 'timeframe'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});
