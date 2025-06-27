import React, { useState } from 'react';
import { useOrderExecutor } from '../hooks/useOrderExecutor';
import { OrderIntent, ExecutorConfig } from '../trading/OrderExecutor';
import { StrategySignal } from '../trading/StrategyRunner';
import { 
  Play, 
  Pause, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

interface OrderExecutorDashboardProps {
  config: ExecutorConfig;
  onOrderExecuted?: (orderId: string) => void;
}

export function OrderExecutorDashboard({ config, onOrderExecuted }: OrderExecutorDashboardProps) {
  const {
    orders,
    positions,
    balance,
    stats,
    errors,
    isActive,
    executeOrder,
    cancelOrder,
    start,
    stop,
    getOrdersByStatus,
    getOpenPositions,
    getTotalUnrealizedPnL,
    clearErrors
  } = useOrderExecutor(config);

  const [testOrderSymbol, setTestOrderSymbol] = useState('BTC/USDT');
  const [testOrderAmount, setTestOrderAmount] = useState(0.001);
  const [testOrderSide, setTestOrderSide] = useState<'buy' | 'sell'>('buy');

  const pendingOrders = getOrdersByStatus('pending');
  const filledOrders = getOrdersByStatus('filled');
  const openPositions = getOpenPositions();
  const totalUnrealizedPnL = getTotalUnrealizedPnL();

  const handleTestOrder = async () => {
    try {
      const mockSignal: StrategySignal = {
        type: testOrderSide === 'buy' ? 'LONG' : 'SHORT',
        strength: 'MODERATE',
        confidence: 0.75,
        price: 45000, // Mock price
        timestamp: Date.now(),
        reasoning: ['Test order execution'],
        indicators: [],
        metadata: {
          symbol: testOrderSymbol,
          timeframe: '15m',
          entryConditions: ['Manual test'],
          exitConditions: []
        }
      };

      const orderIntent: OrderIntent = {
        id: `test_${Date.now()}`,
        signal: mockSignal,
        symbol: testOrderSymbol,
        side: testOrderSide,
        amount: testOrderAmount,
        timestamp: Date.now()
      };

      const order = await executeOrder(orderIntent);
      if (onOrderExecuted) {
        onOrderExecuted(order.id);
      }
    } catch (error) {
      console.error('Test order failed:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-400" />;
      case 'rejected':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Order Executor</h2>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
              isActive ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
            }`}>
              {isActive ? 'ACTIVE' : 'STOPPED'}
            </div>
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
              config.paperTrading ? 'bg-blue-600/20 text-blue-400' : 'bg-orange-600/20 text-orange-400'
            }`}>
              {config.paperTrading ? 'PAPER' : 'LIVE'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {!isActive ? (
            <button
              onClick={start}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              Start Executor
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
            >
              <Pause size={16} className="mr-2" />
              Stop Executor
            </button>
          )}

          <div className="text-sm text-gray-400">
            Exchange: <span className="text-white font-mono">{config.exchange}</span>
          </div>
          <div className="text-sm text-gray-400">
            Testnet: <span className="text-white">{config.testnet ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Orders</div>
              <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
            </div>
            <BarChart3 className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Success Rate</div>
              <div className="text-2xl font-bold text-white">{(stats.successRate * 100).toFixed(1)}%</div>
            </div>
            <CheckCircle className="text-green-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Volume</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalVolume)}</div>
            </div>
            <DollarSign className="text-yellow-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Unrealized P&L</div>
              <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalUnrealizedPnL)}
              </div>
            </div>
            {totalUnrealizedPnL >= 0 ? 
              <TrendingUp className="text-green-400" size={24} /> :
              <TrendingDown className="text-red-400" size={24} />
            }
          </div>
        </div>
      </div>

      {/* Test Order Panel */}
      {config.paperTrading && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Test Order Execution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Symbol</label>
              <input
                type="text"
                value={testOrderSymbol}
                onChange={(e) => setTestOrderSymbol(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Amount</label>
              <input
                type="number"
                step="0.001"
                value={testOrderAmount}
                onChange={(e) => setTestOrderAmount(parseFloat(e.target.value))}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Side</label>
              <select
                value={testOrderSide}
                onChange={(e) => setTestOrderSide(e.target.value as 'buy' | 'sell')}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleTestOrder}
                disabled={!isActive}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-white transition-colors"
              >
                Execute Test Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
                <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                <th className="text-right p-4 text-gray-400 font-medium">Filled</th>
                <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-4">
                    <div className="flex items-center">
                      {getStatusIcon(order.status)}
                      <span className="ml-2 text-white capitalize">{order.status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-white font-medium">{order.intent.symbol}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(order.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.intent.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {order.intent.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{order.intent.amount.toFixed(6)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">
                      {order.executedPrice > 0 ? formatCurrency(order.executedPrice) : '-'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{order.executedAmount.toFixed(6)}</div>
                    <div className="text-xs text-gray-400">
                      {((order.executedAmount / order.intent.amount) * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {(order.status === 'pending' || order.status === 'partially_filled') && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
                <th className="text-right p-4 text-gray-400 font-medium">Entry Price</th>
                <th className="text-right p-4 text-gray-400 font-medium">Current Price</th>
                <th className="text-right p-4 text-gray-400 font-medium">Unrealized PnL</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map(pos => (
                <tr key={pos.symbol + pos.side} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-4">
                    <div className="text-white font-medium">{pos.symbol}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pos.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {pos.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{pos.amount.toFixed(6)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{pos.entryPrice.toFixed(2)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-blue-400 font-mono">{pos.currentPrice.toFixed(2)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono" style={{color: pos.unrealizedPnL >= 0 ? 'green' : 'red'}}>
                      {pos.unrealizedPnL.toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Log */}
      {errors.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Error Log</h3>
            <button
              onClick={clearErrors}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="bg-red-600/20 border border-red-600/30 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-medium">{error.type}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-red-300 text-sm mt-1">{error.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}