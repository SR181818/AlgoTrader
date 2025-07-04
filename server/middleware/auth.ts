
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
    isPaidUser: boolean;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.auth_token;
    const token = authHeader?.split(' ')[1] || cookieToken;

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Optional: Verify user still exists in database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        isPaidUser: users.isPaidUser
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isPaidUser: user.isPaidUser
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(403).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ 
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }
};

export const requirePaidUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isPaidUser) {
    res.status(403).json({ 
      error: 'This feature requires a paid subscription',
      code: 'SUBSCRIPTION_REQUIRED'
    });
    return;
  }
  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.auth_token;
    const token = authHeader?.split(' ')[1] || cookieToken;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          isPaidUser: users.isPaidUser
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
          username: user.username,
          isPaidUser: user.isPaidUser
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next();
  }
};
