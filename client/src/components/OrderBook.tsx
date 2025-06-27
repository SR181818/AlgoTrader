import React, { useState, useEffect } from 'react';
import { OrderExecutor, Order, OrderIntent } from '../trading/OrderExecutor';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';

interface OrderBookProps {
  orderExecutor: OrderExecutor;
  symbol: string;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export function OrderBook({ orderExecutor, symbol }: OrderBookProps) {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState(0);
  const [spreadPercent, setSpreadPercent] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);

  // Generate mock order book data for demonstration
  useEffect(() => {
    const generateOrderBook = () => {
      const basePrice = 45000 + Math.random() * 10000; // Mock BTC price
      setLastPrice(basePrice);
      
      const mockBids: OrderBookEntry[] = [];
      const mockAsks: OrderBookEntry[] = [];
      
      // Generate bids (buy orders) - prices below current price
      for (let i = 0; i < 15; i++) {
        const price = basePrice - (i + 1) * (1 + Math.random() * 5);
        const amount = 0.1 + Math.random() * 2;
        const total = price * amount;
        mockBids.push({ price, amount, total });
      }
      
      // Generate asks (sell orders) - prices above current price
      for (let i = 0; i < 15; i++) {
        const price = basePrice + (i + 1) * (1 + Math.random() * 5);
        const amount = 0.1 + Math.random() * 2;
        const total = price * amount;
        mockAsks.push({ price, amount, total });
      }
      
      setBids(mockBids);
      setAsks(mockAsks);
      
      // Calculate spread
      const bestBid = mockBids[0]?.price || 0;
      const bestAsk = mockAsks[0]?.price || 0;
      const currentSpread = bestAsk - bestBid;
      const currentSpreadPercent = (currentSpread / bestAsk) * 100;
      
      setSpread(currentSpread);
      setSpreadPercent(currentSpreadPercent);
    };

    generateOrderBook();
    const interval = setInterval(generateOrderBook, 2000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(6);
  };

  const handleQuickOrder = async (side: 'buy' | 'sell', price: number) => {
    try {
      const orderIntent: OrderIntent = {
        id: `quick_${Date.now()}`,
        signal: {
          type: side === 'buy' ? 'LONG' : 'SHORT',
          strength: 'MODERATE',
          confidence: 0.7,
          price: lastPrice,
          timestamp: Date.now(),
          reasoning: [`Quick ${side} order from order book`],
          indicators: [],
          metadata: {
            symbol,
            timeframe: '15m',
            entryConditions: ['Manual order book entry'],
            exitConditions: []
          }
        },
        symbol,
        side,
        amount: 0.01, // Small test amount
        price,
        timestamp: Date.now()
      };

      await orderExecutor.executeOrder(orderIntent);
    } catch (error) {
      console.error('Quick order failed:', error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Order Book - {symbol}</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-gray-400">
              Last: <span className="text-white font-mono">{formatPrice(lastPrice)}</span>
            </div>
            <div className="text-gray-400">
              Spread: <span className="text-white font-mono">{formatPrice(spread)}</span>
              <span className="text-gray-400 ml-1">({spreadPercent.toFixed(3)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Book */}
      <div className="grid grid-cols-2 divide-x divide-gray-700">
        {/* Bids (Buy Orders) */}
        <div className="p-4">
          <div className="flex items-center mb-3">
            <TrendingUp size={16} className="text-green-400 mr-2" />
            <h4 className="text-green-400 font-medium">Bids</h4>
          </div>
          
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
              <div>Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            
            {bids.slice(0, 10).map((bid, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-2 text-xs hover:bg-gray-700/50 rounded p-1 cursor-pointer transition-colors"
                onClick={() => handleQuickOrder('sell', bid.price)}
              >
                <div className="text-green-400 font-mono">{formatPrice(bid.price)}</div>
                <div className="text-white font-mono text-right">{formatAmount(bid.amount)}</div>
                <div className="text-gray-300 font-mono text-right">{formatPrice(bid.total)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="p-4">
          <div className="flex items-center mb-3">
            <TrendingDown size={16} className="text-red-400 mr-2" />
            <h4 className="text-red-400 font-medium">Asks</h4>
          </div>
          
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
              <div>Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            
            {asks.slice(0, 10).map((ask, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-2 text-xs hover:bg-gray-700/50 rounded p-1 cursor-pointer transition-colors"
                onClick={() => handleQuickOrder('buy', ask.price)}
              >
                <div className="text-red-400 font-mono">{formatPrice(ask.price)}</div>
                <div className="text-white font-mono text-right">{formatAmount(ask.amount)}</div>
                <div className="text-gray-300 font-mono text-right">{formatPrice(ask.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Click on price levels to place quick orders
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleQuickOrder('buy', asks[0]?.price || lastPrice)}
              className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors"
            >
              <TrendingUp size={14} className="mr-1" />
              Market Buy
            </button>
            <button
              onClick={() => handleQuickOrder('sell', bids[0]?.price || lastPrice)}
              className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
            >
              <TrendingDown size={14} className="mr-1" />
              Market Sell
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}