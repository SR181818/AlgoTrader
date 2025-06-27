import { CandleData } from '../types/trading';

// Generate realistic BTC price data for demo
export function generateMockCandles(count: number = 200): CandleData[] {
  const candles: CandleData[] = [];
  let basePrice = 45000 + Math.random() * 20000; // BTC price range
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  const startTime = now - (count * intervalMs);
  let currentPrice = basePrice;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + (i * intervalMs);

    // Create more realistic price movement with multiple trends
    const longTrend = Math.sin(i / 100) * 0.03; // Long-term trend (100 candles cycle)
    const mediumTrend = Math.sin(i / 30) * 0.015; // Medium-term trend (30 candles cycle)
    const shortTrend = Math.sin(i / 10) * 0.008; // Short-term trend (10 candles cycle)
    const noise = (Math.random() - 0.5) * 0.02; // Random noise

    // Combine trends for more realistic movement
    const priceChange = longTrend + mediumTrend + shortTrend + noise;

    currentPrice *= (1 + priceChange);

    // Ensure currentPrice stays positive and realistic
    currentPrice = Math.max(currentPrice, basePrice * 0.3);
    currentPrice = Math.min(currentPrice, basePrice * 3);

    // Generate OHLC values with proper relationships
    const open = i === 0 ? basePrice : candles[i - 1].close;
    const volatility = currentPrice * 0.015; // 1.5% intrabar volatility

    const highOffset = Math.random() * volatility;
    const lowOffset = Math.random() * volatility;

    const high = Math.max(open, currentPrice) + highOffset;
    const low = Math.min(open, currentPrice) - lowOffset;
    const close = currentPrice;

    // Generate volume with some correlation to price movement
    const priceMovement = Math.abs(priceChange);
    const baseVolume = 500000;
    const volumeMultiplier = 1 + (priceMovement * 20); // Higher volume on bigger moves
    const volume = Math.floor((baseVolume * volumeMultiplier) + (Math.random() * baseVolume * 0.5));

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return candles;
}

// Simulate real-time price updates
export function updateLastCandle(candles: CandleData[]): CandleData[] {
  if (candles.length === 0) return candles;

  const lastCandle = { ...candles[candles.length - 1] };
  const volatility = 0.0005; // Smaller volatility for real-time updates
  const priceChange = (Math.random() - 0.5) * volatility;

  lastCandle.close = lastCandle.close * (1 + priceChange);
  lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
  lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
  lastCandle.volume += Math.random() * 10;

  return [...candles.slice(0, -1), lastCandle];
}