
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  binance_api_key TEXT,
  binance_api_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  stop_loss DECIMAL(10,2),
  take_profit DECIMAL(10,2),
  risk_percentage DECIMAL(5,2) DEFAULT 1.0,
  max_positions INTEGER DEFAULT 1,
  entry_conditions TEXT,
  exit_conditions TEXT,
  is_active BOOLEAN DEFAULT false,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  pnl DECIMAL(15,2) DEFAULT 0,
  max_drawdown DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create live_positions table
CREATE TABLE IF NOT EXISTS live_positions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  size DECIMAL(15,8) NOT NULL,
  entry_price DECIMAL(15,8) NOT NULL,
  current_price DECIMAL(15,8),
  unrealized_pnl DECIMAL(15,2) DEFAULT 0,
  stop_loss DECIMAL(15,8),
  take_profit DECIMAL(15,8),
  status VARCHAR(20) DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create live_trades table
CREATE TABLE IF NOT EXISTS live_trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
  position_id INTEGER REFERENCES live_positions(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  size DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,8) NOT NULL,
  fee DECIMAL(15,8) DEFAULT 0,
  realized_pnl DECIMAL(15,2),
  trade_type VARCHAR(20) DEFAULT 'market',
  status VARCHAR(20) DEFAULT 'filled',
  exchange_order_id VARCHAR(100),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manual_trading_balances table
CREATE TABLE IF NOT EXISTS manual_trading_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  balance DECIMAL(15,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Insert default user and data
INSERT INTO users (id, username, email) VALUES (1, 'demo', 'demo@example.com') ON CONFLICT (id) DO NOTHING;

-- Insert default balances
INSERT INTO manual_trading_balances (user_id, symbol, balance) VALUES 
(1, 'USD', 10000),
(1, 'BTC', 0),
(1, 'ETH', 0)
ON CONFLICT (user_id, symbol) DO NOTHING;

-- Insert demo strategy
INSERT INTO strategies (
  user_id, name, description, type, symbol, timeframe,
  stop_loss, take_profit, risk_percentage, max_positions,
  entry_conditions, exit_conditions, is_active
) VALUES (
  1, 'Demo Strategy', 'Sample trading strategy', 'trend_following',
  'BTCUSDT', '1h', 2, 4, 1, 1,
  '["RSI < 30", "Price > SMA_20"]', '["RSI > 70", "Price < SMA_20"]', false
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_live_positions_user_id ON live_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_positions_strategy_id ON live_positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_live_trades_user_id ON live_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_live_trades_strategy_id ON live_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_manual_trading_balances_user_id ON manual_trading_balances(user_id);
