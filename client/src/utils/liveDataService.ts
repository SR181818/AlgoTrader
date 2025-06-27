import { CandleData, MarketData, TradingPair } from '../types/trading';

class LiveDataService {
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private candleData: Map<string, CandleData[]> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  // Simulate live data for demo purposes
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeSimulatedData();
  }

  private initializeSimulatedData() {
    // Initialize base prices for different asset categories
    const basePrices: Record<string, number> = {
      'BTCUSDT': 45000 + Math.random() * 20000,
      'ETHUSDT': 2500 + Math.random() * 1500,
      'ADAUSDT': 0.3 + Math.random() * 0.7,
      'SOLUSDT': 80 + Math.random() * 120,
      'DOTUSDT': 5 + Math.random() * 15,
      'EURUSD': 1.0500 + Math.random() * 0.1500,
      'GBPUSD': 1.2000 + Math.random() * 0.3000,
      'USDJPY': 140.00 + Math.random() * 15.00,
      'USDCHF': 0.9000 + Math.random() * 0.2000,
      'AUDUSD': 0.6500 + Math.random() * 0.1500,
      'USDCAD': 1.3500 + Math.random() * 0.2000,
      'NZDUSD': 0.6000 + Math.random() * 0.1500,
      'EURGBP': 0.8500 + Math.random() * 0.1000,
      'EURJPY': 150.00 + Math.random() * 15.00,
      'GBPJPY': 180.00 + Math.random() * 15.00,
      'EURCHF': 0.9500 + Math.random() * 0.1500,
      'GBPCHF': 1.1000 + Math.random() * 0.2000,
      'AUDCAD': 0.9000 + Math.random() * 0.1500,
      'AUDJPY': 95.00 + Math.random() * 15.00,
      'CADJPY': 105.00 + Math.random() * 10.00,
      'NZDJPY': 85.00 + Math.random() * 10.00,
      'USDTRY': 25.00 + Math.random() * 8.00,
      'USDZAR': 16.00 + Math.random() * 3.00,
      'USDMXN': 18.00 + Math.random() * 4.00,
      'USDSEK': 10.00 + Math.random() * 2.00,
      'USDNOK': 10.50 + Math.random() * 1.50,
      'XAUUSD': 1900.00 + Math.random() * 400.00,
      'XAGUSD': 22.00 + Math.random() * 8.00,
      'WTIUSD': 70.00 + Math.random() * 30.00
    };

    // Initialize market data for all symbols
    Object.entries(basePrices).forEach(([symbol, basePrice]) => {
      const change24h = (Math.random() - 0.5) * 10; // -5% to +5%
      const volume = this.getVolumeForSymbol(symbol);
      
      this.marketData.set(symbol, {
        symbol,
        price: basePrice,
        change24h,
        volume,
        high24h: basePrice * (1 + Math.random() * 0.05),
        low24h: basePrice * (1 - Math.random() * 0.05),
        lastUpdate: Date.now()
      });

      // Initialize candle data
      this.candleData.set(symbol, this.generateInitialCandles(symbol, basePrice));
    });
  }

  private getVolumeForSymbol(symbol: string): number {
    if (symbol.includes('BTC')) return 1000 + Math.random() * 5000;
    if (symbol.includes('ETH')) return 5000 + Math.random() * 15000;
    if (symbol.includes('USD')) return 100000 + Math.random() * 500000;
    return 10000 + Math.random() * 50000;
  }

  private generateInitialCandles(symbol: string, basePrice: number): CandleData[] {
    const candles: CandleData[] = [];
    const now = Date.now();
    let currentPrice = basePrice;

    for (let i = 199; i >= 0; i--) {
      const timestamp = now - (i * 15 * 60 * 1000); // 15-minute intervals
      const volatility = this.getVolatilityForSymbol(symbol);
      const priceChange = (Math.random() - 0.5) * volatility;
      
      const open = currentPrice;
      currentPrice = currentPrice * (1 + priceChange);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = this.getVolumeForSymbol(symbol) * (0.5 + Math.random());

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

  private getVolatilityForSymbol(symbol: string): number {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 0.003; // 0.3%
    if (symbol.includes('TRY') || symbol.includes('ZAR')) return 0.002; // 0.2%
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 0.0015; // 0.15%
    return 0.001; // 0.1% for major forex pairs
  }

  subscribe(symbol: string, callback: (data: any) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    // Start simulation for this symbol if not already running
    if (!this.simulationIntervals.has(symbol)) {
      this.startSimulation(symbol);
    }

    // Send initial data
    const marketData = this.marketData.get(symbol);
    const candles = this.candleData.get(symbol);
    if (marketData && candles) {
      callback({
        type: 'market_data',
        data: marketData
      });
      callback({
        type: 'candle_data',
        data: candles
      });
    }
  }

  unsubscribe(symbol: string, callback: (data: any) => void) {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers) {
      symbolSubscribers.delete(callback);
      if (symbolSubscribers.size === 0) {
        this.subscribers.delete(symbol);
        this.stopSimulation(symbol);
      }
    }
  }

  private startSimulation(symbol: string) {
    const interval = setInterval(() => {
      this.updateSymbolData(symbol);
    }, 2000 + Math.random() * 3000); // Update every 2-5 seconds

    this.simulationIntervals.set(symbol, interval);
  }

  private stopSimulation(symbol: string) {
    const interval = this.simulationIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(symbol);
    }
  }

  private updateSymbolData(symbol: string) {
    const currentData = this.marketData.get(symbol);
    const currentCandles = this.candleData.get(symbol);
    
    if (!currentData || !currentCandles) return;

    const volatility = this.getVolatilityForSymbol(symbol);
    const priceChange = (Math.random() - 0.5) * volatility;
    const newPrice = currentData.price * (1 + priceChange);
    
    // Update market data
    const updatedMarketData: MarketData = {
      ...currentData,
      price: newPrice,
      change24h: currentData.change24h + (Math.random() - 0.5) * 0.1,
      volume: currentData.volume + (Math.random() - 0.5) * currentData.volume * 0.01,
      high24h: Math.max(currentData.high24h, newPrice),
      low24h: Math.min(currentData.low24h, newPrice),
      lastUpdate: Date.now()
    };

    this.marketData.set(symbol, updatedMarketData);

    // Update last candle
    const lastCandle = { ...currentCandles[currentCandles.length - 1] };
    lastCandle.close = newPrice;
    lastCandle.high = Math.max(lastCandle.high, newPrice);
    lastCandle.low = Math.min(lastCandle.low, newPrice);
    lastCandle.volume += Math.random() * this.getVolumeForSymbol(symbol) * 0.01;

    const updatedCandles = [...currentCandles.slice(0, -1), lastCandle];
    this.candleData.set(symbol, updatedCandles);

    // Notify subscribers
    const subscribers = this.subscribers.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => {
        callback({
          type: 'market_data',
          data: updatedMarketData
        });
        callback({
          type: 'candle_data',
          data: updatedCandles
        });
      });
    }
  }

  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  getCandleData(symbol: string): CandleData[] | undefined {
    return this.candleData.get(symbol);
  }

  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  disconnect() {
    // Clear all intervals
    this.simulationIntervals.forEach(interval => clearInterval(interval));
    this.simulationIntervals.clear();
    
    // Clear all WebSocket connections
    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();
    
    // Clear subscribers
    this.subscribers.clear();
  }
}

export const liveDataService = new LiveDataService();