# Trading System Monitoring

This directory contains the monitoring setup for the trading system, including Prometheus for metrics collection, Grafana for visualization, and Alertmanager for alerts.

## Architecture

The monitoring system is split into two parts:

1. **Client-side metrics collection** - Lightweight metrics collection in the browser using `browser-metrics.ts`
2. **Server-side metrics exposition** - A separate Node.js server that exposes metrics to Prometheus using `metrics-server.js`

This separation ensures that the browser application remains lightweight while still allowing for comprehensive monitoring.

## Components

- **Prometheus**: Time series database for storing metrics
- **Grafana**: Visualization and dashboarding
- **Alertmanager**: Handles alerts from Prometheus
- **Node Exporter**: Collects system metrics (CPU, memory, disk, etc.)
- **Metrics Server**: Exposes trading system metrics to Prometheus

## Getting Started

### Starting the Monitoring Stack

```bash
cd src/monitoring
docker-compose up -d
```

This will start Prometheus, Grafana, Alertmanager, and Node Exporter.

### Starting the Metrics Server

```bash
npm run metrics
```

This will start the metrics server that exposes trading system metrics to Prometheus.

## Accessing the Dashboards

- **Grafana**: http://localhost:3000 (username: admin, password: admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## Available Dashboards

1. **Trading System Overview**: General overview of the trading system
2. **System Resources**: CPU, memory, disk, and network usage
3. **Trading Performance**: Detailed trading metrics and performance

## Metrics

### System Metrics

- CPU usage
- Memory usage
- Disk usage
- Network traffic
- System uptime

### Trading Metrics

- Account balance
- Drawdown
- P&L by symbol
- Position sizes
- Trading volume
- Signal counts
- Trade counts

### Performance Metrics

- Order execution time
- Signal latency
- Strategy execution time
- Data feed latency

### ML Model Metrics

- Prediction accuracy
- Prediction latency
- Prediction counts

## Alerts

Alerts are configured in the `rules` directory and are sent to Alertmanager, which can forward them to various notification channels:

- Email
- Slack
- PagerDuty

## Troubleshooting

### Metrics Not Showing Up

1. Check if the metrics server is running: `npm run metrics`
2. Verify Prometheus can scrape the metrics: http://localhost:9090/targets
3. Check for errors in the metrics server logs

### Alerts Not Firing

1. Check alert rules in Prometheus: http://localhost:9090/alerts
2. Verify Alertmanager is running: http://localhost:9093
3. Check Alertmanager configuration