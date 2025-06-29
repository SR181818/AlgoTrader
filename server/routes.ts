
import { config } from "dotenv";
config();

import type { Express } from "express";
import { createServer } from "http";
import authRoutes from "./authRoutes";
import tradingRoutes from "./tradingRoutes";
import settingsRoutes from "./settingsRoutes";
import liveSimulationRoutes from "./liveSimulationRoutes";
import liveStrategyRoutes from "./liveStrategyRoutes";
import manualTradingRoutes from "./manualTradingRoutes";

export function registerRoutes(app: Express) {
  // Authentication routes
  app.use("/api/auth", authRoutes);
  
  // Trading routes (protected)
  app.use("/api/trading", tradingRoutes);
  
  // Settings routes (protected)
  app.use("/api/settings", settingsRoutes);
  
  // Live trading strategy routes
  app.use("/api/trading", liveStrategyRoutes);
  
  // Manual trading routes
  app.use("/api/manual-trading", manualTradingRoutes);

  // Live simulation endpoints
  app.post("/api/live-simulation/account", async (req, res) => {
    const { userId, initialBalance = 10000 } = req.body;
    
    const account = {
      id: Date.now(),
      userId,
      balance: initialBalance,
      equity: initialBalance,
      marginUsed: 0,
      freeMargin: initialBalance,
      unrealizedPnl: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return res.json({ success: true, account });
  });

  app.get("/api/live-simulation/account/:userId", async (req, res) => {
    const { userId } = req.params;
    
    const account = {
      id: 1,
      userId: parseInt(userId),
      balance: 10000,
      equity: 10000,
      marginUsed: 0,
      freeMargin: 10000,
      unrealizedPnl: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return res.json({ success: true, account });
  });

  app.get("/api/live-simulation/orders/:userId", async (req, res) => {
    const { userId } = req.params;
    
    return res.json({ success: true, orders: [] });
  });

  app.get("/api/live-simulation/positions/:userId", async (req, res) => {
    const { userId } = req.params;
    
    return res.json({ success: true, positions: [] });
  });

  app.post("/api/live-simulation/orders", async (req, res) => {
    const { userId, symbol, side, type, quantity, price } = req.body;
    
    const order = {
      id: Date.now(),
      userId,
      symbol,
      side,
      type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      status: 'filled',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return res.json({ success: true, order });
  });

  app.get("/api/live-simulation/market-data/:symbol", async (req, res) => {
    const { symbol } = req.params;
    
    // Mock market data
    const basePrice = symbol.includes('BTC') ? 45000 : 
                     symbol.includes('ETH') ? 3000 : 
                     symbol.includes('ADA') ? 0.5 : 
                     symbol.includes('SOL') ? 100 : 0.1;
    
    const marketData = {
      symbol,
      price: basePrice + (Math.random() - 0.5) * basePrice * 0.02,
      change24h: (Math.random() - 0.5) * 10,
      volume: Math.random() * 1000000
    };
    
    return res.json({ success: true, marketData });
  });

  return createServer(app);
}
