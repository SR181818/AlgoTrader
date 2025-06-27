
import { config } from "dotenv";
config();

import type { Express } from "express";
import authRoutes from "./authRoutes";
import liveSimulationRoutes from "./liveSimulationRoutes";

export function registerRoutes(app: Express) {
  // Mock auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (username && password) {
      return res.json({
        success: true,
        token: "mock_token_" + Date.now(),
        user: {
          id: 1,
          username,
          tier: "ai",
          active: true
        }
      });
    }
    
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;
    
    if (username && email && password) {
      return res.json({
        success: true,
        message: "User registered successfully",
        user: {
          id: Date.now(),
          username,
          email,
          tier: "free",
          active: true
        }
      });
    }
    
    return res.status(400).json({ success: false, message: "Missing required fields" });
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (token) {
      return res.json({
        success: true,
        user: {
          id: 1,
          username: "demo_user",
          tier: "ai",
          active: true
        }
      });
    }
    
    return res.status(401).json({ success: false, message: "Unauthorized" });
  });

  app.post("/api/auth/logout", async (req, res) => {
    return res.json({ success: true, message: "Logged out successfully" });
  });

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

  return app;
}
