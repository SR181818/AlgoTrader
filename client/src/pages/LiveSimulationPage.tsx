
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Play, Pause, AlertTriangle } from 'lucide-react';

interface LiveSimulationAccount {
  id: number;
  accountName: string;
  currentBalance: string;
  totalPnL: string;
  totalTrades: number;
  winRate: string;
}

interface LiveSimulationOrder {
  id: number;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: string;
  price?: string;
  status: string;
  filledQuantity: string;
  filledPrice?: string;
  fees: string;
  createdAt: string;
}

interface LiveSimulationPosition {
  id: number;
  symbol: string;
  side: 'long' | 'short';
  quantity: string;
  entryPrice: string;
  currentPrice: string;
  unrealizedPnL: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export default function LiveSimulationPage() {
  const [account, setAccount] = useState<LiveSimulationAccount | null>(null);
  const [orders, setOrders] = useState<LiveSimulationOrder[]>([]);
  const [positions, setPositions] = useState<LiveSimulationPosition[]>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  
  // Order form
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('0.001');
  const [price, setPrice] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const userId = 1; // Mock user ID
  const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT'];

  useEffect(() => {
    initializeAccount();
    loadAccountData();
  }, []);

  useEffect(() => {
    if (isSimulationRunning) {
      const interval = setInterval(() => {
        updateMarketPrices();
        loadAccountData();
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isSimulationRunning]);

  const initializeAccount = async () => {
    try {
      const response = await fetch(`/api/live-simulation/account/${userId}`);
      const data = await response.json();
      setAccount(data.account);
    } catch (error) {
      console.error('Failed to initialize account:', error);
    }
  };

  const loadAccountData = async () => {
    if (!account) return;

    try {
      // Load orders
      const ordersResponse = await fetch(`/api/live-simulation/orders/${account.id}`);
      const ordersData = await ordersResponse.json();
      setOrders(ordersData.orders);

      // Load positions
      const positionsResponse = await fetch(`/api/live-simulation/positions/${account.id}`);
      const positionsData = await positionsResponse.json();
      setPositions(positionsData.positions);
    } catch (error) {
      console.error('Failed to load account data:', error);
    }
  };

  const updateMarketPrices = async () => {
    try {
      await fetch('/api/live-simulation/update-prices', { method: 'POST' });
      
      // Simulate market data updates
      const newMarketData: Record<string, MarketData> = {};
      for (const symbol of symbols) {
        const prevPrice = marketData[symbol]?.price || getBasePrice(symbol);
        const change = (Math.random() - 0.5) * 0.02; // ±1% change
        const newPrice = prevPrice * (1 + change);
        
        newMarketData[symbol] = {
          symbol,
          price: newPrice,
          change24h: change * 100,
          volume: 1000000 + Math.random() * 5000000
        };
      }
      setMarketData(newMarketData);
    } catch (error) {
      console.error('Failed to update market prices:', error);
    }
  };

  const getBasePrice = (symbol: string): number => {
    const basePrices: Record<string, number> = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.5,
      'SOLUSDT': 100,
      'DOGEUSDT': 0.08
    };
    return basePrices[symbol] || 100;
  };

  const placeOrder = async () => {
    if (!account) return;

    setIsPlacingOrder(true);
    setError('');
    setSuccess('');

    try {
      const orderData = {
        accountId: account.id,
        symbol: selectedSymbol,
        side: orderSide,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType === 'limit' ? parseFloat(price) : undefined
      };

      const response = await fetch('/api/live-simulation/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        setSuccess(`${orderSide.toUpperCase()} order placed successfully`);
        setQuantity('0.001');
        setPrice('');
        loadAccountData();
      } else {
        throw new Error('Failed to place order');
      }
    } catch (error) {
      setError('Failed to place order: ' + error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      await fetch(`/api/live-simulation/orders/${orderId}`, { method: 'DELETE' });
      loadAccountData();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
    if (!isSimulationRunning) {
      setSuccess('Live simulation started - prices updating in real-time');
      updateMarketPrices();
    } else {
      setSuccess('Live simulation paused');
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue);
  };

  const formatPercentage = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`;
  };

  const currentPrice = marketData[selectedSymbol]?.price || getBasePrice(selectedSymbol);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Trading Simulation</h1>
          <p className="text-gray-400">Real-time price updates with database persistence</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            isSimulationRunning ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
          }`}>
            {isSimulationRunning ? 'Live' : 'Paused'}
          </div>
          <button
            onClick={toggleSimulation}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
              isSimulationRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSimulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulationRunning ? 'Pause' : 'Start'} Simulation</span>
          </button>
        </div>
      </div>

      {/* Account Summary */}
      {account && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Balance</span>
            </div>
            <span className="text-xl font-bold text-white">
              {formatCurrency(account.currentBalance)}
            </span>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Total P&L</span>
            </div>
            <span className={`text-xl font-bold ${
              parseFloat(account.totalPnL) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(account.totalPnL)}
            </span>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Total Trades</span>
            </div>
            <span className="text-xl font-bold text-white">{account.totalTrades}</span>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-orange-400" />
              <span className="text-gray-400 text-sm">Win Rate</span>
            </div>
            <span className="text-xl font-bold text-white">
              {formatPercentage(account.winRate)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order Entry */}
        <div className="xl:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Place Order</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <select 
                    value={selectedSymbol} 
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg"
                  >
                    {symbols.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Price</label>
                  <div className="bg-gray-700 border border-gray-600 px-3 py-2 rounded-lg">
                    <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
                    {marketData[selectedSymbol] && (
                      <span className={`ml-2 text-sm ${
                        marketData[selectedSymbol].change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(marketData[selectedSymbol].change24h)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
                  <div className="flex space-x-2">
                    {(['market', 'limit'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`px-4 py-2 rounded-lg capitalize ${
                          orderType === type 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Side</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setOrderSide('buy')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 ${
                        orderSide === 'buy' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Buy</span>
                    </button>
                    <button
                      onClick={() => setOrderSide('sell')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 ${
                        orderSide === 'sell' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>Sell</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg"
                    placeholder="0.001"
                  />
                </div>

                {orderType === 'limit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg"
                      placeholder="Enter price"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <div className="text-sm text-gray-400 mb-2">
                    Order Value: {formatCurrency(parseFloat(quantity) * currentPrice)}
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={isPlacingOrder || !account}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      orderSide === 'buy'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {isPlacingOrder ? 'Placing Order...' : `${orderSide.toUpperCase()} ${selectedSymbol}`}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-green-400">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Market Data */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Market Data</h3>
            <div className="space-y-3">
              {symbols.map(symbol => {
                const data = marketData[symbol];
                const basePrice = getBasePrice(symbol);
                const price = data?.price || basePrice;
                const change = data?.change24h || 0;
                
                return (
                  <div key={symbol} className="flex justify-between items-center">
                    <span className="text-gray-300">{symbol}</span>
                    <div className="text-right">
                      <div className="text-white font-mono text-sm">
                        ${price.toFixed(symbol.includes('USDT') && price > 10 ? 0 : 6)}
                      </div>
                      <div className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(change)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Side</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Entry Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Current Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-white">{position.symbol}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`capitalize ${
                        position.side === 'long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-mono">{position.quantity}</td>
                    <td className="px-6 py-4 text-sm text-white font-mono">
                      {formatCurrency(position.entryPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-mono">
                      {formatCurrency(position.currentPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">
                      <span className={`${
                        parseFloat(position.unrealizedPnL) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Side</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{order.symbol}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`capitalize ${
                      order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {order.side}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 capitalize">{order.type}</td>
                  <td className="px-6 py-4 text-sm text-white font-mono">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {order.filledPrice ? formatCurrency(order.filledPrice) : 
                     (order.price ? formatCurrency(order.price) : 'Market')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`capitalize ${
                      order.status === 'filled' ? 'text-green-400' :
                      order.status === 'cancelled' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    No orders placed yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
