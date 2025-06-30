
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Database configuration - prioritize Replit DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!databaseUrl) {
  console.warn('SUPABASE_DB_URL or DATABASE_URL not set. Please add a PostgreSQL database in Replit Secrets.');
  console.warn('Using in-memory fallback for development.');
}

// Fallback in-memory storage for development
const inMemoryData: any = {
  users: [
    { 
      id: 1, 
      username: 'demo', 
      email: 'demo@example.com',
      binanceApiKey: null,
      binanceApiSecret: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
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
  livePositions: [],
  liveTrades: [],
  manualTradingBalances: [
    { id: 1, userId: 1, symbol: 'USD', balance: 10000 },
    { id: 2, userId: 1, symbol: 'BTC', balance: 0 },
    { id: 3, userId: 1, symbol: 'ETH', balance: 0 }
  ]
};

// Create Supabase client for additional features
let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Create database connection or fallback
let db: any;
let pool: any;

if (databaseUrl) {
  // Use Supabase PostgreSQL database
  const client = postgres(databaseUrl, {
    ssl: 'require',
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  db = drizzle(client, { schema });
  pool = client;
  console.log('Connected to Supabase PostgreSQL database');
} else {
  // Fallback to in-memory database for development
  pool = {
    query: async (text: string, params?: any[]) => {
      // Parse the query to determine what data to return
      if (text.includes('strategies')) {
        return { rows: inMemoryData.strategies || [] };
      }
      if (text.includes('live_positions')) {
        return { rows: inMemoryData.livePositions || [] };
      }
      if (text.includes('live_trades')) {
        return { rows: inMemoryData.liveTrades || [] };
      }
      if (text.includes('users')) {
        return { rows: inMemoryData.users || [] };
      }
      return { rows: [] };
    }
  };

  db = {
    select() {
      return {
        from: (table: any) => ({
          where: (condition: any) => ({
            limit: (limit: number) => {
              // Return appropriate data based on table type
              if (table.name === 'strategies' || table === 'strategies') return inMemoryData.strategies || [];
              if (table.name === 'users' || table === 'users') return inMemoryData.users || [];
              if (table.name === 'livePositions' || table === 'livePositions') return inMemoryData.livePositions || [];
              if (table.name === 'liveTrades' || table === 'liveTrades') return inMemoryData.liveTrades || [];
              return [];
            },
            execute: () => {
              if (table.name === 'strategies' || table === 'strategies') return inMemoryData.strategies || [];
              if (table.name === 'users' || table === 'users') return inMemoryData.users || [];
              if (table.name === 'livePositions' || table === 'livePositions') return inMemoryData.livePositions || [];
              if (table.name === 'liveTrades' || table === 'liveTrades') return inMemoryData.liveTrades || [];
              return [];
            }
          }),
          execute: () => {
            if (table.name === 'strategies' || table === 'strategies') return inMemoryData.strategies || [];
            if (table.name === 'users' || table === 'users') return inMemoryData.users || [];
            if (table.name === 'livePositions' || table === 'livePositions') return inMemoryData.livePositions || [];
            if (table.name === 'liveTrades' || table === 'liveTrades') return inMemoryData.liveTrades || [];
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
          if (table.name === 'strategies' || table === 'strategies') {
            if (!inMemoryData.strategies) inMemoryData.strategies = [];
            inMemoryData.strategies.push(newRecord);
          } else if (table.name === 'livePositions' || table === 'livePositions') {
            if (!inMemoryData.livePositions) inMemoryData.livePositions = [];
            inMemoryData.livePositions.push(newRecord);
          } else if (table.name === 'liveTrades' || table === 'liveTrades') {
            if (!inMemoryData.liveTrades) inMemoryData.liveTrades = [];
            inMemoryData.liveTrades.push(newRecord);
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
            returning: () => {
              // Update in-memory data
              const tableName = table.name || table;
              if (tableName === 'strategies') {
                const strategy = inMemoryData.strategies?.find((s: any) => s.id === values.id);
                if (strategy) {
                  Object.assign(strategy, values, { updatedAt: new Date() });
                  return [strategy];
                }
              }
              return [];
            }
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
  
  console.log('Using in-memory database fallback');
}

// Raw SQL query function for direct database access
export const query = async (text: string, params?: any[]) => {
  try {
    if (pool && typeof pool === 'function') {
      // postgres-js client
      const result = await pool.unsafe(text, params || []);
      return { rows: result };
    } else if (pool && pool.query) {
      // Traditional pool query
      const result = await pool.query(text, params);
      return result;
    } else {
      // Fallback for in-memory
      return { rows: [] };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export { db, pool, supabase };
