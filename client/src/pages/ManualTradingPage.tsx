import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { manualTradingService, ManualTrade } from '@/services/ManualTradingService';
import { realDataService } from '@/utils/realDataService';

export default function ManualTradingPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [trades, setTrades] = useState<ManualTrade[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [balance, setBalance] = useState({ USDT: 10000, BTC: 0, ETH: 0, ADA: 0, SOL: 0, DOT: 0 });
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      manualTradingService.cancelOrder(orderId);
      toast({
        title: 'Order Cancelled',
        description: 'Order has been successfully cancelled',
      });
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  // Subscribe to trades and balance from ManualTradingService
  useEffect(() => {
    const tradesSubscription = manualTradingService.getTrades().subscribe(setTrades);
    const balanceSubscription = manualTradingService.getBalance().subscribe(setBalance);
    return () => {
      tradesSubscription.unsubscribe();
      balanceSubscription.unsubscribe();
    };
  }, []);

  // Subscribe to real-time market prices
  useEffect(() => {
    const updatePrices = async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'];
      const newPrices: { [key: string]: number } = {};

      for (const symbol of symbols) {
        try {
          // Use direct Binance API call for real prices
          const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          const data = await response.json();

          if (data.price) {
            newPrices[symbol] = parseFloat(data.price);
          } else {
            // Fallback to binanceMarketData if direct API fails
            const price = await realDataService.getCurrentPrice(symbol);
            newPrices[symbol] = price.last;
          }
        } catch (error) {
          console.error(`Failed to get price for ${symbol}:`, error);
          // Use last known price or fallback
          try {
            const ticker = await realDataService.getCurrentPrice(symbol.replace('USDT', '/USDT'));
            newPrices[symbol] = ticker.last;
          } catch (fallbackError) {
            console.error(`Fallback price fetch failed for ${symbol}:`, fallbackError);
          }
        }
      }

      setMarketPrices(newPrices);
    };

    // Initial load
    updatePrices();

    // Update every 2 seconds for more real-time data
    const interval = setInterval(updatePrices, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'limit' && (!price || parseFloat(price) <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid price for limit orders',
        variant: 'destructive',
      });
      return;
    }

    // Additional validation for sell orders
    if (side === 'sell') {
      const baseCurrency = symbol.replace('USDT', '');
      const availableAmount = balance[baseCurrency] || 0;
      if (availableAmount < parseFloat(amount)) {
        toast({
          title: 'Insufficient Balance',
          description: `You only have ${availableAmount.toFixed(6)} ${baseCurrency} available`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsExecuting(true);

    try {
      let trade;
      const orderAmount = parseFloat(amount);
      const limitPrice = type === 'limit' ? parseFloat(price) : undefined;

      // Use enhanced buy/sell API methods
      if (side === 'buy') {
        trade = await manualTradingService.executeBuyOrder(symbol, orderAmount, type, limitPrice);
      } else {
        trade = await manualTradingService.executeSellOrder(symbol, orderAmount, type, limitPrice);
      }

      toast({
        title: 'Trade Executed',
        description: `${side.toUpperCase()} ${amount} ${symbol} at $${trade.price.toFixed(2)}`,
      });

      // Reset form
      setAmount('');
      setPrice('');
    } catch (error) {
      toast({
        title: 'Trade Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manual Trading</h1>
          <div className="flex items-center mt-2 space-x-2">
            <div className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
              REALISTIC SIMULATION
            </div>
            <span className="text-sm text-gray-400">
              Live prices • Slippage • Market impact • Partial fills
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Form */}
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                      <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                      <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="side">Side</Label>
                  <Select value={side} onValueChange={(value) => setSide(value as 'buy' | 'sell')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Order Type</Label>
                  <Select value={type} onValueChange={(value) => setType(value as 'market' | 'limit')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <div className="space-y-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.00001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    {(() => {
                      if (side === 'sell') {
                        const baseCurrency = symbol.replace('USDT', '');
                        const availableAmount = balance[baseCurrency] || 0;
                        return availableAmount > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                              onClick={() => setAmount((availableAmount * 0.25).toFixed(6))}
                            >
                              25%
                            </button>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                              onClick={() => setAmount((availableAmount * 0.5).toFixed(6))}
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                              onClick={() => setAmount((availableAmount * 0.75).toFixed(6))}
                            >
                              75%
                            </button>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                              onClick={() => setAmount(availableAmount.toFixed(6))}
                            >
                              MAX
                            </button>
                            <div className="text-xs text-gray-500 mt-1 w-full">
                              Available: {availableAmount.toFixed(6)} {baseCurrency}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-red-500">
                            No {symbol.replace('USDT', '')} available
                          </div>
                        );
                      } else {
                        // For buy orders, show USDT-based amounts
                        const availableUSDT = balance.USDT || 0;
                        const currentPrice = marketPrices[symbol] || 0;
                        if (availableUSDT > 0 && currentPrice > 0) {
                          const maxAmount = availableUSDT / currentPrice;
                          return (
                            <div className="flex gap-1 flex-wrap">
                              <button
                                type="button"
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                                onClick={() => setAmount((maxAmount * 0.25).toFixed(6))}
                              >
                                25%
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                                onClick={() => setAmount((maxAmount * 0.5).toFixed(6))}
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                                onClick={() => setAmount((maxAmount * 0.75).toFixed(6))}
                              >
                                75%
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
                                onClick={() => setAmount((maxAmount * 0.95).toFixed(6))} // 95% to account for fees
                              >
                                MAX
                              </button>
                              <div className="text-xs text-gray-500 mt-1 w-full">
                                Max buyable: {(maxAmount * 0.95).toFixed(6)} {symbol.replace('USDT', '')} 
                                <span className="ml-2">(${availableUSDT.toFixed(2)} USDT)</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="text-xs text-red-500">
                            Insufficient USDT balance
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {type === 'limit' && (
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className={`w-full ${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={isExecuting || !marketPrices[symbol]}
              >
                {isExecuting ? 'Processing...' : `${side.toUpperCase()} ${symbol}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Market Data and Balance */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                  <span className="font-medium">USDT</span>
                  <span className="font-bold">${balance.USDT.toFixed(2)}</span>
                </div>
                {Object.entries(balance).filter(([key, value]) => key !== 'USDT' && value > 0).map(([currency, amount]) => {
                  const symbol = `${currency}USDT`;
                  const currentPrice = marketPrices[symbol] || 0;
                  const usdValue = amount * currentPrice;
                  return (
                    <div key={currency} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{currency}</span>
                        <div className="text-xs text-gray-500">
                          ${currentPrice > 0 ? usdValue.toFixed(2) : '0.00'} USD
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{amount.toFixed(6)}</span>
                        {currentPrice > 0 && (
                          <div className="text-xs text-gray-500">
                            @${currentPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between items-center p-2 bg-green-100 rounded">
                    <span className="font-medium text-green-800">Total Portfolio Value</span>
                    <span className="font-bold text-green-800">
                      ${(balance.USDT + Object.entries(balance)
                        .filter(([key]) => key !== 'USDT')
                        .reduce((total, [currency, amount]) => {
                          const symbol = `${currency}USDT`;
                          const price = marketPrices[symbol] || 0;
                          return total + (amount * price);
                        }, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'].map((pair) => {
                  const currentPrice = marketPrices[pair];
                  const priceDisplay = currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Loading...';

                  return (
                    <div key={pair} className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">{pair.replace('USDT', '/USDT')}</span>
                      <div className="text-right">
                        <div className="font-bold">{priceDisplay}</div>
                        <div className="text-sm text-muted-foreground">
                          {currentPrice ? 'Live' : 'Connecting...'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comprehensive Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History - Exchange View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order #</th>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Buy Price</th>
                  <th className="text-left p-2">Sell Price</th>
                  <th className="text-left p-2">Total Value</th>
                  <th className="text-left p-2">Fees</th>
                  <th className="text-left p-2">Net Value</th>
                  <th className="text-left p-2">PnL</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? (
                  trades.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-mono text-xs">#{trade.orderNumber || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{trade.exchange || 'Manual Sim'}</div>
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{trade.symbol.replace('USDT', '/USDT')}</div>
                        {trade.slippage && (
                          <div className="text-xs text-gray-500">
                            Slippage: {(trade.slippage * 100).toFixed(3)}%
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="font-mono">{trade.quantity.toFixed(6)}</div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono">
                          {trade.buyPrice ? `$${trade.buyPrice.toFixed(2)}` : 
                           trade.side === 'buy' ? `$${(trade.fillPrice || trade.price).toFixed(2)}` : '-'}
                        </div>
                        {trade.avgBuyPrice && trade.side === 'buy' && (
                          <div className="text-xs text-gray-500">Avg: ${trade.avgBuyPrice.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-mono">
                          {trade.sellPrice ? `$${trade.sellPrice.toFixed(2)}` : 
                           trade.side === 'sell' ? `$${(trade.fillPrice || trade.price).toFixed(2)}` : '-'}
                        </div>
                        {trade.avgSellPrice && trade.side === 'sell' && (
                          <div className="text-xs text-gray-500">Avg: ${trade.avgSellPrice.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-mono">${(trade.totalValue || 0).toFixed(2)}</div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-red-500">${(trade.fees || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {trade.commission ? `${(trade.commission * 100).toFixed(3)}%` : '0.1%'}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono">${(trade.netValue || 0).toFixed(2)}</div>
                      </td>
                      <td className="p-2">
                        <div className={`font-mono ${(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${(trade.pnl || 0).toFixed(2)}
                        </div>
                        {trade.status === 'closed' && <div className="text-xs text-blue-500">(Final)</div>}
                        {trade.tradePairId && (
                          <div className="text-xs text-gray-500">
                            Pair: #{trade.tradePairId.slice(-6)}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={
                          trade.status === 'filled' ? 'text-green-600' : 
                          trade.status === 'closed' ? 'text-blue-600' :
                          trade.status === 'cancelled' ? 'text-red-600' : 
                          'text-yellow-600'
                        }>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="text-xs">{new Date(trade.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                        {trade.executionTime && (
                          <div className="text-xs text-gray-400">
                            Exec: {trade.executionTime - trade.timestamp}ms
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {trade.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(trade.id)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="text-center p-4 text-muted-foreground">
                      No trades yet. Place your first order above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Trade Summary Stats */}
          {trades.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded">
              <div className="text-center">
                <div className="text-sm text-gray-500">Total Trades</div>
                <div className="font-bold">{trades.length}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Total Fees Paid</div>
                <div className="font-bold text-red-600">
                  ${trades.reduce((sum, trade) => sum + (trade.fees || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Closed Trades</div>
                <div className="font-bold text-blue-600">
                  {trades.filter(t => t.status === 'closed').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Realized PnL</div>
                <div className={`font-bold ${trades.filter(t => t.status === 'closed').reduce((sum, trade) => sum + (trade.pnl || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${trades.filter(t => t.status === 'closed').reduce((sum, trade) => sum + (trade.pnl || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}