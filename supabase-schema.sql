
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  binance_api_key TEXT,
  binance_api_secret TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) DEFAULT 'custom',
  symbol VARCHAR(20) DEFAULT 'BTCUSDT',
  timeframe VARCHAR(10) DEFAULT '1h',
  stop_loss VARCHAR(10) DEFAULT '2',
  take_profit VARCHAR(10) DEFAULT '4',
  risk_percentage VARCHAR(10) DEFAULT '1',
  max_positions INTEGER DEFAULT 1,
  entry_conditions TEXT,
  exit_conditions TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  total_trades INTEGER DEFAULT 0,
  win_rate VARCHAR(10) DEFAULT '0',
  pnl VARCHAR(20) DEFAULT '0',
  max_drawdown VARCHAR(10) DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create live_positions table
CREATE TABLE IF NOT EXISTS live_positions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  size DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8) NOT NULL,
  pnl DECIMAL(20, 8) DEFAULT 0,
  pnl_percent DECIMAL(10, 4) DEFAULT 0,
  order_id VARCHAR(255),
  is_live BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create live_trades table
CREATE TABLE IF NOT EXISTS live_trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  order_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'filled',
  is_live BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_active ON strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_live_positions_user_id ON live_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_positions_strategy_id ON live_positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_live_trades_user_id ON live_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_live_trades_strategy_id ON live_trades(strategy_id);
