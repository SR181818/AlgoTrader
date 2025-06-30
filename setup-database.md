# Database Setup Guide

Your trading application is configured to use PostgreSQL. Here's how to add a database:

## Option 1: Neon Database (Recommended)

1. Go to [Neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the database connection string
4. In your Replit project, go to the Secrets tab (🔐 icon in sidebar)
5. Add a new secret:
   - Key: `DATABASE_URL`
   - Value: Your Neon connection string (starts with `postgresql://`)

## Option 2: Other PostgreSQL providers

You can use any PostgreSQL provider like:
- **Supabase**: Go to supabase.com → Create project → Get connection string
- **Railway**: Go to railway.app → Create PostgreSQL service → Get connection string  
- **PlanetScale**: Go to planetscale.com → Create database → Get connection string

## After adding DATABASE_URL:

1. Restart your Replit project
2. Run the database migration: `npm run db:push`
3. Your app will automatically connect to the real database

## Current Status

Right now your app is using an in-memory database (data resets when you restart). Once you add the DATABASE_URL secret, it will automatically switch to persistent PostgreSQL storage.

## Tables Created

The database will automatically create these tables:
- `users` - User accounts and authentication
- `strategies` - Trading strategies you create
- `trades` - Trading history
- `backtests` - Backtest results
- `manual_trading_balances` - Paper trading balances
- `live_simulation_accounts` - Live trading simulation data

All your strategies and trading data will be permanently saved once the database is connected.