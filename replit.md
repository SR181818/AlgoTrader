# Replit.md

## Overview

This is a full-stack trading application built with React and Express.js, featuring a modern trading platform with technical analysis, backtesting capabilities, and an extensive plugin marketplace. The application provides real-time market data visualization, strategy building tools, and comprehensive trading utilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **State Management**: Redux Toolkit with persistent storage
- **UI Components**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production
- **Testing**: Jest with React Testing Library

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-based sessions via connect-pg-simple
- **Development**: TypeScript with tsx for hot reloading
- **Production**: ESBuild bundling for optimized deployment

### Key Components

1. **Trading Engine**
   - Strategy runner with configurable rules and indicators
   - Order executor with multiple exchange support
   - Risk management with position sizing and drawdown controls
   - Backtesting framework with performance metrics

2. **Market Data Services**
   - Live market data integration (Binance, multiple exchanges)
   - WebSocket connections for real-time price feeds
   - Technical indicator calculations with TA-Lib integration
   - Historical data caching and management

3. **Plugin System**
   - Marketplace for trading plugins and strategies
   - Sandboxed execution environment for user plugins
   - Stripe integration for plugin purchases
   - Developer dashboard for plugin management

4. **UI/UX Components**
   - TradingView-style charts and indicators
   - Real-time portfolio dashboards
   - Strategy builder with visual rule configuration
   - Comprehensive settings and configuration panels

## Data Flow

1. **Market Data Pipeline**
   - Real-time data flows from exchange APIs through WebSocket connections
   - Technical indicators are calculated using dedicated worker threads
   - Data is cached in Redis (configurable) and stored in PostgreSQL
   - React components subscribe to data streams via RxJS observables

2. **Trading Strategy Flow**
   - Users build strategies using the visual strategy builder
   - Strategies are executed by the StrategyRunner with configurable rules
   - Signals are generated based on technical analysis and user-defined conditions
   - Orders are executed through the OrderExecutor with risk management checks

3. **Plugin Execution Flow**
   - Plugins are executed in isolated VM2 sandboxes for security
   - Plugin marketplace handles distribution, payments, and updates
   - Developers can publish and monetize their trading strategies and indicators

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL database connection
- `drizzle-orm`: Type-safe SQL query builder and ORM
- `express`: Web server framework
- `@tanstack/react-query`: Data fetching and caching
- `ccxt`: Cryptocurrency exchange trading library
- `rxjs`: Reactive programming for data streams

### UI Dependencies
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library
- `recharts`: Charts and data visualization

### Trading & Analysis
- `technicalindicators`: Technical analysis indicators
- `vm2`: Secure sandbox for plugin execution
- `stripe`: Payment processing for plugin marketplace

### Development Tools
- `vite`: Fast build tool and dev server
- `typescript`: Type safety and enhanced development experience
- `esbuild`: Fast bundler for production builds

## Deployment Strategy

### Development
- **Environment**: Replit with live reloading
- **Database**: PostgreSQL 16 module
- **Port Configuration**: Server runs on port 5000, exposed on port 80
- **Hot Reloading**: Vite dev server with React Fast Refresh

### Production
- **Build Process**: 
  1. Frontend build with Vite (outputs to `dist/public`)
  2. Backend build with ESBuild (outputs to `dist/index.js`)
- **Database**: Neon PostgreSQL serverless
- **Deployment**: Autoscale deployment target
- **Environment Variables**: `DATABASE_URL` required for database connection

### Database Schema
- **Users Table**: Basic user management with username/password
- **Migrations**: Drizzle migrations in `./migrations` directory
- **Schema Definition**: Centralized in `shared/schema.ts`

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 29, 2025. Successfully migrated project from Replit Agent to Replit environment
  - Fixed database configuration with in-memory mock database for development
  - Resolved strategy saving and fetching functionality
  - Fixed strategy preview and test functionality
  - All core trading features now working (strategy builder, preview, test, live trading)
- June 27, 2025. Initial setup