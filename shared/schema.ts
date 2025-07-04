import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  algorandAddress: text("algorand_address").unique(),
  binanceApiKey: text("binance_api_key"),
  binanceApiSecret: text("binance_api_secret"),
  isPaidUser: boolean("is_paid_user").notNull().default(false),
  aiEnabled: boolean("ai_enabled").notNull().default(false),
  portfolioData: text("portfolio_data"), // JSON string
  loginType: text("login_type").notNull().default("traditional"), // 'traditional' or 'algorand'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// Manual Trading Asset Balances
export const manualTradingBalances = pgTable("manual_trading_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  currency: text("currency").notNull(), // BTC, ETH, USDT, etc.
  balance: numeric("balance", { precision: 18, scale: 8 }).notNull().default("0"),
  lockedBalance: numeric("locked_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const manualTradingTransactions = pgTable("manual_trading_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tradeId: text("trade_id").notNull(),
  currency: text("currency").notNull(),
  type: text("type").notNull(), // 'debit', 'credit'
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 18, scale: 8 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Live Trading Simulation Tables
export const liveSimulationAccounts = pgTable("live_simulation_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountName: text("account_name").notNull(),
  initialBalance: numeric("initial_balance", { precision: 18, scale: 8 }).notNull().default("10000"),
  currentBalance: numeric("current_balance", { precision: 18, scale: 8 }).notNull().default("10000"),
  totalPnL: numeric("total_pnl", { precision: 18, scale: 8 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  winRate: numeric("win_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liveSimulationOrders = pgTable("live_simulation_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => liveSimulationAccounts.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' | 'sell'
  orderType: text("order_type").notNull(), // 'market' | 'limit' | 'stop'
  amount: text("amount").notNull(),
  price: text("price"),
  stopPrice: text("stop_price"),
  status: text("status").notNull().default("pending"), // 'pending' | 'filled' | 'cancelled' | 'rejected'
  filledQuantity: text("filled_quantity").notNull().default("0"),
  filledPrice: text("filled_price"),
  fees: text("fees").notNull().default("0"),
  pnl: text("pnl"),
  strategyId: integer("strategy_id").references(() => strategies.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  filledAt: timestamp("filled_at"),
});

export const liveSimulationPositions = pgTable("live_simulation_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => liveSimulationAccounts.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' | 'sell'
  amount: text("amount").notNull(),
  entryPrice: text("entry_price").notNull(),
  exitPrice: text("exit_price"),
  exitTime: timestamp("exit_time"),
  status: text("status").notNull().default("open"), // 'open' | 'closed'
  unrealizedPnL: text("unrealized_pnl").notNull().default("0"),
  realizedPnL: text("realized_pnl").notNull().default("0"),
  strategyId: integer("strategy_id").references(() => strategies.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketDataCache = pgTable("market_data_cache", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  volume: numeric("volume", { precision: 18, scale: 8 }).notNull(),
  change24h: numeric("change_24h", { precision: 8, scale: 4 }).notNull(),
  high24h: numeric("high_24h", { precision: 18, scale: 8 }).notNull(),
  low24h: numeric("low_24h", { precision: 18, scale: 8 }).notNull(),
  lastUpdate: timestamp("last_update").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' | 'sell'
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  pnl: numeric("pnl", { precision: 18, scale: 8 }).default("0"),
  status: text("status").default("open"), // 'open' | 'closed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const backtests = pgTable("backtests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  strategyName: text("strategy_name").notNull(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalReturn: numeric("total_return", { precision: 10, scale: 4 }),
  sharpeRatio: numeric("sharpe_ratio", { precision: 10, scale: 4 }),
  maxDrawdown: numeric("max_drawdown", { precision: 10, scale: 4 }),
  winRate: numeric("win_rate", { precision: 10, scale: 4 }),
  results: text("results"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPortfolios = pgTable("user_portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  portfolioConfig: text("portfolio_config"), // JSON string with complete portfolio state
  totalValue: numeric("total_value", { precision: 18, scale: 8 }).default("0"),
  totalPnL: numeric("total_pnl", { precision: 18, scale: 8 }).default("0"),
  totalPnLPercent: numeric("total_pnl_percent", { precision: 10, scale: 4 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'trend_following' | 'mean_reversion' | 'momentum' | 'custom'
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  stopLoss: numeric("stop_loss", { precision: 10, scale: 4 }),
  takeProfit: numeric("take_profit", { precision: 10, scale: 4 }),
  riskPercentage: numeric("risk_percentage", { precision: 10, scale: 4 }),
  maxPositions: integer("max_positions").default(1),
  entryConditions: text("entry_conditions"), // JSON string
  exitConditions: text("exit_conditions"), // JSON string
  strategyConfig: text("strategy_config"), // Complete strategy configuration JSON
  isActive: boolean("is_active").default(false),
  totalTrades: integer("total_trades").default(0),
  winRate: numeric("win_rate", { precision: 10, scale: 4 }).default("0"),
  pnl: numeric("pnl", { precision: 18, scale: 8 }).default("0"),
  maxDrawdown: numeric("max_drawdown", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const livePositions = pgTable('live_positions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  strategyId: integer('strategy_id').references(() => strategies.id),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  size: numeric('size', { precision: 20, scale: 8 }).notNull(),
  entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
  currentPrice: numeric('current_price', { precision: 20, scale: 8 }).notNull(),
  pnl: numeric('pnl', { precision: 20, scale: 8 }).default('0'),
  pnlPercent: numeric('pnl_percent', { precision: 10, scale: 4 }).default('0'),
  orderId: text('order_id'),
  isLive: boolean('is_live').default(false),
  status: text('status').default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const liveTrades = pgTable('live_trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  strategyId: integer('strategy_id').references(() => strategies.id),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
  price: numeric('price', { precision: 20, scale: 8 }).notNull(),
  orderId: text('order_id'),
  status: text('status').default('filled'),
  isLive: boolean('is_live').default(false),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

export const algorandPayments = pgTable("algorand_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  transactionId: text("transaction_id").unique().notNull(),
  algorandAddress: text("algorand_address").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  planType: text("plan_type").notNull(), // 'ai'
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'failed'
  blockHeight: integer("block_height"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

// Live Simulation Types
export const insertLiveSimulationAccountSchema = createInsertSchema(liveSimulationAccounts);
export const selectLiveSimulationAccountSchema = createSelectSchema(liveSimulationAccounts);
export type InsertLiveSimulationAccount = z.infer<typeof insertLiveSimulationAccountSchema>;
export type LiveSimulationAccount = z.infer<typeof selectLiveSimulationAccountSchema>;

export const insertLiveSimulationOrderSchema = createInsertSchema(liveSimulationOrders);
export const selectLiveSimulationOrderSchema = createSelectSchema(liveSimulationOrders);
export type InsertLiveSimulationOrder = z.infer<typeof insertLiveSimulationOrderSchema>;
export type LiveSimulationOrder = z.infer<typeof selectLiveSimulationOrderSchema>;

export const insertLiveSimulationPositionSchema = createInsertSchema(liveSimulationPositions);
export const selectLiveSimulationPositionSchema = createSelectSchema(liveSimulationPositions);
export type InsertLiveSimulationPosition = z.infer<typeof insertLiveSimulationPositionSchema>;
export type LiveSimulationPosition = z.infer<typeof selectLiveSimulationPositionSchema>;

export const insertMarketDataCacheSchema = createInsertSchema(marketDataCache);
export const selectMarketDataCacheSchema = createSelectSchema(marketDataCache);
export type InsertMarketDataCache = z.infer<typeof insertMarketDataCacheSchema>;
export type MarketDataCache = z.infer<typeof selectMarketDataCacheSchema>;

export const insertTradeSchema = createInsertSchema(trades);
export const selectTradeSchema = createSelectSchema(trades);
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = z.infer<typeof selectTradeSchema>;

export const insertBacktestSchema = createInsertSchema(backtests);
export const selectBacktestSchema = createSelectSchema(backtests);
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type Backtest = z.infer<typeof selectBacktestSchema>;

export const insertUserPortfolioSchema = createInsertSchema(userPortfolios);
export const selectUserPortfolioSchema = createSelectSchema(userPortfolios);
export type InsertUserPortfolio = z.infer<typeof insertUserPortfolioSchema>;
export type UserPortfolio = z.infer<typeof selectUserPortfolioSchema>;

export const insertStrategySchema = createInsertSchema(strategies);
export const selectStrategySchema = createSelectSchema(strategies);
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = z.infer<typeof selectStrategySchema>;

export const insertAlgorandPaymentSchema = createInsertSchema(algorandPayments);
export const selectAlgorandPaymentSchema = createSelectSchema(algorandPayments);
export type InsertAlgorandPayment = z.infer<typeof insertAlgorandPaymentSchema>;
export type AlgorandPayment = z.infer<typeof selectAlgorandPaymentSchema>;