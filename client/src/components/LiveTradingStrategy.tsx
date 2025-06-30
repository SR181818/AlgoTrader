import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Play, Pause, Settings, TrendingUp, TrendingDown, Activity, DollarSign, AlertTriangle } from 'lucide-react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'custom';
  parameters: {
    symbol: string;
    timeframe: string;
    stopLoss: number;
    takeProfit: number;
    riskPercentage: number;
    maxPositions: number;
  };
  conditions: {
    entry: string[];
    exit: string[];
  };
  isActive: boolean;
  performance: {
    totalTrades: number;
    winRate: number;
    pnl: number;
    maxDrawdown: number;
  };
}

interface LivePosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  timestamp: string;
}

export default function LiveTradingStrategy() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [isStrategyActive, setIsStrategyActive] = useState(false);
  const [customStrategy, setCustomStrategy] = useState({
    name: '',
    symbol: 'BTCUSDT',
    timeframe: '1h',
    stopLoss: 2,
    takeProfit: 4,
    riskPercentage: 1,
    maxPositions: 3,
    entryConditions: '',
    exitConditions: ''
  });
  const { toast } = useToast();

  // Define predefined template strategies
  const predefinedStrategies = [
    {
      id: 'trend_following_basic',
      name: 'Basic Trend Following',
      description: 'Simple moving average crossover strategy',
      type: 'trend_following',
      parameters: {
        symbol: 'BTCUSDT',
        timeframe: '1h',
        stopLoss: 2,
        takeProfit: 4,
        riskPercentage: 1,
        maxPositions: 1,
      },
      conditions: {
        entry: ['SMA_20 > SMA_50', 'RSI > 50'],
        exit: ['SMA_20 < SMA_50', 'RSI < 30']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    },
    {
      id: 'mean_reversion_rsi',
      name: 'RSI Mean Reversion',
      description: 'RSI-based mean reversion strategy',
      type: 'mean_reversion',
      parameters: {
        symbol: 'ETHUSDT',
        timeframe: '15m',
        stopLoss: 1.5,
        takeProfit: 3,
        riskPercentage: 1.5,
        maxPositions: 2,
      },
      conditions: {
        entry: ['RSI < 30', 'Price near Bollinger Lower Band'],
        exit: ['RSI > 70', 'Price near Bollinger Upper Band']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    },
    {
      id: 'momentum_macd',
      name: 'MACD Momentum',
      description: 'MACD signal line crossover strategy',
      type: 'momentum',
      parameters: {
        symbol: 'ADAUSDT',
        timeframe: '4h',
        stopLoss: 2.5,
        takeProfit: 5,
        riskPercentage: 1,
        maxPositions: 1,
      },
      conditions: {
        entry: ['MACD line crosses above Signal line', 'MACD > 0'],
        exit: ['MACD line crosses below Signal line', 'MACD < 0']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    },
    {
      id: 'bollinger_bands_squeeze',
      name: 'Bollinger Bands Squeeze',
      description: 'Volatility breakout strategy using Bollinger Bands',
      type: 'volatility',
      parameters: {
        symbol: 'SOLUSDT',
        timeframe: '30m',
        stopLoss: 2,
        takeProfit: 6,
        riskPercentage: 1.2,
        maxPositions: 1,
      },
      conditions: {
        entry: ['BB Width < 20-day average', 'Price breaks above/below BB'],
        exit: ['BB Width > 20-day average', 'Price returns to BB middle']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    },
    {
      id: 'scalping_5min',
      name: '5-Minute Scalping',
      description: 'Quick scalping strategy for short-term profits',
      type: 'scalping',
      parameters: {
        symbol: 'BTCUSDT',
        timeframe: '5m',
        stopLoss: 0.5,
        takeProfit: 1.5,
        riskPercentage: 0.5,
        maxPositions: 3,
      },
      conditions: {
        entry: ['EMA_9 > EMA_21', 'RSI between 40-60', 'Volume > 1.5x average'],
        exit: ['EMA_9 < EMA_21', 'RSI > 70 or RSI < 30']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    },
    {
      id: 'grid_trading',
      name: 'Grid Trading Strategy',
      description: 'Places buy/sell orders at regular intervals',
      type: 'grid',
      parameters: {
        symbol: 'ETHUSDT',
        timeframe: '1h',
        stopLoss: 5,
        takeProfit: 10,
        riskPercentage: 2,
        maxPositions: 5,
      },
      conditions: {
        entry: ['Price at grid level', 'Market in range'],
        exit: ['Grid level hit', 'Market breaks range']
      },
      isActive: false,
      performance: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        maxDrawdown: 0,
      },
      source: 'predefined'
    }
  ];

  // Fetch available strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ['/api/live-strategy/strategies'],
    refetchInterval: 5000,
    staleTime: 1000,
    select: (data) => {
      // Always combine saved strategies with predefined templates
      const savedStrategies = data || [];
      return [...savedStrategies, ...predefinedStrategies];
    }
  });

  // Update active state when selectedStrategy changes
  useEffect(() => {
    if (selectedStrategy && strategies) {
      const strategy = strategies.find((s: any) => s.id === selectedStrategy);
      if (strategy) {
        setIsStrategyActive(strategy.isActive || false);
      }
    } else {
      setIsStrategyActive(false);
    }
  }, [selectedStrategy, strategies]);

  // Fetch live positions  
  const { data: livePositions } = useQuery({
    queryKey: ['/api/live-strategy/live-positions'],
    refetchInterval: 2000
  });

  // Start/Stop strategy mutation
  const strategyControlMutation = useMutation({
    mutationFn: async ({ action, strategyId }: { action: 'start' | 'stop'; strategyId: string }) => {
      const response = await apiRequest('POST', `/api/live-strategy/strategy/${action}`, { strategyId });
      return response.json();
    },
    onSuccess: (data) => {
      setIsStrategyActive(data.isActive);
      toast({
        title: data.isActive ? 'Strategy Started' : 'Strategy Stopped',
        description: data.message,
      });
      // Refetch strategies to update their status
      window.location.reload(); // Simple way to refresh data
    },
    onError: (error: any) => {
      toast({
        title: 'Strategy Control Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create custom strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async (strategy: any) => {
      const response = await apiRequest('POST', '/api/live-strategy/strategies', strategy);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Strategy Created',
        description: `Custom strategy "${data.name}" created successfully`,
      });
      setSelectedStrategy(data.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Strategy Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Manual trade execution mutation
  const executeManualTradeMutation = useMutation({
    mutationFn: async (trade: { symbol: string; side: 'buy' | 'sell'; amount: number; type: 'market' | 'limit'; price?: number }) => {
      const response = await apiRequest('POST', '/api/live-strategy/manual-execute', trade);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Trade Executed',
        description: `${data.side.toUpperCase()} ${data.amount} ${data.symbol} at ${data.price}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Trade Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateStrategy = () => {
    const strategy = {
      name: customStrategy.name,
      type: 'custom',
      parameters: {
        symbol: customStrategy.symbol,
        timeframe: customStrategy.timeframe,
        stopLoss: customStrategy.stopLoss,
        takeProfit: customStrategy.takeProfit,
        riskPercentage: customStrategy.riskPercentage,
        maxPositions: customStrategy.maxPositions,
      },
      conditions: {
        entry: customStrategy.entryConditions.split('\n').filter(c => c.trim()),
        exit: customStrategy.exitConditions.split('\n').filter(c => c.trim()),
      }
    };

    createStrategyMutation.mutate(strategy);
  };

  const handleStrategyControl = (action: 'start' | 'stop') => {
    if (!selectedStrategy) {
      toast({
        title: 'No Strategy Selected',
        description: 'Please select a strategy first',
        variant: 'destructive',
      });
      return;
    }

    strategyControlMutation.mutate({ action, strategyId: selectedStrategy });
  };

  const handleManualTrade = (side: 'buy' | 'sell') => {
    const symbol = customStrategy.symbol;
    const amount = (customStrategy.riskPercentage / 100) * 1000; // Calculate position size based on risk

    executeManualTradeMutation.mutate({
      symbol,
      side,
      amount,
      type: 'market'
    });
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Live Trading Strategy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selection Dropdown */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="strategy-select">Select Trading Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger id="strategy-select">
                  <SelectValue placeholder="Choose a strategy to start trading..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies?.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No strategies available</p>
                      <p className="text-xs mt-1">Create strategies in Strategy Builder or use templates below</p>
                    </div>
                  ) : (
                    strategies?.map((strategy: any) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="font-medium">{strategy.name}</span>
                            <span className="text-xs text-gray-500">
                              {strategy.parameters?.symbol} • {strategy.parameters?.timeframe} • {strategy.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              strategy.source === 'database' ? 'bg-blue-100 text-blue-800' :
                              strategy.source === 'predefined' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {strategy.source === 'database' ? 'Custom' : 
                               strategy.source === 'predefined' ? 'Template' : 'Draft'}
                            </span>
                            {strategy.isActive && (
                              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Details Card */}
            {selectedStrategy && strategies?.find((s: any) => s.id === selectedStrategy) && (
              <div className="p-4 border rounded-lg bg-gray-50">
                {(() => {
                  const strategy = strategies.find((s: any) => s.id === selectedStrategy);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{strategy.name}</h4>
                        <Badge variant={strategy.isActive ? "default" : "secondary"}>
                          {strategy.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Symbol:</span>
                          <span className="ml-1 font-medium">{strategy.parameters?.symbol}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Timeframe:</span>
                          <span className="ml-1 font-medium">{strategy.parameters?.timeframe}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Win Rate:</span>
                          <span className="ml-1 font-medium">{strategy.performance?.winRate?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total PnL:</span>
                          <span className={`ml-1 font-medium ${
                            (strategy.performance?.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(strategy.performance?.pnl || 0) >= 0 ? '+' : ''}{(strategy.performance?.pnl || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Trading Controls */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isStrategyActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div>
                <p className="font-medium">
                  {isStrategyActive ? 'Trading Active' : 'Trading Inactive'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isStrategyActive 
                    ? 'Strategy is monitoring markets and executing trades' 
                    : selectedStrategy 
                      ? 'Ready to start trading' 
                      : 'Select a strategy to begin'
                  }
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              {!isStrategyActive ? (
                <Button
                  onClick={() => handleStrategyControl('start')}
                  disabled={!selectedStrategy || strategyControlMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {strategyControlMutation.isPending ? 'Starting...' : 'Start Trading'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleStrategyControl('stop')}
                  disabled={strategyControlMutation.isPending}
                  variant="destructive"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  {strategyControlMutation.isPending ? 'Stopping...' : 'Stop Trading'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Strategy Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Strategy Name</Label>
              <Input
                value={customStrategy.name}
                onChange={(e) => setCustomStrategy({ ...customStrategy, name: e.target.value })}
                placeholder="My Custom Strategy"
              />
            </div>

            <div>
              <Label>Trading Pair</Label>
              <Select value={customStrategy.symbol} onValueChange={(value) => setCustomStrategy({ ...customStrategy, symbol: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                  <SelectItem value="DOTUSDT">DOT/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timeframe</Label>
              <Select value={customStrategy.timeframe} onValueChange={(value) => setCustomStrategy({ ...customStrategy, timeframe: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Risk Per Trade (%)</Label>
              <Input
                type="number"
                value={customStrategy.riskPercentage}
                onChange={(e) => setCustomStrategy({ ...customStrategy, riskPercentage: parseFloat(e.target.value) })}
                min="0.1"
                max="5"
                step="0.1"
              />
            </div>

            <div>
              <Label>Stop Loss (%)</Label>
              <Input
                type="number"
                value={customStrategy.stopLoss}
                onChange={(e) => setCustomStrategy({ ...customStrategy, stopLoss: parseFloat(e.target.value) })}
                min="0.5"
                max="10"
                step="0.1"
              />
            </div>

            <div>
              <Label>Take Profit (%)</Label>
              <Input
                type="number"
                value={customStrategy.takeProfit}
                onChange={(e) => setCustomStrategy({ ...customStrategy, takeProfit: parseFloat(e.target.value) })}
                min="1"
                max="20"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <Label>Entry Conditions (one per line)</Label>
            <textarea
              className="w-full p-2 border rounded-md h-20 text-sm"
              value={customStrategy.entryConditions}
              onChange={(e) => setCustomStrategy({ ...customStrategy, entryConditions: e.target.value })}
              placeholder="RSI < 30&#10;Price > SMA_20&#10;Volume > Average_Volume * 1.5"
            />
          </div>

          <div>
            <Label>Exit Conditions (one per line)</Label>
            <textarea
              className="w-full p-2 border rounded-md h-20 text-sm"
              value={customStrategy.exitConditions}
              onChange={(e) => setCustomStrategy({ ...customStrategy, exitConditions: e.target.value })}
              placeholder="RSI > 70&#10;Price < SMA_20&#10;Stop Loss Hit"
            />
          </div>

          <Button
            onClick={handleCreateStrategy}
            disabled={!customStrategy.name || createStrategyMutation.isPending}
            className="w-full"
          >
            {createStrategyMutation.isPending ? 'Creating...' : 'Create Strategy'}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Trading Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Manual Trading</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              onClick={() => handleManualTrade('buy')}
              disabled={executeManualTradeMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Manual Buy
            </Button>
            <Button
              onClick={() => handleManualTrade('sell')}
              disabled={executeManualTradeMutation.isPending}
              variant="destructive"
              className="flex-1"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Manual Sell
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Execute trades manually for {customStrategy.symbol} with {customStrategy.riskPercentage}% risk
          </p>
        </CardContent>
      </Card>

      {/* Live Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Live Positions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {livePositions?.length > 0 ? (
            <div className="space-y-2">
              {livePositions.map((position: LivePosition) => (
                <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                      {position.side.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium">{position.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        Size: {position.size} | Entry: ${position.entryPrice}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${position.pnl.toFixed(2)} ({position.pnlPercent.toFixed(2)}%)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current: ${position.currentPrice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>No active positions</p>
              <p className="text-sm">Start a strategy or execute manual trades to see positions here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}