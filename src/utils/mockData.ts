import { CandleData } from '../types/trading';

// Generate realistic BTC price data for demo
export function generateMockCandles(count: number = 200): CandleData[] {
  const candles: CandleData[] = [];
  let basePrice = 45000 + Math.random() * 20000; // BTC price range
  const now = Date.now();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - (i * 15 * 60 * 1000); // 15-minute intervals
    
    // Add some realistic volatility
    const volatility = 0.002; // 0.2% volatility
    const trend = (Math.random() - 0.5) * 0.001; // Small trend component
    
    const priceChange = (Math.random() - 0.5) * volatility + trend;
    basePrice = basePrice * (1 + priceChange);
    
    const high = basePrice * (1 + Math.random() * 0.001);
    const low = basePrice * (1 - Math.random() * 0.001);
    const open = i === count - 1 ? basePrice : candles[candles.length - 1].close;
    const close = basePrice;
    const volume = 100 + Math.random() * 1000;
    
    candles.push({
      timestamp,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume
    });
  }
  
  return candles.sort((a, b) => a.timestamp - b.timestamp);
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