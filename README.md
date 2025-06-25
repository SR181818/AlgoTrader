# AlgoTrader: Algorithmic Global Trading and Risk Management

[![API Docs](https://img.shields.io/badge/docs-typedoc-blue)](./docs/api/index.html)

This project is a sophisticated multi-asset trading dashboard designed for real-time market analysis, automated trading, strategy backtesting, portfolio management, and machine learning integration. It leverages modern web technologies, robust backend services, and blockchain for enhanced security and features.

## Table of Contents

1.  [Key Features](#key-features)
2.  [Architecture Overview](#architecture-overview)
3.  [Core Functionalities](#core-functionalities)
    *   [Real-time Market Data](#real-time-market-data)
    *   [Technical Analysis & Indicators](#technical-analysis--indicators)
    *   [Automated Trading & Order Execution](#automated-trading--order-execution)
    *   [Strategy Backtesting](#strategy-backtesting)
    *   [Portfolio Management](#portfolio-management)
    *   [Machine Learning Integration](#machine-learning-integration)
    *   [Blockchain Integration & Paywall](#blockchain-integration--paywall)
    *   [Plugin Marketplace](#plugin-marketplace)
4.  [Monitoring & Observability](#monitoring--observability)
5.  [Development Setup](#development-setup)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Running the Application](#running-the-application)
    *   [Running Tests](#running-tests)
    *   [Running Metrics Server](#running-metrics-server)
    *   [Running Monitoring Stack](#running-monitoring-stack)
6.  [Project Structure](#project-structure)
7.  [CI/CD Pipeline](#cicd-pipeline)
8.  [Technologies Used](#technologies-used)
9.  [Contributing](#contributing)
10. [License](#license)

## Key Features

*   **Real-time Market Data**: Live streaming data for cryptocurrencies, forex, and commodities.
*   **Advanced Technical Analysis**: Comprehensive library of TA-Lib indicators with real-time calculation and visualization.
*   **Automated Trading Signals**: Strategy runner generates buy/sell/hold signals based on configurable rules and indicator confluence.
*   **Paper & Live Trading**: Simulate trades with paper money or connect to real exchanges for live execution.
*   **Strategy Backtesting**: Test strategies against historical data with detailed performance metrics and equity curve analysis.
*   **Portfolio Management**: Track multiple trading accounts, manage positions, and monitor overall portfolio performance and risk.
*   **Machine Learning Integration**: Load, train, and run inference with custom ML models for predictions and anomaly detection.
*   **Blockchain-based Paywall**: Secure premium features and user identity using Algorand blockchain.
*   **Plugin Marketplace**: Extend functionality with a marketplace for custom indicators, strategies, and tools.
*   **Comprehensive Monitoring**: Integrated Prometheus, Grafana, and Alertmanager for system and trading performance monitoring.
*   **Responsive UI**: Modern and intuitive user interface built with React and Tailwind CSS.

## Architecture Overview

The application follows a modular, component-based architecture for the frontend, interacting with various services for data, trading logic, and external integrations.

*   **Frontend**: React.js with Vite, Redux Toolkit for state management, React Router for navigation, and Tailwind CSS for styling.
*   **Trading Core**: TypeScript modules for `StrategyRunner`, `OrderExecutor`, `RiskManager`, and `Backtester`.
*   **Data Services**: `LiveMarketDataService` (using `ccxt`) for real-time data, `TechnicalIndicatorService` for calculations.
*   **ML Services**: `MLPluginManager`, `InferenceEngine`, `TrainingPipeline` for managing and executing machine learning models.
*   **Blockchain Integration**: `AlgorandPaywall` and `AlgorandIdentity` for wallet connection, subscriptions, and decentralized identity.
*   **Monitoring**: Prometheus, Grafana, Alertmanager, Node Exporter, and a custom metrics server for comprehensive observability.
*   **CI/CD**: GitHub Actions for automated testing, building, and deployment.
*   **Containerization**: Docker for packaging the application and monitoring stack.

## Core Functionalities

### Real-time Market Data

*   **Live Data Feeds**: Connects to exchanges (e.g., Binance) via WebSockets for real-time price and candle data. (`src/services/BinanceWebSocketService.ts`, `src/services/LiveMarketDataService.ts`, `src/utils/realDataService.ts`)
*   **Market Overview**: Displays live market data for various asset categories (cryptocurrencies, forex, commodities) with 24h change and volume. (`src/components/MarketOverview.tsx`)
*   **Price Card & Chart**: Dedicated components to show current price, daily stats, and a customizable price chart with indicator overlays. (`src/components/PriceCard.tsx`, `src/components/PriceChart.tsx`)
*   **Symbol & Timeframe Selection**: Intuitive selectors for choosing trading pairs and timeframes, with live data updates. (`src/components/SymbolSelector.tsx`, `src/components/TimeframeSelector.tsx`)
*   **Order Book**: Simulated real-time order book display with quick buy/sell actions. (`src/components/OrderBook.tsx`)

### Technical Analysis & Indicators

*   **Comprehensive Indicator Library**: Integrates `technicalindicators` library for a wide range of TA-Lib indicators (SMA, EMA, MACD, RSI, Bollinger Bands, ATR, PSAR, Klinger, etc.). (`src/utils/talib-indicators.ts`, `src/services/TechnicalIndicatorService.ts`, `src/utils/indicators/*`)
*   **Real-time Calculation**: Indicators are calculated and updated in real-time as new candle data arrives. (`src/pages/TradingDashboardPage.tsx`)
*   **Indicator Panels**: Dedicated UI components to display indicator values, signals, and trends. (`src/components/IndicatorPanel.tsx`, `src/components/IndicatorLibrary.tsx`)
*   **Custom Indicator Selector**: Allows users to add and configure custom TA-Lib indicators with search and category filters. (`src/components/CustomIndicatorSelector.tsx`)
*   **Redux State Management**: Indicator configurations are managed in a Redux store with persistence to local storage. (`src/store/talibIndicatorSlice.ts`, `src/hooks/useTALibIndicators.ts`)

### Automated Trading & Order Execution

*   **Strategy Runner**: Executes trading strategies, processes indicator signals, and generates trade signals (LONG, SHORT, HOLD) based on defined rules and confidence levels. (`src/trading/StrategyRunner.ts`, `src/hooks/useStrategyRunner.ts`)
*   **Order Executor**: Handles placing and managing orders (market, limit, stop loss, take profit) on connected exchanges. Supports both paper trading and live execution. (`src/trading/OrderExecutor.ts`, `src/hooks/useOrderExecutor.ts`)
*   **Risk Management**: Integrates a `RiskManager` to control position sizing, daily drawdown, maximum exposure, and other risk parameters. (`src/trading/RiskManager.ts`)
*   **Signal Event Log**: Displays a real-time log of generated trading signals with detailed reasoning and indicator values. (`src/components/dashboard/SignalEventLog.tsx`)
*   **Open Positions Table**: Shows current open positions with unrealized P&L. (`src/components/dashboard/OpenPositionsTable.tsx`)
*   **P&L Overview**: Visualizes current, daily, and total P&L, along with account balance. (`src/components/dashboard/PnLGauge.tsx`)
*   **Notification Service**: Sends alerts for trade executions, signals, and risk events via email, Telegram, or webhooks. (`src/services/NotificationService.ts`)

### Strategy Backtesting

*   **Backtester Module**: Core logic for running backtests against historical data. Supports CSV data import or simulated data generation. (`src/trading/Backtester.ts`)
*   **Backtest Dashboard**: Comprehensive UI for configuring backtest parameters (date range, initial balance, strategy, commission, slippage), running tests, and visualizing progress. (`src/components/BacktestDashboard.tsx`, `src/pages/BacktestPage.tsx`)
*   **Detailed Results**: Provides extensive performance metrics including total return, Sharpe ratio, max drawdown, win rate, profit factor, and trade statistics. (`src/trading/Backtester.ts`)
*   **Equity Curve Chart**: Visualizes the equity curve and drawdown over the backtest period. (`src/components/EquityCurveChart.tsx`)
*   **Trade History Export**: Allows downloading detailed trade logs in CSV format.

### Portfolio Management

*   **Portfolio Manager Service**: Manages multiple trading accounts and portfolios, aggregating positions, trades, and metrics across them. (`src/services/PortfolioManager.ts`, `src/hooks/usePortfolioManager.ts`)
*   **Account Management**: CRUD operations for connecting and managing exchange accounts. (`src/api/portfolioRoutes.ts`, `src/components/portfolio/AccountsTable.tsx`)
*   **Portfolio Dashboard**: Centralized view for portfolio summary, equity, positions, allocations, and risk. (`src/pages/PortfolioDashboard.tsx`, `src/components/portfolio/PortfolioSummary.tsx`)
*   **Portfolio Allocation**: Visualizes asset allocation across accounts within a portfolio. (`src/components/portfolio/PortfolioAllocationChart.tsx`)
*   **Portfolio Risk Panel**: Configures and assesses portfolio-level risk limits (total exposure, daily loss, drawdown). (`src/components/portfolio/PortfolioRiskPanel.tsx`)
*   **Risk Alerts**: Generates and displays alerts for potential risk breaches (e.g., high drawdown, excessive exposure). (`src/components/portfolio/PortfolioAlertsList.tsx`)
*   **Trade & Position Tracking**: Detailed tables for all trades and open positions across managed portfolios. (`src/components/portfolio/PortfolioTradesTable.tsx`, `src/components/portfolio/PortfolioPositionsTable.tsx`)
*   **Database Models**: Defined data models and a basic in-memory DAL for accounts, portfolios, positions, trades, and metrics, with PostgreSQL schema definitions. (`src/models/PortfolioModels.ts`)

### Machine Learning Integration

*   **ML Plugin Architecture**: Modular system for integrating various ML models as plugins (TensorFlow.js, ONNX Runtime, PyTorch via backend, Custom). (`src/ml/MLPlugin.ts`, `src/ml/MLPluginManager.ts`)
*   **ML Dashboard**: UI for selecting, viewing details, training, and running inference with ML models. (`src/ml/components/MLDashboard.tsx`)
*   **Inference Engine**: Runs real-time predictions with loaded ML models, processing market data and emitting results. (`src/ml/inference/InferenceEngine.ts`, `src/ml/hooks/useInferenceEngine.ts`)
*   **Training Pipeline**: Manages the training process for trainable ML models, including configuration, data handling, and progress monitoring. (`src/ml/training/TrainingPipeline.ts`, `src/ml/components/MLModelTraining.tsx`, `src/ml/hooks/useTrainingPipeline.ts`)
*   **Data Preprocessing**: Includes utilities for data transformation and feature extraction (e.g., `MinMaxScaler`, `StandardScaler`, `CandleFeatureExtractor`). (`src/ml/data/DataPipeline.ts`)
*   **Example Models**: Pre-built examples for Price Prediction (LSTM), Anomaly Detection (Autoencoder), and Market Regime Classification (CNN-LSTM). (`src/ml/examples/*`)

### Blockchain Integration & Paywall

*   **Algorand Wallet Connect**: Component for connecting to Algorand wallets (Pera Wallet, MyAlgo Connect). (`src/components/blockchain/AlgorandWalletConnect.tsx`)
*   **Decentralized Identity**: Manages user identity on the Algorand blockchain, allowing users to add and verify claims (e.g., name, email). (`src/blockchain/AlgorandIdentity.ts`, `src/components/blockchain/AlgorandIdentityManager.tsx`)
*   **Blockchain Paywall**: Implements a subscription system where users pay with ALGOs on the Algorand blockchain to unlock premium features. Defines subscription tiers (Free, Basic, Pro, Enterprise) and their associated features. (`src/blockchain/AlgorandPaywall.ts`, `src/pages/BlockchainPaywallPage.tsx`)
*   **Feature Paywall Component**: A reusable component to wrap UI elements and restrict access based on the user's subscription tier. (`src/components/blockchain/FeaturePaywall.tsx`)
*   **Subscription Smart Contract**: TEAL (Transaction Execution Approval Language) code for an Algorand smart contract to manage subscriptions on-chain. (`src/blockchain/AlgorandSmartContract.ts`)

### Plugin Marketplace

*   **Browse & Discover**: Users can browse, search, and filter plugins by category, price, and popularity. (`src/plugins/marketplace/components/PluginMarketplace.tsx`)
*   **Plugin Details**: View detailed information about each plugin, including description, version history, ratings, and screenshots. (`src/plugins/marketplace/components/PluginDetails.tsx`)
*   **Purchase & Download**: Supports one-time purchases and subscriptions for plugins, with a simulated payment flow. (`src/plugins/marketplace/components/PluginPurchaseModal.tsx`)
*   **Rating & Reviews**: Users can rate and review plugins they have purchased or installed.
*   **Developer Dashboard**: Provides tools for plugin developers to create, manage, and publish their plugins, track downloads, and view analytics. (`src/plugins/marketplace/components/PluginDeveloperDashboard.tsx`)
*   **Admin Dashboard**: Allows administrators to review, approve/reject, verify, and manage plugin statuses. (`src/plugins/marketplace/components/PluginAdminDashboard.tsx`)
*   **Sandbox Execution**: Plugins are executed in a secure sandbox environment to prevent malicious code. (`src/plugins/marketplace/services/SandboxService.ts`)
*   **Stripe Integration**: Simulated Stripe integration for handling payments and subscriptions. (`src/plugins/marketplace/services/StripeService.ts`)
*   **API Endpoints**: Comprehensive API for plugin management, purchases, and execution. (`src/plugins/marketplace/api/PluginMarketplaceAPI.ts`)

## Monitoring & Observability

The project includes a robust monitoring stack to ensure the health and performance of the trading system.

*   **Prometheus**: Collects metrics from the application and system. (`src/monitoring/prometheus.yml`)
*   **Grafana**: Visualizes metrics through interactive dashboards for system resources and trading performance. (`src/monitoring/grafana/dashboards/*`, `src/monitoring/grafana/provisioning/*`)
*   **Alertmanager**: Manages and routes alerts based on predefined rules. (`src/monitoring/alertmanager.yml`, `src/monitoring/rules/*`)
*   **Node Exporter**: Collects host-level metrics (CPU, memory, disk, network).
*   **Custom Metrics Server**: A Node.js server exposes application-specific metrics (trading signals, trades, P&L, risk, ML model performance) to Prometheus. (`src/monitoring/metrics-server.js`)
*   **Browser-side Metrics**: Lightweight metrics collection directly in the browser for frontend performance and user interaction. (`src/monitoring/browser-metrics.ts`, `src/monitoring/MetricsProvider.tsx`)
*   **Metrics Integration**: Core trading modules (StrategyRunner, OrderExecutor, RiskManager, LiveMarketDataService) are integrated to emit metrics. (`src/monitoring/integration.ts`, `src/monitoring/MetricsCollector.ts`)
*   **WebSocket Monitor**: UI component to display WebSocket connection status and statistics. (`src/components/WebSocketMonitor.tsx`)
*   **Health Checks**: API endpoints and a utility function to perform health checks on various system components. (`src/api/healthRoutes.ts`, `src/utils/healthCheck.ts`)

## Development Setup

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or yarn)
*   Docker & Docker Compose (for monitoring stack)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd multi-asset-trading-dashboard
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

### Running the Application

To start the development server:

```bash
npm run dev
# or yarn dev
The application will be available at http://localhost:5173.

Running Tests
To run all unit tests:


npm test
# or yarn test
To run tests in watch mode:


npm run test:watch
# or yarn test:watch
To run tests with coverage report:


npm run test:coverage
# or yarn test:coverage
Running Metrics Server
The metrics server is a separate Node.js process that exposes application metrics to Prometheus.


npm run metrics
# or yarn metrics
The metrics will be available at http://localhost:9090/metrics.

Running Monitoring Stack
To start the full monitoring stack (Prometheus, Grafana, Alertmanager, Node Exporter) using Docker Compose:


cd src/monitoring
docker-compose up -d
Once started:

Grafana: http://localhost:3000 (username: admin, password: admin)
Prometheus: http://localhost:9090
Alertmanager: http://localhost:9093

```
Project Structure
```bash
├── .github/                 # GitHub Actions CI/CD workflows
├── .dockerignore            # Docker ignore file
├── Dockerfile               # Docker build instructions
├── eslint.config.js         # ESLint configuration
├── jest.config.js           # Jest test configuration
├── nginx.conf               # Nginx configuration for production build
├── package.json             # Project dependencies and scripts
├── postcss.config.js        # PostCSS configuration
├── public/                  # Static assets
├── src/                     # Source code
│   ├── api/                 # Simulated REST API endpoints
│   ├── blockchain/          # Algorand blockchain integration (identity, paywall, smart contract)
│   ├── components/          # Reusable UI components
│   │   ├── blockchain/      # Blockchain-specific UI components
│   │   ├── dashboard/       # Dashboard-specific UI components
│   │   ├── portfolio/       # Portfolio-specific UI components
│   │   └── strategy-builder/# Strategy builder UI components
│   ├── data/                # Static data (trading pairs, timeframes)
│   ├── hooks/               # Custom React hooks for logic encapsulation
│   ├── ml/                  # Machine Learning integration
│   │   ├── components/      # ML-specific UI components
│   │   ├── custom/          # Custom ML plugin implementation
│   │   ├── data/            # Data preprocessing pipelines for ML
│   │   ├── examples/        # Example ML models (TensorFlow.js)
│   │   ├── hooks/           # ML-specific React hooks
│   │   ├── inference/       # ML inference engine
│   │   ├── onnx/            # ONNX Runtime plugin implementation
│   │   ├── pytorch/         # PyTorch plugin implementation (via backend)
│   │   ├── tensorflow/      # TensorFlow.js plugin implementation
│   │   └── training/        # ML model training pipeline
│   ├── models/              # Data models (e.g., PortfolioModels)
│   ├── monitoring/          # Observability stack (Prometheus, Grafana, Alertmanager)
│   │   ├── browser-metrics.ts # Browser-side metrics definitions
│   │   ├── docker-compose.yml # Docker Compose for monitoring stack
│   │   ├── grafana/         # Grafana dashboards and provisioning
│   │   ├── integration.ts   # Metrics integration with application logic
│   │   ├── metrics-server.js# Node.js server to expose metrics
│   │   └── rules/           # Prometheus alert rules
│   ├── pages/               # Application pages
│   ├── plugins/             # Plugin Marketplace implementation
│   │   ├── marketplace/     # Marketplace components, services, models, API
│   │   └── ...              # Other plugin types
│   ├── services/            # Core application services
│   │   ├── BinanceWebSocketService.ts # Binance WebSocket integration
│   │   ├── LiveMarketDataService.ts   # Live market data fetching (CCXT)
│   │   ├── MarketDataIntegrationService.ts # Integrates market data with indicators
│   │   ├── NotificationService.ts     # Notification delivery
│   │   ├── PortfolioManager.ts        # Portfolio management logic
│   │   ├── TechnicalIndicatorService.ts # Technical indicator calculations
│   │   └── WebSocketCandleService.ts  # Generic WebSocket for candles
│   ├── store/               # Redux Toolkit store setup
│   │   ├── middleware/      # Redux middleware (e.g., persistence)
│   │   ├── indicatorStore.ts# Legacy indicator Redux slice
│   │   └── talibIndicatorSlice.ts # TA-Lib indicator Redux slice
│   ├── trading/             # Core trading logic
│   │   ├── Backtester.ts    # Backtesting engine
│   │   ├── OrderExecutor.ts # Order execution and position management
│   │   ├── RiskManager.ts   # Risk management logic
│   │   └── StrategyRunner.ts# Strategy execution and signal generation
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── indicators/      # Modularized technical indicator calculations
│   │   ├── mockData.ts      # Mock data generation
│   │   ├── realDataService.ts # Centralized real-time data access
│   │   ├── signalGenerator.ts # Trading signal generation
│   │   ├── smokeTest.ts     # System smoke test script
│   │   ├── strategyTemplates.ts # Pre-built strategy templates
│   │   └── talib-indicators.ts# TA-Lib indicator configurations
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Entry point for React app
│   └── vite-env.d.ts        # Vite environment type definitions
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # TypeScript configuration for application
├── tsconfig.node.json       # TypeScript configuration for Node.js environment
└── vite.config.ts           # Vite configuration

```

CI/CD Pipeline
The project utilizes GitHub Actions for a robust CI/CD pipeline defined in .github/workflows/ci-cd.yml.

Linting: Runs ESLint to ensure code quality and consistency.

Testing: Executes Jest unit tests, including coverage reports uploaded to Codecov.

Building: Builds the React application for production.

Docker Image: Builds and pushes Docker images to Docker Hub for main branch pushes.

Security Scan: Runs Trivy vulnerability scanner on the codebase and uploads results to GitHub Security tab.

Deployment: Includes a placeholder for production deployment steps, triggered on main branch pushes.

Technologies Used

```bash
Frontend:
React.js
Vite
TypeScript
Tailwind CSS
Redux Toolkit
React Router DOM
Lucide React (icons)
Framer Motion (animations)
Recharts (charts)
Dnd Kit (drag and drop)
Trading & Data:
CCXT (CryptoCurrency eXchange Trading Library)
Technicalindicators (TA-Lib in JS)
RxJS (reactive programming)
Stripe (simulated payment processing)
Blockchain:
Algorand SDK (algosdk)
Pera Wallet Connect (@perawallet/connect)
MyAlgo Connect (@randlabs/myalgo-connect)
Machine Learning:
TensorFlow.js (@tensorflow/tfjs)
ONNX Runtime Web (onnxruntime-web)
VM2 (sandbox environment)
Monitoring:
Prometheus
Grafana
Alertmanager
Node Exporter
Prom-client (Node.js metrics)
```
```bash
Development Tools:
Node.js
npm/yarn
Docker
Git
ESLint
Jest
GitHub Actions
Contributing
Contributions are welcome! Please follow these steps:
```
Fork the repository.

Create a new branch (git checkout -b feature/your-feature-name).

Make your changes.

Commit your changes (git commit -m 'Add new feature').

Push to the branch (git push origin feature/your-feature-name).

Create a new Pull Request.

License
This project is licensed under the MIT License.

## API Documentation

*   Full TypeScript API docs are generated with [TypeDoc](https://typedoc.org/).
*   To build docs: `npx typedoc`
*   View docs at: `./docs/api/index.html`


