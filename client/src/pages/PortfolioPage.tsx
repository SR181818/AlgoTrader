import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PortfolioData {
  balance: Record<string, number>;
  freeBalance: Record<string, number>;
  usedBalance: Record<string, number>;
  positions: Array<{
    symbol: string;
    side: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
  }>;
  totalTrades: number;
  equity: number;
}

export default function PortfolioPage() {
  const { toast } = useToast();

  // Fetch portfolio data
  const { 
    data: portfolio, 
    isLoading, 
    error,
    refetch 
  } = useQuery<PortfolioData>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/trading/portfolio');
      return response.json();
    },
    retry: false,
  });

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p>Loading portfolio data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Portfolio Unavailable</h3>
                <p className="text-muted-foreground mt-2">
                  {error.message || 'Unable to load portfolio data'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please ensure your Binance API credentials are configured in Settings.
                </p>
              </div>
              <Button onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalBalance = portfolio ? Object.values(portfolio.balance).reduce((sum, val) => sum + val, 0) : 0;
  const totalFree = portfolio ? Object.values(portfolio.freeBalance).reduce((sum, val) => sum + val, 0) : 0;
  const totalUsed = portfolio ? Object.values(portfolio.usedBalance).reduce((sum, val) => sum + val, 0) : 0;
  const totalPnL = portfolio ? portfolio.positions.reduce((sum, pos) => sum + pos.pnl, 0) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Portfolio Overview</h1>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Free Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalFree)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total PnL</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPnL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{portfolio?.totalTrades || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio && Object.entries(portfolio.balance).map(([asset, balance]) => {
              if (balance <= 0.00001) return null;
              
              const free = portfolio.freeBalance[asset] || 0;
              const used = portfolio.usedBalance[asset] || 0;
              
              return (
                <div key={asset} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{asset}</span>
                    <Badge variant="outline">{formatNumber(balance)}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Free:</span>
                      <span>{formatNumber(free)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>{formatNumber(used)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {portfolio && Object.keys(portfolio.balance).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No assets found in your portfolio
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Entry Price</th>
                  <th className="text-left p-2">Mark Price</th>
                  <th className="text-left p-2">PnL</th>
                </tr>
              </thead>
              <tbody>
                {portfolio && portfolio.positions.length > 0 ? (
                  portfolio.positions.map((position, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{position.symbol}</td>
                      <td className="p-2">
                        <Badge 
                          variant={position.side === 'long' ? 'default' : 'destructive'}
                        >
                          {position.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2">{formatNumber(position.size)}</td>
                      <td className="p-2">{formatCurrency(position.entryPrice)}</td>
                      <td className="p-2">{formatCurrency(position.markPrice)}</td>
                      <td className="p-2">
                        <span className={position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(position.pnl)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted-foreground">
                      No open positions
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