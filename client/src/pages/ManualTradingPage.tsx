import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Trade {
  id: number;
  symbol: string;
  side: string;
  amount: string;
  price: string;
  pnl: string;
  status: string;
  createdAt: string;
}

export default function ManualTradingPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const { toast } = useToast();

  // Fetch user trades
  const { data: trades = [], refetch: refetchTrades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/trading/trades');
      return response.json();
    },
  });

  // Execute trade mutation
  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData: {
      symbol: string;
      side: 'buy' | 'sell';
      amount: number;
      type: 'market' | 'limit';
      price?: number;
    }) => {
      const response = await apiRequest('POST', '/api/trading/trade', tradeData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Trade Executed',
        description: `${side.toUpperCase()} ${amount} ${symbol} at $${data.executedPrice}`,
      });
      refetchTrades();
      setAmount('');
      setPrice('');
    },
    onError: (error: any) => {
      toast({
        title: 'Trade Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    const tradeData = {
      symbol,
      side,
      amount: parseFloat(amount),
      type,
      ...(type === 'limit' && { price: parseFloat(price) }),
    };

    executeTradeMutation.mutate(tradeData);
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
                disabled={executeTradeMutation.isPending}
              >
                {executeTradeMutation.isPending ? 'Processing...' : `${side.toUpperCase()} ${symbol}`}
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
              {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'].map((pair) => (
                <div key={pair} className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="font-medium">{pair}</span>
                  <div className="text-right">
                    <div className="font-bold">Loading...</div>
                    <div className="text-sm text-muted-foreground">24h: --</div>
                  </div>
                </div>
              ))}
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
                  trades.map((trade: Trade) => (
                    <tr key={trade.id} className="border-b">
                      <td className="p-2">{trade.symbol}</td>
                      <td className="p-2">
                        <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{trade.amount}</td>
                      <td className="p-2">${trade.price}</td>
                      <td className="p-2">
                        <span className={parseFloat(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${trade.pnl}
                        </span>
                      </td>
                      <td className="p-2">{trade.status}</td>
                      <td className="p-2">{new Date(trade.createdAt).toLocaleString()}</td>
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