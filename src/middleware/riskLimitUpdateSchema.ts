import { z } from 'zod';

export const riskLimitUpdateSchema = z.object({
  maxRiskPerTrade: z.number().min(0.0001).max(0.05).optional(), // max 5% per trade
  maxDailyDrawdown: z.number().min(0.0001).max(0.05).optional(), // max 5% per day
  maxOpenPositions: z.number().int().min(1).max(100).optional(),
  maxCorrelatedPositions: z.number().int().min(1).max(20).optional(),
  minRiskRewardRatio: z.number().min(0.1).max(10).optional(),
  maxLeverage: z.number().min(1).max(100).optional(),
  emergencyStopLoss: z.number().min(0.0001).max(0.5).optional(),
  cooldownPeriod: z.number().int().min(0).max(1440).optional(),
});
