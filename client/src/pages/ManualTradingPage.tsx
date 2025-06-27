import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BinanceMarketData } from '../services/BinanceMarketData';
import { OrderExecutor } from '../services/OrderExecutor';
import { CandleData } from '../types/market';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: Date;
  fillPrice?: number;
}

export default function ManualTradingPage() {
  const [marketData] = useState(new BinanceMarketData());
  const [orderExecutor] = useState(new OrderExecutor());
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('0.001');
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState({ USDT: 10000, BTC: 0, ETH: 0 });

  useEffect(() => {
    const subscription = marketData.subscribeToSymbol(selectedSymbol, (candle: CandleData) => {
      setCurrentPrice(candle.close);
      if (orderType === 'market' && !price) {
        setPrice(candle.close.toString());
      }
    });

    return () => subscription?.unsubscribe();
  }, [selectedSymbol, orderType, price]);

  const calculateOrderValue = () => {
    const qty = parseFloat(quantity) || 0;
    const orderPrice = orderType === 'market' ? currentPrice : (parseFloat(price) || 0);
    return qty * orderPrice;
  };

  const validateOrder = () => {
    const qty = parseFloat(quantity);
    const orderPrice = orderType === 'market' ? currentPrice : parseFloat(price);
    const orderValue = qty * orderPrice;

    if (!qty || qty <= 0) return 'Invalid quantity';
    if (orderType !== 'market' && (!orderPrice || orderPrice <= 0)) return 'Invalid price';
    if (orderType === 'stop' && (!parseFloat(stopPrice) || parseFloat(stopPrice) <= 0)) return 'Invalid stop price';
    
    if (orderSide === 'buy' && orderValue > balance.USDT) {
      return 'Insufficient USDT balance';
    }
    
    const symbolBase = selectedSymbol.replace('USDT', '');
    if (orderSide === 'sell' && qty > (balance as any)[symbolBase]) {
      return `Insufficient ${symbolBase} balance`;
    }

    return null;
  };

  const placeOrder = async () => {
    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPlacingOrder(true);
    setError(null);
    setSuccess(null);

    try {
      const orderData = {
        symbol: selectedSymbol,
        side: orderSide,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType !== 'market' ? parseFloat(price) : undefined,
        stopPrice: orderType === 'stop' ? parseFloat(stopPrice) : undefined
      };

      // Simulate order execution (paper trading)
      const newOrder: Order = {
        id: `order_${Date.now()}`,
        ...orderData,
        status: 'pending',
        timestamp: new Date(),
        fillPrice: orderType === 'market' ? currentPrice : undefined
      };

      // Add order to list
      setOrders(prev => [newOrder, ...prev]);

      // Simulate immediate fill for market orders
      if (orderType === 'market') {
        setTimeout(() => {
          setOrders(prev => prev.map(order => 
            order.id === newOrder.id 
              ? { ...order, status: 'filled', fillPrice: currentPrice }
              : order
          ));
          
          // Update balance
          const orderValue = parseFloat(quantity) * currentPrice;
          const symbolBase = selectedSymbol.replace('USDT', '');
          
          setBalance(prev => {
            if (orderSide === 'buy') {
              return {
                ...prev,
                USDT: prev.USDT - orderValue,
                [symbolBase]: (prev as any)[symbolBase] + parseFloat(quantity)
              };
            } else {
              return {
                ...prev,
                USDT: prev.USDT + orderValue,
                [symbolBase]: (prev as any)[symbolBase] - parseFloat(quantity)
              };
            }
          });
        }, 1000);
      }

      setSuccess(`${orderSide.toUpperCase()} order placed successfully`);
      
      // Reset form
      setQuantity('0.001');
      if (orderType !== 'market') setPrice('');
      if (orderType === 'stop') setStopPrice('');

    } catch (err: any) {
      setError('Failed to place order: ' + err.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' }
        : order
    ));
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manual Trading</h1>
        <div className="text-sm text-gray-400">
          Paper trading mode - No real money at risk
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order Entry */}
        <div className="xl:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Place Order</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Symbol & Price */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <select 
                    value={selectedSymbol} 
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg"
                  >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="ADAUSDT">ADA/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Price</label>
                  <div className="bg-gray-700 border border-gray-600 px-3 py-2 rounded-lg">
                    <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
                  <div className="flex space-x-2">
                    {(['market', 'limit', 'stop'] as const).map((type) => (
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

              {/* Order Details */}
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

                {orderType !== 'market' && (
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

                {orderType === 'stop' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Stop Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg"
                      placeholder="Enter stop price"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <div className="text-sm text-gray-400 mb-2">
                    Order Value: {formatCurrency(calculateOrderValue())}
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={isPlacingOrder}
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
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Balance */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Account Balance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">USDT:</span>
                <span className="text-white font-mono">{balance.USDT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">BTC:</span>
                <span className="text-white font-mono">{balance.BTC.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ETH:</span>
                <span className="text-white font-mono">{balance.ETH.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Market Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white">{selectedSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span className="text-yellow-400">Paper Trading</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders History */}
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
                    {order.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{order.symbol}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`capitalize ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {order.side}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 capitalize">{order.type}</td>
                  <td className="px-6 py-4 text-sm text-white font-mono">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {order.fillPrice ? formatCurrency(order.fillPrice) : (order.price ? formatCurrency(order.price) : 'Market')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className={`flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </div>
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