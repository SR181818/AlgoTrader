
import { Router } from "express";
import { db } from "./db";
import { liveSimulationAccounts, liveSimulationOrders, liveSimulationPositions, marketDataCache } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { BinanceMarketData } from "../client/src/services/BinanceMarketData";

const router = Router();
const binanceData = new BinanceMarketData();

// Get or create simulation account
router.get("/account/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  let account = await db.select()
    .from(liveSimulationAccounts)
    .where(eq(liveSimulationAccounts.userId, userId))
    .limit(1);

  if (account.length === 0) {
    // Create default account
    const newAccount = await db.insert(liveSimulationAccounts)
      .values({
        userId,
        accountName: "Live Simulation Account",
        initialBalance: "10000",
        currentBalance: "10000",
      })
      .returning();
    
    account = newAccount;
  }

  res.json({ account: account[0] });
});

// Place order
router.post("/orders", async (req, res) => {
  const { accountId, symbol, side, type, quantity, price, stopPrice } = req.body;

  // Get current market price
  let currentPrice = price;
  if (type === "market" || !price) {
    try {
      const marketData = await binanceData.getCurrentPrice(symbol);
      currentPrice = marketData;
    } catch (error) {
      currentPrice = price || 50000; // Fallback price
    }
  }

  // Create order
  const newOrder = await db.insert(liveSimulationOrders)
    .values({
      accountId: parseInt(accountId),
      symbol,
      side,
      type,
      quantity: quantity.toString(),
      price: price?.toString(),
      stopPrice: stopPrice?.toString(),
      status: type === "market" ? "filled" : "pending",
      filledQuantity: type === "market" ? quantity.toString() : "0",
      filledPrice: type === "market" ? currentPrice.toString() : undefined,
      fees: (quantity * currentPrice * 0.001).toString(), // 0.1% fee
      filledAt: type === "market" ? new Date() : undefined,
    })
    .returning();

  if (type === "market") {
    // Update position and balance
    await processOrderFill(newOrder[0], currentPrice);
  }

  res.json({ order: newOrder[0] });
});

// Get orders
router.get("/orders/:accountId", async (req, res) => {
  const accountId = parseInt(req.params.accountId);
  
  const orders = await db.select()
    .from(liveSimulationOrders)
    .where(eq(liveSimulationOrders.accountId, accountId))
    .orderBy(desc(liveSimulationOrders.createdAt))
    .limit(50);

  res.json({ orders });
});

// Get positions
router.get("/positions/:accountId", async (req, res) => {
  const accountId = parseInt(req.params.accountId);
  
  const positions = await db.select()
    .from(liveSimulationPositions)
    .where(and(
      eq(liveSimulationPositions.accountId, accountId),
      eq(liveSimulationPositions.isOpen, true)
    ));

  res.json({ positions });
});

// Update market prices (called periodically)
router.post("/update-prices", async (req, res) => {
  const symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "SOLUSDT", "DOGEUSDT"];
  
  for (const symbol of symbols) {
    try {
      const ticker = await binanceData.getTicker(symbol);
      
      // Update cache
      await db.insert(marketDataCache)
        .values({
          symbol,
          price: ticker.price.toString(),
          volume: ticker.volume.toString(),
          change24h: ticker.change.toString(),
          high24h: ticker.price.toString(), // Use price as fallback
          low24h: ticker.price.toString(), // Use price as fallback
        })
        .onConflictDoUpdate({
          target: marketDataCache.symbol,
          set: {
            price: ticker.price.toString(),
            volume: ticker.volume.toString(),
            change24h: ticker.change.toString(),
            high24h: ticker.price.toString(), // Use price as fallback
            low24h: ticker.price.toString(), // Use price as fallback
            lastUpdate: new Date(),
          },
        });

      // Update open positions
      await updatePositionsPnL(symbol, ticker.price);
      
    } catch (error) {
      console.error(`Failed to update price for ${symbol}:`, error);
    }
  }

  res.json({ success: true });
});

// Cancel order
router.delete("/orders/:orderId", async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  
  await db.update(liveSimulationOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(liveSimulationOrders.id, orderId));

  res.json({ success: true });
});

async function processOrderFill(order: any, fillPrice: number) {
  const accountId = order.accountId;
  const symbol = order.symbol;
  const side = order.side;
  const quantity = parseFloat(order.quantity);
  
  // Update account balance
  const account = await db.select()
    .from(liveSimulationAccounts)
    .where(eq(liveSimulationAccounts.id, accountId))
    .limit(1);

  if (account.length === 0) return;

  const currentBalance = parseFloat(account[0].currentBalance);
  const tradeValue = quantity * fillPrice;
  const fees = parseFloat(order.fees);

  let newBalance = currentBalance;
  if (side === "buy") {
    newBalance -= (tradeValue + fees);
  } else {
    newBalance += (tradeValue - fees);
  }

  await db.update(liveSimulationAccounts)
    .set({ 
      currentBalance: newBalance.toString(),
      totalTrades: account[0].totalTrades + 1,
      updatedAt: new Date()
    })
    .where(eq(liveSimulationAccounts.id, accountId));

  // Update position
  const existingPosition = await db.select()
    .from(liveSimulationPositions)
    .where(and(
      eq(liveSimulationPositions.accountId, accountId),
      eq(liveSimulationPositions.symbol, symbol),
      eq(liveSimulationPositions.isOpen, true)
    ))
    .limit(1);

  if (existingPosition.length === 0) {
    // Create new position
    await db.insert(liveSimulationPositions)
      .values({
        accountId,
        symbol,
        side: side === "buy" ? "long" : "short",
        quantity: quantity.toString(),
        entryPrice: fillPrice.toString(),
        currentPrice: fillPrice.toString(),
      });
  } else {
    // Update existing position
    const pos = existingPosition[0];
    const posQuantity = parseFloat(pos.quantity);
    const posEntryPrice = parseFloat(pos.entryPrice);

    if ((side === "buy" && pos.side === "long") || (side === "sell" && pos.side === "short")) {
      // Add to position
      const newQuantity = posQuantity + quantity;
      const newEntryPrice = (posQuantity * posEntryPrice + quantity * fillPrice) / newQuantity;
      
      await db.update(liveSimulationPositions)
        .set({
          quantity: newQuantity.toString(),
          entryPrice: newEntryPrice.toString(),
          updatedAt: new Date()
        })
        .where(eq(liveSimulationPositions.id, pos.id));
    } else {
      // Reduce position
      if (quantity >= posQuantity) {
        // Close position
        await db.update(liveSimulationPositions)
          .set({
            isOpen: false,
            closedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(liveSimulationPositions.id, pos.id));
      } else {
        // Partial close
        await db.update(liveSimulationPositions)
          .set({
            quantity: (posQuantity - quantity).toString(),
            updatedAt: new Date()
          })
          .where(eq(liveSimulationPositions.id, pos.id));
      }
    }
  }
}

async function updatePositionsPnL(symbol: string, currentPrice: number) {
  const positions = await db.select()
    .from(liveSimulationPositions)
    .where(and(
      eq(liveSimulationPositions.symbol, symbol),
      eq(liveSimulationPositions.isOpen, true)
    ));

  for (const position of positions) {
    const entryPrice = parseFloat(position.entryPrice);
    const quantity = parseFloat(position.quantity);
    
    let unrealizedPnL = 0;
    if (position.side === "long") {
      unrealizedPnL = (currentPrice - entryPrice) * quantity;
    } else {
      unrealizedPnL = (entryPrice - currentPrice) * quantity;
    }

    await db.update(liveSimulationPositions)
      .set({
        currentPrice: currentPrice.toString(),
        unrealizedPnL: unrealizedPnL.toString(),
        updatedAt: new Date()
      })
      .where(eq(liveSimulationPositions.id, position.id));
  }
}

export default router;
