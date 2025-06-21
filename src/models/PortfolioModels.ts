import { RiskConfig } from '../trading/RiskManager';

// Database models for portfolio management
// These would be used with an actual database like PostgreSQL, MongoDB, etc.

export interface AccountModel {
  id: string;
  name: string;
  description?: string;
  exchange: string;
  apiKey?: string;
  apiSecret?: string;
  testnet: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Reference to user who owns this account
}

export interface PortfolioModel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Reference to user who owns this portfolio
}

export interface PortfolioAccountModel {
  id: string;
  portfolioId: string;
  accountId: string;
  allocationPercent: number;
  maxRiskPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioRiskConfigModel {
  id: string;
  portfolioId: string;
  // Risk per trade settings
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxOpenPositions: number;
  maxCorrelatedPositions: number;
  minRiskRewardRatio: number;
  maxLeverage: number;
  emergencyStopLoss: number;
  cooldownPeriod: number;
  // Portfolio-specific risk limits
  maxTotalExposure: number;
  maxSinglePositionSize: number;
  maxCorrelatedExposure: number;
  maxDailyLoss: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioPositionModel {
  id: string;
  portfolioId: string;
  accountId: string;
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdate: Date;
}

export interface PortfolioTradeModel {
  id: string;
  portfolioId: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  pnl?: number;
  commission: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  orderId: string; // Reference to the actual order
}

export interface PortfolioMetricsModel {
  id: string;
  portfolioId: string;
  totalEquity: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  dailyPnL: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  activePositions: number;
  riskUtilization: number;
  timestamp: Date;
}

export interface PortfolioAlertModel {
  id: string;
  portfolioId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  timestamp: Date;
}

// Database schema definitions (example for PostgreSQL)
export const SCHEMA_DEFINITIONS = {
  accounts: `
    CREATE TABLE IF NOT EXISTS accounts (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      exchange VARCHAR(50) NOT NULL,
      api_key VARCHAR(100),
      api_secret VARCHAR(100),
      testnet BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      user_id VARCHAR(50) NOT NULL
    );
  `,
  
  portfolios: `
    CREATE TABLE IF NOT EXISTS portfolios (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      user_id VARCHAR(50) NOT NULL
    );
  `,
  
  portfolio_accounts: `
    CREATE TABLE IF NOT EXISTS portfolio_accounts (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
      max_risk_percent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(portfolio_id, account_id)
    );
  `,
  
  portfolio_risk_configs: `
    CREATE TABLE IF NOT EXISTS portfolio_risk_configs (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      max_risk_per_trade DECIMAL(5,4) NOT NULL DEFAULT 0.02,
      max_daily_drawdown DECIMAL(5,4) NOT NULL DEFAULT 0.05,
      max_open_positions INTEGER NOT NULL DEFAULT 5,
      max_correlated_positions INTEGER NOT NULL DEFAULT 2,
      min_risk_reward_ratio DECIMAL(5,2) NOT NULL DEFAULT 2.0,
      max_leverage DECIMAL(5,2) NOT NULL DEFAULT 3.0,
      emergency_stop_loss DECIMAL(5,4) NOT NULL DEFAULT 0.10,
      cooldown_period INTEGER NOT NULL DEFAULT 60,
      max_total_exposure DECIMAL(12,2) NOT NULL DEFAULT 100000.0,
      max_single_position_size DECIMAL(12,2) NOT NULL DEFAULT 10000.0,
      max_correlated_exposure DECIMAL(12,2) NOT NULL DEFAULT 50000.0,
      max_daily_loss DECIMAL(12,2) NOT NULL DEFAULT 1000.0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(portfolio_id)
    );
  `,
  
  portfolio_positions: `
    CREATE TABLE IF NOT EXISTS portfolio_positions (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
      amount DECIMAL(18,8) NOT NULL,
      entry_price DECIMAL(18,8) NOT NULL,
      current_price DECIMAL(18,8) NOT NULL,
      unrealized_pnl DECIMAL(18,8) NOT NULL DEFAULT 0,
      realized_pnl DECIMAL(18,8) NOT NULL DEFAULT 0,
      last_update TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(portfolio_id, account_id, symbol)
    );
  `,
  
  portfolio_trades: `
    CREATE TABLE IF NOT EXISTS portfolio_trades (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
      amount DECIMAL(18,8) NOT NULL,
      price DECIMAL(18,8) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      pnl DECIMAL(18,8),
      commission DECIMAL(18,8) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
      order_id VARCHAR(50) NOT NULL
    );
  `,
  
  portfolio_metrics: `
    CREATE TABLE IF NOT EXISTS portfolio_metrics (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      total_equity DECIMAL(18,8) NOT NULL,
      total_unrealized_pnl DECIMAL(18,8) NOT NULL,
      total_realized_pnl DECIMAL(18,8) NOT NULL,
      daily_pnl DECIMAL(18,8) NOT NULL,
      total_return DECIMAL(18,8) NOT NULL,
      total_return_percent DECIMAL(8,4) NOT NULL,
      max_drawdown DECIMAL(8,4) NOT NULL,
      current_drawdown DECIMAL(8,4) NOT NULL,
      sharpe_ratio DECIMAL(8,4) NOT NULL,
      win_rate DECIMAL(8,4) NOT NULL,
      total_trades INTEGER NOT NULL,
      active_positions INTEGER NOT NULL,
      risk_utilization DECIMAL(8,4) NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  
  portfolio_alerts: `
    CREATE TABLE IF NOT EXISTS portfolio_alerts (
      id VARCHAR(50) PRIMARY KEY,
      portfolio_id VARCHAR(50) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `
};

// Data Access Layer (DAL) for portfolio models
export class PortfolioDAL {
  // This would be implemented with an actual database connection
  // For now, we'll use in-memory storage for demonstration
  
  private accounts: AccountModel[] = [];
  private portfolios: PortfolioModel[] = [];
  private portfolioAccounts: PortfolioAccountModel[] = [];
  private portfolioRiskConfigs: PortfolioRiskConfigModel[] = [];
  private portfolioPositions: PortfolioPositionModel[] = [];
  private portfolioTrades: PortfolioTradeModel[] = [];
  private portfolioMetrics: PortfolioMetricsModel[] = [];
  private portfolioAlerts: PortfolioAlertModel[] = [];

  // Account methods
  async createAccount(account: Omit<AccountModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountModel> {
    const newAccount: AccountModel = {
      ...account,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.accounts.push(newAccount);
    return newAccount;
  }

  async getAccount(id: string): Promise<AccountModel | null> {
    return this.accounts.find(a => a.id === id) || null;
  }

  async getAccountsByUser(userId: string): Promise<AccountModel[]> {
    return this.accounts.filter(a => a.userId === userId);
  }

  async updateAccount(id: string, updates: Partial<AccountModel>): Promise<AccountModel | null> {
    const index = this.accounts.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    this.accounts[index] = {
      ...this.accounts[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.accounts[index];
  }

  async deleteAccount(id: string): Promise<boolean> {
    const initialLength = this.accounts.length;
    this.accounts = this.accounts.filter(a => a.id !== id);
    return this.accounts.length < initialLength;
  }

  // Portfolio methods
  async createPortfolio(portfolio: Omit<PortfolioModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<PortfolioModel> {
    const newPortfolio: PortfolioModel = {
      ...portfolio,
      id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.portfolios.push(newPortfolio);
    return newPortfolio;
  }

  async getPortfolio(id: string): Promise<PortfolioModel | null> {
    return this.portfolios.find(p => p.id === id) || null;
  }

  async getPortfoliosByUser(userId: string): Promise<PortfolioModel[]> {
    return this.portfolios.filter(p => p.userId === userId);
  }

  async updatePortfolio(id: string, updates: Partial<PortfolioModel>): Promise<PortfolioModel | null> {
    const index = this.portfolios.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.portfolios[index] = {
      ...this.portfolios[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.portfolios[index];
  }

  async deletePortfolio(id: string): Promise<boolean> {
    const initialLength = this.portfolios.length;
    this.portfolios = this.portfolios.filter(p => p.id !== id);
    return this.portfolios.length < initialLength;
  }

  // Portfolio account methods
  async addAccountToPortfolio(
    portfolioId: string, 
    accountId: string, 
    allocationPercent: number = 100, 
    maxRiskPercent: number = 100
  ): Promise<PortfolioAccountModel> {
    const newPortfolioAccount: PortfolioAccountModel = {
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      portfolioId,
      accountId,
      allocationPercent,
      maxRiskPercent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.portfolioAccounts.push(newPortfolioAccount);
    return newPortfolioAccount;
  }

  async getPortfolioAccounts(portfolioId: string): Promise<PortfolioAccountModel[]> {
    return this.portfolioAccounts.filter(pa => pa.portfolioId === portfolioId);
  }

  async updatePortfolioAccount(
    portfolioId: string, 
    accountId: string, 
    updates: Partial<PortfolioAccountModel>
  ): Promise<PortfolioAccountModel | null> {
    const index = this.portfolioAccounts.findIndex(
      pa => pa.portfolioId === portfolioId && pa.accountId === accountId
    );
    
    if (index === -1) return null;
    
    this.portfolioAccounts[index] = {
      ...this.portfolioAccounts[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.portfolioAccounts[index];
  }

  async removeAccountFromPortfolio(portfolioId: string, accountId: string): Promise<boolean> {
    const initialLength = this.portfolioAccounts.length;
    this.portfolioAccounts = this.portfolioAccounts.filter(
      pa => !(pa.portfolioId === portfolioId && pa.accountId === accountId)
    );
    return this.portfolioAccounts.length < initialLength;
  }

  // Risk config methods
  async createPortfolioRiskConfig(
    portfolioId: string, 
    config: Omit<PortfolioRiskConfigModel, 'id' | 'portfolioId' | 'createdAt' | 'updatedAt'>
  ): Promise<PortfolioRiskConfigModel> {
    const newConfig: PortfolioRiskConfigModel = {
      id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      portfolioId,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.portfolioRiskConfigs.push(newConfig);
    return newConfig;
  }

  async getPortfolioRiskConfig(portfolioId: string): Promise<PortfolioRiskConfigModel | null> {
    return this.portfolioRiskConfigs.find(rc => rc.portfolioId === portfolioId) || null;
  }

  async updatePortfolioRiskConfig(
    portfolioId: string, 
    updates: Partial<PortfolioRiskConfigModel>
  ): Promise<PortfolioRiskConfigModel | null> {
    const index = this.portfolioRiskConfigs.findIndex(rc => rc.portfolioId === portfolioId);
    if (index === -1) return null;
    
    this.portfolioRiskConfigs[index] = {
      ...this.portfolioRiskConfigs[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.portfolioRiskConfigs[index];
  }

  // Position methods
  async upsertPortfolioPosition(position: Omit<PortfolioPositionModel, 'id'>): Promise<PortfolioPositionModel> {
    const existingIndex = this.portfolioPositions.findIndex(
      p => p.portfolioId === position.portfolioId && 
           p.accountId === position.accountId && 
           p.symbol === position.symbol
    );
    
    if (existingIndex >= 0) {
      this.portfolioPositions[existingIndex] = {
        ...this.portfolioPositions[existingIndex],
        ...position,
        lastUpdate: new Date(),
      };
      return this.portfolioPositions[existingIndex];
    } else {
      const newPosition: PortfolioPositionModel = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...position,
        lastUpdate: new Date(),
      };
      this.portfolioPositions.push(newPosition);
      return newPosition;
    }
  }

  async getPortfolioPositions(portfolioId: string): Promise<PortfolioPositionModel[]> {
    return this.portfolioPositions.filter(p => p.portfolioId === portfolioId);
  }

  // Trade methods
  async createPortfolioTrade(trade: Omit<PortfolioTradeModel, 'id'>): Promise<PortfolioTradeModel> {
    const newTrade: PortfolioTradeModel = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...trade,
    };
    
    this.portfolioTrades.push(newTrade);
    return newTrade;
  }

  async getPortfolioTrades(portfolioId: string): Promise<PortfolioTradeModel[]> {
    return this.portfolioTrades.filter(t => t.portfolioId === portfolioId);
  }

  async updateTrade(
    tradeId: string, 
    updates: Partial<PortfolioTradeModel>
  ): Promise<PortfolioTradeModel | null> {
    const index = this.portfolioTrades.findIndex(t => t.id === tradeId);
    if (index === -1) return null;
    
    this.portfolioTrades[index] = {
      ...this.portfolioTrades[index],
      ...updates,
    };
    
    return this.portfolioTrades[index];
  }

  // Metrics methods
  async savePortfolioMetrics(metrics: Omit<PortfolioMetricsModel, 'id'>): Promise<PortfolioMetricsModel> {
    const newMetrics: PortfolioMetricsModel = {
      id: `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...metrics,
    };
    
    this.portfolioMetrics.push(newMetrics);
    return newMetrics;
  }

  async getLatestPortfolioMetrics(portfolioId: string): Promise<PortfolioMetricsModel | null> {
    const metrics = this.portfolioMetrics
      .filter(m => m.portfolioId === portfolioId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return metrics.length > 0 ? metrics[0] : null;
  }

  async getPortfolioMetricsHistory(
    portfolioId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<PortfolioMetricsModel[]> {
    return this.portfolioMetrics
      .filter(m => 
        m.portfolioId === portfolioId && 
        m.timestamp >= startDate && 
        m.timestamp <= endDate
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Alert methods
  async createAlert(alert: Omit<PortfolioAlertModel, 'id'>): Promise<PortfolioAlertModel> {
    const newAlert: PortfolioAlertModel = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
    };
    
    this.portfolioAlerts.push(newAlert);
    return newAlert;
  }

  async getPortfolioAlerts(portfolioId: string, includeRead: boolean = false): Promise<PortfolioAlertModel[]> {
    return this.portfolioAlerts
      .filter(a => a.portfolioId === portfolioId && (includeRead || !a.isRead))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async markAlertAsRead(alertId: string): Promise<boolean> {
    const index = this.portfolioAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return false;
    
    this.portfolioAlerts[index].isRead = true;
    return true;
  }
}