import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { binanceMarketData, TickerData } from '../services/BinanceMarketData';

interface LivePriceDisplayProps {
  symbols?: string[];
  compact?: boolean;
}

export function LivePriceDisplay({ symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'], compact = false }: LivePriceDisplayProps) {
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());

  useEffect(() => {
    const subscriptions = symbols.map(symbol => 
      binanceMarketData.subscribeToTicker(symbol).subscribe(
        ticker => {
          setTickers(prev => new Map(prev.set(symbol, ticker)));
        }
      )
    );

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [symbols]);

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {symbols.map(symbol => {
          const ticker = tickers.get(symbol);
          if (!ticker) return null;

          return (
            <Card key={symbol} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{symbol.replace('USDT', '/USDT')}</div>
                  <div className="text-2xl font-bold">${ticker.price.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <Badge variant={ticker.changePercent >= 0 ? "default" : "destructive"}>
                    {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                  </Badge>
                  <div className="text-sm text-gray-500 mt-1">
                    {ticker.changePercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 inline text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 inline text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {symbols.map(symbol => {
        const ticker = tickers.get(symbol);
        if (!ticker) {
          return (
            <Card key={symbol}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>{symbol.replace('USDT', '/USDT')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-500">Loading...</div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={symbol}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>{symbol.replace('USDT', '/USDT')}</span>
                </div>
                <Badge variant={ticker.changePercent >= 0 ? "default" : "destructive"}>
                  {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">${ticker.price.toFixed(2)}</div>
                  <div className="flex items-center space-x-2 text-sm">
                    {ticker.changePercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={ticker.changePercent >= 0 ? "text-green-500" : "text-red-500"}>
                      ${ticker.change.toFixed(2)} (24h)
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">24h Volume:</span>
                    <span className="font-medium">{ticker.volume.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Update:</span>
                    <span className="font-medium">
                      {new Date(ticker.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}