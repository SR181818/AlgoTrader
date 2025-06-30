import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database configuration
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL not set. Please add a PostgreSQL database in Replit Secrets.');
  console.warn('Using in-memory fallback for development.');
}

// Fallback in-memory storage for development
const inMemoryData: any = {
  users: [
    { id: 1, username: 'demo', email: 'demo@example.com' }
  ],
  strategies: [
    {
      id: 1,
      userId: 1,
      name: 'Demo Strategy',
      description: 'Sample trading strategy',
      type: 'trend_following',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      stopLoss: '2',
      takeProfit: '4',
      riskPercentage: '1',
      maxPositions: 1,
      entryConditions: '["RSI < 30", "Price > SMA_20"]',
      exitConditions: '["RSI > 70", "Price < SMA_20"]',
      isActive: false,
      totalTrades: 0,
      winRate: '0',
      pnl: '0',
      maxDrawdown: '0',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  trades: [],
  backtests: [],
  liveSimulationAccounts: [],
  liveSimulationOrders: [],
  liveSimulationPositions: [],
  marketDataCache: [],
  manualTradingBalances: [
    { id: 1, userId: 1, symbol: 'USD', balance: 10000 },
    { id: 2, userId: 1, symbol: 'BTC', balance: 0 },
    { id: 3, userId: 1, symbol: 'ETH', balance: 0 }
  ],
  manualTradingTransactions: []
};

// Create database connection or fallback
let db: any;
let pool: any;

if (databaseUrl) {
  // Use real PostgreSQL database
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle({ client: pool, schema });
  console.log('Connected to PostgreSQL database');
} else {
  // Fallback to in-memory database for development
  pool = {
    query: async (text: string, params?: any[]) => {
      return { rows: inMemoryData.manualTradingBalances || [] };
    }
  };

  db = {
    select() {
      return {
        from: (table: any) => ({
          where: (condition: any) => ({
            limit: (limit: number) => {
              // Return appropriate data based on table type
              if (table === 'strategies') return inMemoryData.strategies || [];
              if (table === 'manualTradingBalances') return inMemoryData.manualTradingBalances || [];
              return [];
            },
            execute: () => {
              if (table === 'strategies') return inMemoryData.strategies || [];
              return [];
            }
          }),
          execute: () => {
            if (table === 'strategies') return inMemoryData.strategies || [];
            return [];
          }
        })
      };
    },

    insert(table: any) {
      return {
        values: (values: any) => {
          const newRecord = { 
            id: Date.now(), 
            createdAt: new Date(), 
            updatedAt: new Date(),
            ...values 
          };
          
          // Determine which table to insert into
          if (table === 'strategies' || !table) {
            if (!inMemoryData.strategies) inMemoryData.strategies = [];
            inMemoryData.strategies.push(newRecord);
          }
          
          return {
            returning: () => [newRecord]
          };
        }
      };
    },

    update(table: any) {
      return {
        set: (values: any) => ({
          where: (condition: any) => ({
            returning: () => []
          })
        })
      };
    },

    delete(table: any) {
      return {
        where: (condition: any) => ({
          returning: () => []
        })
      };
    }
  };
}

export { db, pool };