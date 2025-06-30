import { 
  users, 
  strategies,
  liveSimulationOrders,
  liveSimulationPositions,
  manualTradingBalances,
  type User, 
  type InsertUser,
  type Strategy,
  type InsertStrategy,
  type LiveSimulationOrder,
  type InsertLiveSimulationOrder,
  type LiveSimulationPosition,
  type InsertLiveSimulationPosition
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAlgorandAddress(address: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateLastLogin(id: number): Promise<void>;
  
  // Strategy management
  getStrategies(userId: number): Promise<Strategy[]>;
  getStrategy(id: number): Promise<Strategy | undefined>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: number, updates: Partial<Strategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: number): Promise<boolean>;
  
  // Order management
  getOrders(userId: number): Promise<LiveSimulationOrder[]>;
  getOrder(id: number): Promise<LiveSimulationOrder | undefined>;
  createOrder(order: InsertLiveSimulationOrder): Promise<LiveSimulationOrder>;
  updateOrder(id: number, updates: Partial<LiveSimulationOrder>): Promise<LiveSimulationOrder | undefined>;
  
  // Position management
  getPositions(userId: number): Promise<LiveSimulationPosition[]>;
  getPosition(id: number): Promise<LiveSimulationPosition | undefined>;
  createPosition(position: InsertLiveSimulationPosition): Promise<LiveSimulationPosition>;
  updatePosition(id: number, updates: Partial<LiveSimulationPosition>): Promise<LiveSimulationPosition | undefined>;
  closePosition(id: number, exitPrice: number, exitTime: Date): Promise<LiveSimulationPosition | undefined>;
  
  // Balance management
  getBalances(userId: number): Promise<any[]>;
  updateBalance(userId: number, currency: string, newBalance: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByAlgorandAddress(address: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.algorandAddress, address));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by Algorand address:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Strategy management
  async getStrategies(userId: number): Promise<Strategy[]> {
    try {
      const result = await db.select().from(strategies).where(eq(strategies.userId, userId));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting strategies:', error);
      return [];
    }
  }

  async getStrategy(id: number): Promise<Strategy | undefined> {
    try {
      const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id));
      return strategy || undefined;
    } catch (error) {
      console.error('Error getting strategy:', error);
      return undefined;
    }
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const [newStrategy] = await db.insert(strategies).values(strategy).returning();
    return newStrategy;
  }

  async updateStrategy(id: number, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    try {
      const [updated] = await db.update(strategies).set(updates).where(eq(strategies.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('Error updating strategy:', error);
      return undefined;
    }
  }

  async deleteStrategy(id: number): Promise<boolean> {
    try {
      await db.delete(strategies).where(eq(strategies.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting strategy:', error);
      return false;
    }
  }

  // Order management
  async getOrders(userId: number): Promise<LiveSimulationOrder[]> {
    try {
      const result = await db.select().from(liveSimulationOrders)
        .where(eq(liveSimulationOrders.userId, userId))
        .orderBy(desc(liveSimulationOrders.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  async getOrder(id: number): Promise<LiveSimulationOrder | undefined> {
    try {
      const [order] = await db.select().from(liveSimulationOrders).where(eq(liveSimulationOrders.id, id));
      return order || undefined;
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async createOrder(order: InsertLiveSimulationOrder): Promise<LiveSimulationOrder> {
    const [newOrder] = await db.insert(liveSimulationOrders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<LiveSimulationOrder>): Promise<LiveSimulationOrder | undefined> {
    try {
      const [updated] = await db.update(liveSimulationOrders).set(updates).where(eq(liveSimulationOrders.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('Error updating order:', error);
      return undefined;
    }
  }

  // Position management
  async getPositions(userId: number): Promise<LiveSimulationPosition[]> {
    try {
      const result = await db.select().from(liveSimulationPositions)
        .where(eq(liveSimulationPositions.userId, userId))
        .orderBy(desc(liveSimulationPositions.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  }

  async getPosition(id: number): Promise<LiveSimulationPosition | undefined> {
    try {
      const [position] = await db.select().from(liveSimulationPositions).where(eq(liveSimulationPositions.id, id));
      return position || undefined;
    } catch (error) {
      console.error('Error getting position:', error);
      return undefined;
    }
  }

  async createPosition(position: InsertLiveSimulationPosition): Promise<LiveSimulationPosition> {
    const [newPosition] = await db.insert(liveSimulationPositions).values(position).returning();
    return newPosition;
  }

  async updatePosition(id: number, updates: Partial<LiveSimulationPosition>): Promise<LiveSimulationPosition | undefined> {
    try {
      const [updated] = await db.update(liveSimulationPositions).set(updates).where(eq(liveSimulationPositions.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('Error updating position:', error);
      return undefined;
    }
  }

  async closePosition(id: number, exitPrice: number, exitTime: Date): Promise<LiveSimulationPosition | undefined> {
    try {
      const [updated] = await db.update(liveSimulationPositions)
        .set({ 
          status: 'closed',
          exitPrice: exitPrice.toString(),
          exitTime,
          updatedAt: new Date()
        })
        .where(eq(liveSimulationPositions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error closing position:', error);
      return undefined;
    }
  }

  // Balance management
  async getBalances(userId: number): Promise<any[]> {
    try {
      const result = await db.select().from(manualTradingBalances).where(eq(manualTradingBalances.userId, userId));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting balances:', error);
      return [];
    }
  }

  async updateBalance(userId: number, currency: string, newBalance: number): Promise<void> {
    try {
      await db.update(manualTradingBalances)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where(and(
          eq(manualTradingBalances.userId, userId),
          eq(manualTradingBalances.currency, currency)
        ));
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }
}

export const storage = new DatabaseStorage();
