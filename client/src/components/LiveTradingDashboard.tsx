import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, TrendingUp, TrendingDown, DollarSign, Activity, Target, AlertTriangle } from 'lucide-react';
import { LiveStrategyRunner, StrategySignal, Position, StrategyConfig } from '../services/LiveStrategyRunner';
import { binanceMarketData, TickerData } from '../services/BinanceMarketData';

export function LiveTradingDashboard() {
  const [strategyRunner, setStrategyRunner] = useState<LiveStrategyRunner | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentTicker, setCurrentTicker] = useState<TickerData | null>(null);
  const [config, setConfig] = useState<StrategyConfig>({
    name: 'Multi-Indicator Strategy',
    symbol: 'BTCUSDT',
    enabled: true,
    riskPerTrade: 1,
    stopLoss: 2,
    takeProfit: 4,
    indicators: {
      ema20: true,
      ema50: true,
      rsi: true,
      macd: true
    }
  });

  useEffect(() => {
    // Subscribe to live ticker data
    const subscription = binanceMarketData.subscribeToTicker(config.symbol).subscribe(
      ticker => setCurrentTicker(ticker)
    );

    return () => subscription.unsubscribe();
  }, [config.symbol]);

  useEffect(() => {
    if (strategyRunner) {
      const signalSubscription = strategyRunner.getSignals().subscribe(setSignals);
      const positionSubscription = strategyRunner.getPositions().subscribe(setPositions);

      return () => {
        signalSubscription.unsubscribe();
        positionSubscription.unsubscribe();
      };
    }
  }, [strategyRunner]);

  const startStrategy = () => {
    if (!strategyRunner) {
      const runner = new LiveStrategyRunner(config);
      setStrategyRunner(runner);
      runner.start();
      setIsRunning(true);
    } else {
      strategyRunner.start();
      setIsRunning(true);
    }
  };

  const stopStrategy = () => {
    if (strategyRunner) {
      strategyRunner.stop();
      setIsRunning(false);
    }
  };

  const updateConfig = (updates: Partial<StrategyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    if (strategyRunner) {
      strategyRunner.updateConfig(newConfig);
    }
  };

  const totalPnL = positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + p.pnl, 0);

  const totalPnLPercent = positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + p.pnlPercent, 0) / Math.max(positions.filter(p => p.status === 'OPEN').length, 1);

  const winRate = positions.length > 0 
    ? (positions.filter(p => p.status === 'CLOSED' && p.pnl > 0).length / positions.filter(p => p.status === 'CLOSED').length) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Trading Strategy</h1>
          <p className="text-gray-600">Real-time Binance data with automated signals</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? "Running" : "Stopped"}
          </Badge>
          {isRunning ? (
            <Button onClick={stopStrategy} variant="outline">
              <Pause className="w-4 h-4 mr-2" />
              Stop Strategy
            </Button>
          ) : (
            <Button onClick={startStrategy}>
              <Play className="w-4 h-4 mr-2" />
              Start Strategy
            </Button>
          )}
        </div>
      </div>

      {/* Live Market Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentTicker?.price.toFixed(2) || '0.00'}
            </div>
            <div className="flex items-center text-sm">
              {currentTicker && currentTicker.changePercent > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={currentTicker && currentTicker.changePercent > 0 ? "text-green-500" : "text-red-500"}>
                {currentTicker?.changePercent.toFixed(2) || '0.00'}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${totalPnL.toFixed(2)}
            </div>
            <div className={`text-sm ${totalPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnLPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {positions.filter(p => p.status === 'OPEN').length}
            </div>
            <div className="text-sm text-gray-600">
              Active trades
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              {positions.filter(p => p.status === 'CLOSED').length} trades
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>Real-time position tracking with live PnL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positions.filter(p => p.status === 'OPEN').length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No open positions</p>
                ) : (
                  positions.filter(p => p.status === 'OPEN').map(position => (
                    <div key={position.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={position.side === 'LONG' ? 'default' : 'secondary'}>
                              {position.side}
                            </Badge>
                            <span className="font-medium">{position.symbol}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Entry: ${position.entryPrice.toFixed(2)} | Current: ${position.currentPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${position.pnl.toFixed(2)}
                          </div>
                          <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Signals</CardTitle>
              <CardDescription>Live signals from technical analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {signals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No signals generated yet</p>
                ) : (
                  signals.slice(0, 10).map(signal => (
                    <div key={signal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={signal.action === 'BUY' ? 'default' : signal.action === 'SELL' ? 'destructive' : 'secondary'}
                            >
                              {signal.action}
                            </Badge>
                            <span className="font-medium">{signal.symbol}</span>
                            <span className="text-sm text-gray-600">${signal.price.toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {signal.reason}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Confidence: {(signal.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(signal.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Configuration</CardTitle>
              <CardDescription>Customize your trading strategy parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Trading Symbol</Label>
                  <Select value={config.symbol} onValueChange={(value) => updateConfig({ symbol: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                      <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                      <SelectItem value="DOTUSDT">DOT/USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="risk">Risk Per Trade (%)</Label>
                  <Input
                    id="risk"
                    type="number"
                    value={config.riskPerTrade}
                    onChange={(e) => updateConfig({ riskPerTrade: parseFloat(e.target.value) })}
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    value={config.stopLoss}
                    onChange={(e) => updateConfig({ stopLoss: parseFloat(e.target.value) })}
                    min="0.5"
                    max="10"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    value={config.takeProfit}
                    onChange={(e) => updateConfig({ takeProfit: parseFloat(e.target.value) })}
                    min="1"
                    max="20"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Technical Indicators</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ema20"
                      checked={config.indicators.ema20}
                      onCheckedChange={(checked) => updateConfig({ indicators: { ...config.indicators, ema20: checked } })}
                    />
                    <Label htmlFor="ema20">EMA 20</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ema50"
                      checked={config.indicators.ema50}
                      onCheckedChange={(checked) => updateConfig({ indicators: { ...config.indicators, ema50: checked } })}
                    />
                    <Label htmlFor="ema50">EMA 50</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rsi"
                      checked={config.indicators.rsi}
                      onCheckedChange={(checked) => updateConfig({ indicators: { ...config.indicators, rsi: checked } })}
                    />
                    <Label htmlFor="rsi">RSI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="macd"
                      checked={config.indicators.macd}
                      onCheckedChange={(checked) => updateConfig({ indicators: { ...config.indicators, macd: checked } })}
                    />
                    <Label htmlFor="macd">MACD</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}