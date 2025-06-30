import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function LiveTradingDashboard() {
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/live-trading/dashboard'],
    refetchInterval: 2000 // Refresh every 2 seconds for real-time data
  });

  // Fetch strategies
  const { data: strategiesData } = useQuery({
    queryKey: ['/api/live-trading/strategies']
  });

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ['/api/live-trading/orders'],
    refetchInterval: 3000
  });

  // Fetch positions
  const { data: positionsData } = useQuery({
    queryKey: ['/api/live-trading/positions'],
    refetchInterval: 2000
  });

  // Execute order mutation
  const executeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/live-trading/order/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/dashboard'] });
    }
  });

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async (positionId: number) => {
      const response = await fetch('/api/live-trading/position/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/dashboard'] });
    }
  });

  const dashboard = (dashboardData as any)?.data || {};
  const strategies = (strategiesData as any)?.data || [];
  const orders = (ordersData as any)?.data || [];
  const positions = (positionsData as any)?.data || [];

  const handleQuickTrade = (symbol: string, side: 'buy' | 'sell') => {
    executeOrderMutation.mutate({
      symbol,
      side,
      amount: 0.001,
      orderType: 'market'
    });
  };

  const handleClosePosition = (positionId: number) => {
    closePositionMutation.mutate(positionId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPnL = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  if (isDashboardLoading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Live Trading Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live Data</span>
          </div>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboard.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPnL(dashboard.totalPnl || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized + Unrealized P&L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.openPositionsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active trading positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Orders executed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Market Prices */}
      {dashboard.marketPrices && (
        <Card>
          <CardHeader>
            <CardTitle>Live Market Prices</CardTitle>
            <CardDescription>Real-time cryptocurrency prices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(dashboard.marketPrices).map(([symbol, price]: [string, any]) => (
                <div key={symbol} className="flex flex-col items-center space-y-2 p-3 border rounded-lg">
                  <div className="font-semibold">{symbol.replace('USDT', '')}</div>
                  <div className="text-lg font-bold">${typeof price === 'number' ? price.toFixed(2) : price}</div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleQuickTrade(symbol, 'buy')}
                      disabled={executeOrderMutation.isPending}
                    >
                      Buy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleQuickTrade(symbol, 'sell')}
                      disabled={executeOrderMutation.isPending}
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Trading Interface */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active trading positions with real-time P&L</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open positions. Start trading to see your positions here.
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((position: any) => (
                    <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={position.side === 'buy' ? 'default' : 'secondary'}>
                          {position.side.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{position.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            Amount: {position.amount} | Entry: ${parseFloat(position.entryPrice).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {position.currentPrice && (
                          <div className="text-right">
                            <div className="font-semibold">
                              Current: ${parseFloat(position.currentPrice).toFixed(2)}
                            </div>
                            {position.unrealizedPnl && (
                              <div className={`text-sm ${parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                P&L: {formatPnL(parseFloat(position.unrealizedPnl))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleClosePosition(position.id)}
                          disabled={closePositionMutation.isPending}
                        >
                          Close Position
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your trading order history</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet. Execute your first trade to see orders here.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                          {order.side.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{order.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.orderType} | Amount: {order.amount}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-semibold">${parseFloat(order.price).toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <Badge variant={
                          order.status === 'filled' ? 'default' : 
                          order.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }>
                          {order.status === 'filled' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {order.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Strategies</CardTitle>
              <CardDescription>Your automated trading strategies</CardDescription>
            </CardHeader>
            <CardContent>
              {strategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No strategies found.</p>
                  <p className="text-sm mt-2">Create strategies in the Strategy Builder to automate your trading.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy: any) => (
                    <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">{strategy.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {strategy.description || `${strategy.type} strategy for ${strategy.symbol}`}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge variant={strategy.isActive ? 'default' : 'secondary'}>
                          {strategy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        
                        <Button 
                          size="sm" 
                          variant={strategy.isActive ? 'outline' : 'default'}
                          disabled
                        >
                          {strategy.isActive ? 'Stop' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Messages */}
      {(executeOrderMutation.isError || closePositionMutation.isError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{executeOrderMutation.error?.message || closePositionMutation.error?.message || 'An error occurred'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {executeOrderMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>Order executed successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}