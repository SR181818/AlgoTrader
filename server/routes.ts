import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, loginType } = req.body;
      
      if (loginType === "traditional") {
        if (!username || !password) {
          return res.status(400).json({ error: "Username and password required" });
        }

        const user = await storage.getUserByUsername(username);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // For demo, accept any password (in production, use bcrypt)
        const token = `token_${user.id}_${Date.now()}`;
        await storage.updateLastLogin(user.id);
        
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email,
            loginType: user.loginType 
          } 
        });
      } else {
        res.status(400).json({ error: "Invalid login type" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/algorand-login", async (req, res) => {
    try {
      const { algorandAddress } = req.body;
      
      if (!algorandAddress) {
        return res.status(400).json({ error: "Algorand address required" });
      }

      let user = await storage.getUserByAlgorandAddress(algorandAddress);
      
      if (!user) {
        // Create new user with Algorand address
        user = await storage.createUser({
          algorandAddress,
          loginType: "algorand",
          username: `algo_${algorandAddress.slice(-8)}`
        });
      }

      await storage.updateLastLogin(user.id);
      
      const token = `token_${user.id}_${Date.now()}`;
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          algorandAddress: user.algorandAddress,
          loginType: user.loginType 
        } 
      });
    } catch (error) {
      console.error("Algorand login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "Email already exists" });
      }

      const newUser = await storage.createUser({
        username,
        email,
        password, // In production, hash this
        loginType: "traditional"
      });

      const token = `token_${newUser.id}_${Date.now()}`;
      
      res.status(201).json({ 
        token, 
        user: { 
          id: newUser.id, 
          username: newUser.username, 
          email: newUser.email,
          loginType: newUser.loginType 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
