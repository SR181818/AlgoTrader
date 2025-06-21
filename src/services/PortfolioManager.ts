import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { OrderExecutor, Position, Balance } from '../trading/OrderExecutor';
import { RiskManager, RiskConfig } from '../trading/RiskManager';

export interface Account {
  id: string;
  name: string;
  description?: string;
  exchange: string;
  apiKey?: string;
  apiSecret?: string;
  testnet: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
  riskConfig: RiskConfig;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PortfolioPosition {
  portfolioId: string;
  accountId: string;
  symbol: string;
  side: 'long' | 'short';
  totalAmount: number;
  averageEntryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdate: number;
}

export interface PortfolioMetrics {
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
  riskUtilization: number; // Percentage of risk budget used
  lastUpdate: number;
}

export interface PortfolioAllocation {
  portfolioId: string;
  accountId: string;
  allocationPercent: number; // Percentage of portfolio allocated to this account
  maxRiskPercent: number; // Max risk this account can take
  currentRiskPercent: number; // Current risk utilization
}

export interface PortfolioTrade {
  id: string;
  portfolioId: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  pnl?: number;
  commission: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

export interface PortfolioRiskLimits {
  portfolioId: string;
  maxTotalExposure: number; // Maximum total exposure across all accounts
  maxSinglePositionSize: number; // Maximum size for any single position
  maxCorrelatedExposure: number; // Maximum exposure to correlated assets
  maxDailyLoss: number; // Maximum daily loss threshold
  maxDrawdown: number; // Maximum drawdown threshold
  emergencyStopLoss: number; // Emergency stop loss threshold
}

export class PortfolioManager {
  private accounts = new Map<string, Account>();
  private portfolios = new Map<string, Portfolio>();
  private orderExecutors = new Map<string, OrderExecutor>();
  private riskManagers = new Map<string, RiskManager>();
  private portfolioPositions = new Map<string, PortfolioPosition[]>();
  private portfolioMetrics = new Map<string, PortfolioMetrics>();
  private portfolioAllocations = new Map<string, PortfolioAllocation[]>();
  private portfolioTrades = new Map<string, PortfolioTrade[]>();
  private portfolioRiskLimits = new Map<string, PortfolioRiskLimits>();

  // Observables
  private portfolioUpdates = new Subject<{ portfolioId: string; metrics: PortfolioMetrics }>();
  private positionUpdates = new Subject<{ portfolioId: string; positions: PortfolioPosition[] }>();
  private riskAlerts = new Subject<{ portfolioId: string; alert: string; severity: 'low' | 'medium' | 'high' }>();

  constructor() {
    this.initializeDefaultData();
  }

  /**
   * Account Management
   */
  createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const newAccount: Account = {
      ...account,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.accounts.set(newAccount.id, newAccount);
    
    // Initialize OrderExecutor for this account
    this.initializeAccountExecutor(newAccount);
    
    return newAccount;
  }

  updateAccount(accountId: string, updates: Partial<Account>): Account | null {
    const account = this.accounts.get(accountId);
    if (!account) return null;

    const updatedAccount = {
      ...account,
      ...updates,
      updatedAt: Date.now(),
    };

    this.accounts.set(accountId, updatedAccount);
    
    // Reinitialize executor if exchange settings changed
    if (updates.exchange || updates.apiKey || updates.apiSecret || updates.testnet !== undefined) {
      this.initializeAccountExecutor(updatedAccount);
    }

    return updatedAccount;
  }

  deleteAccount(accountId: string): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return false;

    // Check if account is used in any portfolio
    const portfoliosUsingAccount = Array.from(this.portfolios.values())
      .filter(portfolio => portfolio.accountIds.includes(accountId));

    if (portfoliosUsingAccount.length > 0) {
      throw new Error(`Cannot delete account ${accountId}: used in ${portfoliosUsingAccount.length} portfolio(s)`);
    }

    // Cleanup
    this.accounts.delete(accountId);
    this.orderExecutors.get(accountId)?.dispose();
    this.orderExecutors.delete(accountId);

    return true;
  }

  getAccount(accountId: string): Account | null {
    return this.accounts.get(accountId) || null;
  }

  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Portfolio Management
   */
  createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Portfolio {
    // Validate that all account IDs exist
    portfolio.accountIds.forEach(accountId => {
      if (!this.accounts.has(accountId)) {
        throw new Error(`Account ${accountId} does not exist`);
      }
    });

    const newPortfolio: Portfolio = {
      ...portfolio,
      id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.portfolios.set(newPortfolio.id, newPortfolio);
    
    // Initialize portfolio data structures
    this.portfolioPositions.set(newPortfolio.id, []);
    this.portfolioTrades.set(newPortfolio.id, []);
    this.initializePortfolioMetrics(newPortfolio.id);
    this.initializePortfolioAllocations(newPortfolio.id, portfolio.accountIds);
    this.initializePortfolioRiskLimits(newPortfolio.id);

    // Initialize risk manager for portfolio
    this.riskManagers.set(newPortfolio.id, new RiskManager(portfolio.riskConfig, 0));

    return newPortfolio;
  }

  updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Portfolio | null {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return null;

    // Validate account IDs if being updated
    if (updates.accountIds) {
      updates.accountIds.forEach(accountId => {
        if (!this.accounts.has(accountId)) {
          throw new Error(`Account ${accountId} does not exist`);
        }
      });
    }

    const updatedPortfolio = {
      ...portfolio,
      ...updates,
      updatedAt: Date.now(),
    };

    this.portfolios.set(portfolioId, updatedPortfolio);

    // Update risk manager if risk config changed
    if (updates.riskConfig) {
      const currentMetrics = this.portfolioMetrics.get(portfolioId);
      const balance = currentMetrics?.totalEquity || 0;
      this.riskManagers.set(portfolioId, new RiskManager(updates.riskConfig, balance));
    }

    // Update allocations if account IDs changed
    if (updates.accountIds) {
      this.initializePortfolioAllocations(portfolioId, updates.accountIds);
    }

    return updatedPortfolio;
  }

  deletePortfolio(portfolioId: string): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    // Check for open positions
    const positions = this.portfolioPositions.get(portfolioId) || [];
    const openPositions = positions.filter(pos => pos.totalAmount > 0);
    
    if (openPositions.length > 0) {
      throw new Error(`Cannot delete portfolio ${portfolioId}: has ${openPositions.length} open position(s)`);
    }

    // Cleanup
    this.portfolios.delete(portfolioId);
    this.portfolioPositions.delete(portfolioId);
    this.portfolioMetrics.delete(portfolioId);
    this.portfolioAllocations.delete(portfolioId);
    this.portfolioTrades.delete(portfolioId);
    this.portfolioRiskLimits.delete(portfolioId);
    this.riskManagers.get(portfolioId)?.dispose?.();
    this.riskManagers.delete(portfolioId);

    return true;
  }

  getPortfolio(portfolioId: string): Portfolio | null {
    return this.portfolios.get(portfolioId) || null;
  }

  getAllPortfolios(): Portfolio[] {
    return Array.from(this.portfolios.values());
  }

  /**
   * Portfolio Metrics and PnL Aggregation
   */
  getPortfolioMetrics(portfolioId: string): PortfolioMetrics | null {
    return this.portfolioMetrics.get(portfolioId) || null;
  }

  getPortfolioPositions(portfolioId: string): PortfolioPosition[] {
    return this.portfolioPositions.get(portfolioId) || [];
  }

  getPortfolioTrades(portfolioId: string): PortfolioTrade[] {
    return this.portfolioTrades.get(portfolioId) || [];
  }

  getPortfolioAllocations(portfolioId: string): PortfolioAllocation[] {
    return this.portfolioAllocations.get(portfolioId) || [];
  }

  updatePortfolioAllocation(
    portfolioId: string, 
    accountId: string, 
    allocationPercent: number, 
    maxRiskPercent: number
  ): boolean {
    const allocations = this.portfolioAllocations.get(portfolioId);
    if (!allocations) return false;

    const allocation = allocations.find(a => a.accountId === accountId);
    if (!allocation) return false;

    allocation.allocationPercent = allocationPercent;
    allocation.maxRiskPercent = maxRiskPercent;

    return true;
  }

  /**
   * Risk Management
   */
  getPortfolioRiskLimits(portfolioId: string): PortfolioRiskLimits | null {
    return this.portfolioRiskLimits.get(portfolioId) || null;
  }

  updatePortfolioRiskLimits(portfolioId: string, limits: Partial<PortfolioRiskLimits>): boolean {
    const currentLimits = this.portfolioRiskLimits.get(portfolioId);
    if (!currentLimits) return false;

    const updatedLimits = { ...currentLimits, ...limits };
    this.portfolioRiskLimits.set(portfolioId, updatedLimits);

    return true;
  }

  assessPortfolioRisk(portfolioId: string): {
    approved: boolean;
    riskScore: number;
    warnings: string[];
    restrictions: string[];
  } {
    const portfolio = this.portfolios.get(portfolioId);
    const metrics = this.portfolioMetrics.get(portfolioId);
    const limits = this.portfolioRiskLimits.get(portfolioId);
    
    if (!portfolio || !metrics || !limits) {
      return {
        approved: false,
        riskScore: 100,
        warnings: [],
        restrictions: ['Portfolio data not available']
      };
    }

    const warnings: string[] = [];
    const restrictions: string[] = [];
    let riskScore = 0;

    // Check total exposure
    if (metrics.totalEquity > limits.maxTotalExposure) {
      restrictions.push(`Total exposure (${metrics.totalEquity}) exceeds limit (${limits.maxTotalExposure})`);
      riskScore += 30;
    }

    // Check daily loss
    if (metrics.dailyPnL < -limits.maxDailyLoss) {
      restrictions.push(`Daily loss (${metrics.dailyPnL}) exceeds limit (${limits.maxDailyLoss})`);
      riskScore += 25;
    }

    // Check drawdown
    if (Math.abs(metrics.currentDrawdown) > limits.maxDrawdown) {
      restrictions.push(`Current drawdown (${metrics.currentDrawdown}) exceeds limit (${limits.maxDrawdown})`);
      riskScore += 20;
    }

    // Check emergency stop loss
    if (Math.abs(metrics.currentDrawdown) > limits.emergencyStopLoss) {
      restrictions.push(`Emergency stop loss triggered (${metrics.currentDrawdown})`);
      riskScore += 50;
    }

    // Risk utilization warnings
    if (metrics.riskUtilization > 80) {
      warnings.push(`High risk utilization: ${metrics.riskUtilization}%`);
      riskScore += 15;
    }

    return {
      approved: restrictions.length === 0,
      riskScore: Math.min(riskScore, 100),
      warnings,
      restrictions
    };
  }

  /**
   * Real-time Updates
   */
  startPortfolioMonitoring(portfolioId: string): void {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return;

    // Set up monitoring for each account in the portfolio
    portfolio.accountIds.forEach(accountId => {
      const executor = this.orderExecutors.get(accountId);
      if (executor) {
        // Subscribe to position updates
        executor.getPositionUpdates().subscribe(position => {
          this.updatePortfolioPosition(portfolioId, accountId, position);
        });

        // Subscribe to balance updates
        executor.getBalanceUpdates().subscribe(balance => {
          this.updatePortfolioBalance(portfolioId, accountId, balance);
        });
      }
    });

    // Start periodic metrics calculation
    setInterval(() => {
      this.calculatePortfolioMetrics(portfolioId);
    }, 5000); // Update every 5 seconds
  }

  getPortfolioUpdates(): Observable<{ portfolioId: string; metrics: PortfolioMetrics }> {
    return this.portfolioUpdates.asObservable();
  }

  getPositionUpdates(): Observable<{ portfolioId: string; positions: PortfolioPosition[] }> {
    return this.positionUpdates.asObservable();
  }

  getRiskAlerts(): Observable<{ portfolioId: string; alert: string; severity: 'low' | 'medium' | 'high' }> {
    return this.riskAlerts.asObservable();
  }

  /**
   * Private Helper Methods
   */
  private initializeAccountExecutor(account: Account): void {
    const config = {
      paperTrading: account.testnet,
      exchange: account.exchange as any,
      testnet: account.testnet,
      apiKey: account.apiKey,
      apiSecret: account.apiSecret,
      defaultOrderType: 'market' as const,
      slippageTolerance: 0.1,
      maxOrderSize: 10000,
      enableStopLoss: true,
      enableTakeProfit: true,
    };

    // Dispose existing executor if any
    this.orderExecutors.get(account.id)?.dispose();
    
    // Create new executor
    const executor = new OrderExecutor(config);
    this.orderExecutors.set(account.id, executor);
  }

  private initializePortfolioMetrics(portfolioId: string): void {
    const metrics: PortfolioMetrics = {
      portfolioId,
      totalEquity: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
      dailyPnL: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
      activePositions: 0,
      riskUtilization: 0,
      lastUpdate: Date.now(),
    };

    this.portfolioMetrics.set(portfolioId, metrics);
  }

  private initializePortfolioAllocations(portfolioId: string, accountIds: string[]): void {
    const allocations: PortfolioAllocation[] = accountIds.map(accountId => ({
      portfolioId,
      accountId,
      allocationPercent: 100 / accountIds.length, // Equal allocation by default
      maxRiskPercent: 100 / accountIds.length,
      currentRiskPercent: 0,
    }));

    this.portfolioAllocations.set(portfolioId, allocations);
  }

  private initializePortfolioRiskLimits(portfolioId: string): void {
    const limits: PortfolioRiskLimits = {
      portfolioId,
      maxTotalExposure: 100000, // $100k default
      maxSinglePositionSize: 10000, // $10k default
      maxCorrelatedExposure: 50000, // $50k default
      maxDailyLoss: 1000, // $1k default
      maxDrawdown: 0.1, // 10% default
      emergencyStopLoss: 0.2, // 20% default
    };

    this.portfolioRiskLimits.set(portfolioId, limits);
  }

  private updatePortfolioPosition(portfolioId: string, accountId: string, position: Position): void {
    const positions = this.portfolioPositions.get(portfolioId) || [];
    
    // Find existing position or create new one
    const existingIndex = positions.findIndex(
      p => p.accountId === accountId && p.symbol === position.symbol
    );

    const portfolioPosition: PortfolioPosition = {
      portfolioId,
      accountId,
      symbol: position.symbol,
      side: position.side,
      totalAmount: position.amount,
      averageEntryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      unrealizedPnL: position.unrealizedPnL,
      realizedPnL: position.realizedPnL,
      lastUpdate: Date.now(),
    };

    if (existingIndex >= 0) {
      positions[existingIndex] = portfolioPosition;
    } else {
      positions.push(portfolioPosition);
    }

    this.portfolioPositions.set(portfolioId, positions);
    this.positionUpdates.next({ portfolioId, positions });
  }

  private updatePortfolioBalance(portfolioId: string, accountId: string, balance: Balance): void {
    // Update portfolio metrics based on balance changes
    this.calculatePortfolioMetrics(portfolioId);
  }

  private calculatePortfolioMetrics(portfolioId: string): void {
    const portfolio = this.portfolios.get(portfolioId);
    const positions = this.portfolioPositions.get(portfolioId) || [];
    const trades = this.portfolioTrades.get(portfolioId) || [];
    
    if (!portfolio) return;

    let totalEquity = 0;
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;

    // Calculate equity from all accounts
    portfolio.accountIds.forEach(accountId => {
      const executor = this.orderExecutors.get(accountId);
      if (executor) {
        const balance = executor.getCurrentBalance();
        const usdtBalance = balance.USDT?.total || 0;
        totalEquity += usdtBalance;
      }
    });

    // Calculate unrealized PnL from positions
    totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);

    // Calculate realized PnL from trades
    totalRealizedPnL = trades
      .filter(trade => trade.pnl !== undefined)
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0);

    // Calculate other metrics
    const totalTrades = trades.filter(trade => trade.status === 'filled').length;
    const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const activePositions = positions.filter(pos => pos.totalAmount > 0).length;

    // Calculate daily PnL (simplified - would need proper time tracking in production)
    const dailyPnL = totalRealizedPnL; // Simplified

    // Calculate total return
    const initialBalance = 10000; // Would track this properly in production
    const totalReturn = totalEquity - initialBalance;
    const totalReturnPercent = (totalReturn / initialBalance) * 100;

    // Calculate drawdown (simplified)
    const peakEquity = Math.max(totalEquity, initialBalance);
    const currentDrawdown = (totalEquity - peakEquity) / peakEquity;

    // Calculate risk utilization
    const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.totalAmount * pos.currentPrice), 0);
    const riskUtilization = totalEquity > 0 ? (totalExposure / totalEquity) * 100 : 0;

    const metrics: PortfolioMetrics = {
      portfolioId,
      totalEquity,
      totalUnrealizedPnL,
      totalRealizedPnL,
      dailyPnL,
      totalReturn,
      totalReturnPercent,
      maxDrawdown: 0, // Would track properly in production
      currentDrawdown,
      sharpeRatio: 0, // Would calculate properly in production
      winRate,
      totalTrades,
      activePositions,
      riskUtilization,
      lastUpdate: Date.now(),
    };

    this.portfolioMetrics.set(portfolioId, metrics);
    this.portfolioUpdates.next({ portfolioId, metrics });

    // Check for risk alerts
    this.checkRiskAlerts(portfolioId, metrics);
  }

  private checkRiskAlerts(portfolioId: string, metrics: PortfolioMetrics): void {
    const limits = this.portfolioRiskLimits.get(portfolioId);
    if (!limits) return;

    // High risk utilization
    if (metrics.riskUtilization > 90) {
      this.riskAlerts.next({
        portfolioId,
        alert: `High risk utilization: ${metrics.riskUtilization.toFixed(1)}%`,
        severity: 'high'
      });
    }

    // Large drawdown
    if (Math.abs(metrics.currentDrawdown) > limits.maxDrawdown * 0.8) {
      this.riskAlerts.next({
        portfolioId,
        alert: `Approaching maximum drawdown: ${(metrics.currentDrawdown * 100).toFixed(1)}%`,
        severity: 'medium'
      });
    }

    // Daily loss approaching limit
    if (metrics.dailyPnL < -limits.maxDailyLoss * 0.8) {
      this.riskAlerts.next({
        portfolioId,
        alert: `Daily loss approaching limit: $${metrics.dailyPnL.toFixed(2)}`,
        severity: 'medium'
      });
    }
  }

  private initializeDefaultData(): void {
    // Create default demo account
    const demoAccount = this.createAccount({
      name: 'Demo Account',
      description: 'Paper trading demo account',
      exchange: 'binance',
      testnet: true,
      isActive: true,
    });

    // Create default portfolio
    this.createPortfolio({
      name: 'Default Portfolio',
      description: 'Default trading portfolio',
      accountIds: [demoAccount.id],
      riskConfig: {
        maxRiskPerTrade: 0.02,
        maxDailyDrawdown: 0.05,
        maxOpenPositions: 5,
        maxCorrelatedPositions: 2,
        minRiskRewardRatio: 2,
        maxLeverage: 3,
        emergencyStopLoss: 0.10,
        cooldownPeriod: 60,
      },
      isActive: true,
    });
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.orderExecutors.forEach(executor => executor.dispose());
    this.orderExecutors.clear();
    this.riskManagers.clear();
    this.portfolioUpdates.complete();
    this.positionUpdates.complete();
    this.riskAlerts.complete();
  }
}