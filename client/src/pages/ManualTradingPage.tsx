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
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  // Subscribe to trades from ManualTradingService
  useEffect(() => {
    const subscription = manualTradingService.getTrades().subscribe(setTrades);
    return () => subscription.unsubscribe();
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

    setIsExecuting(true);

    try {
      const marketPrice = marketPrices[symbol] || 0;
      const tradePrice = type === 'market' ? marketPrice : parseFloat(price);

      const trade = manualTradingService.addTrade({
        symbol,
        side,
        type,
        quantity: parseFloat(amount),
        price: tradePrice,
        status: 'filled'
      });

      toast({
        title: 'Trade Executed',
        description: `${side.toUpperCase()} ${amount} ${symbol} at $${tradePrice.toFixed(2)}`,
      });

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
        <h1 className="text-3xl font-bold">Manual Trading</h1>
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
                  <Input
                    id="amount"
                    type="number"
                    step="0.00001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
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

        {/* Live Market Data */}
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

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">PnL</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? (
                  trades.slice(0, 10).map((trade) => (
                    <tr key={trade.id} className="border-b">
                      <td className="p-2">{trade.symbol.replace('USDT', '/USDT')}</td>
                      <td className="p-2">
                        <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{trade.quantity.toFixed(4)}</td>
                      <td className="p-2">${(trade.fillPrice || trade.price).toFixed(2)}</td>
                      <td className="p-2">
                        <span className={(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${(trade.pnl || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={trade.status === 'filled' ? 'text-green-600' : trade.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'}>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{new Date(trade.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-muted-foreground">
                      No trades yet. Place your first order above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}