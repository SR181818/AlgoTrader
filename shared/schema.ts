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
  accountId: integer("account_id").references(() => liveSimulationAccounts.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' | 'sell'
  type: text("type").notNull(), // 'market' | 'limit' | 'stop'
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  price: numeric("price", { precision: 18, scale: 8 }),
  stopPrice: numeric("stop_price", { precision: 18, scale: 8 }),
  status: text("status").notNull().default("pending"), // 'pending' | 'filled' | 'cancelled' | 'rejected'
  filledQuantity: numeric("filled_quantity", { precision: 18, scale: 8 }).notNull().default("0"),
  filledPrice: numeric("filled_price", { precision: 18, scale: 8 }),
  fees: numeric("fees", { precision: 18, scale: 8 }).notNull().default("0"),
  pnl: numeric("pnl", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  filledAt: timestamp("filled_at"),
});

export const liveSimulationPositions = pgTable("live_simulation_positions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => liveSimulationAccounts.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'long' | 'short'
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  entryPrice: numeric("entry_price", { precision: 18, scale: 8 }).notNull(),
  currentPrice: numeric("current_price", { precision: 18, scale: 8 }).notNull(),
  unrealizedPnL: numeric("unrealized_pnl", { precision: 18, scale: 8 }).notNull().default("0"),
  realizedPnL: numeric("realized_pnl", { precision: 18, scale: 8 }).notNull().default("0"),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
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