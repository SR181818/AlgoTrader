import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CandleData, TechnicalIndicators } from '../types/trading';

interface PriceChartProps {
  data: CandleData[];
  indicators: TechnicalIndicators | null;
  symbol: string;
  timeframe?: string;
}

export function PriceChart({ data, indicators, symbol, timeframe = '15m' }: PriceChartProps) {
  const chartData = data.slice(-50).map((candle, index) => ({
    time: new Date(candle.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    price: candle.close,
    high: candle.high,
    low: candle.low,
    index
  }));

  // Determine decimal places for price formatting
  const getDecimalPlaces = (symbol: string) => {
    if (symbol.includes('JPY')) return 3;
    if (symbol.includes('USDT') || symbol.startsWith('XAU') || symbol.startsWith('XAG') || symbol.startsWith('WTI')) return 2;
    return 5; // Forex pairs
  };

  const decimalPlaces = getDecimalPlaces(symbol);
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{symbol} Price Chart</h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">{timeframe} Timeframe</div>
          <div className="text-sm text-green-400">● Live CCXT Data</div>
          {indicators?.bb.expansion && (
            <div className={`text-xs px-2 py-1 rounded ${
              indicators.bb.expansion === 'expanding' ? 'bg-red-600/20 text-red-400' :
              indicators.bb.expansion === 'contracting' ? 'bg-green-600/20 text-green-400' :
              'bg-gray-600/20 text-gray-400'
            }`}>
              BB {indicators.bb.expansion}
            </div>
          )}
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              domain={['dataMin - 100', 'dataMax + 100']}
              tickFormatter={(value) => `$${value.toLocaleString('en-US', { 
                minimumFractionDigits: decimalPlaces,
                maximumFractionDigits: decimalPlaces
              })}`}
            />
            
            {/* Bollinger Bands */}
            {indicators && (
              <>
                <ReferenceLine 
                  y={indicators.bb.upper} 
                  stroke="#EF4444" 
                  strokeDasharray="2 2"
                  label={{ value: "Upper BB", position: "topRight", fill: "#EF4444" }}
                />
                <ReferenceLine 
                  y={indicators.bb.middle} 
                  stroke="#F59E0B" 
                  strokeDasharray="2 2"
                  label={{ value: "Middle BB", position: "topRight", fill: "#F59E0B" }}
                />
                <ReferenceLine 
                  y={indicators.bb.lower} 
                  stroke="#10B981" 
                  strokeDasharray="2 2"
                  label={{ value: "Lower BB", position: "topRight", fill: "#10B981" }}
                />
                
                {/* SAR levels if available */}
                {indicators.sar && (
                  <ReferenceLine 
                    y={indicators.sar.value} 
                    stroke={indicators.sar.trend === 'bullish' ? '#10B981' : '#EF4444'} 
                    strokeDasharray="1 1"
                    label={{ 
                      value: `SAR ${indicators.sar.trend}`, 
                      position: "topLeft", 
                      fill: indicators.sar.trend === 'bullish' ? '#10B981' : '#EF4444' 
                    }}
                  />
                )}
              </>
            )}
            
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#60A5FA" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#60A5FA" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-px bg-red-400 mr-2"></div>
          <span className="text-gray-400">Upper BB</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-yellow-400 mr-2"></div>
          <span className="text-gray-400">Middle BB</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-green-400 mr-2"></div>
          <span className="text-gray-400">Lower BB</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-blue-400 mr-2"></div>
          <span className="text-gray-400">Price</span>
        </div>
        {indicators?.sar && (
          <div className="flex items-center">
            <div className={`w-3 h-px mr-2 ${indicators.sar.trend === 'bullish' ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-400">SAR</span>
          </div>
        )}
      </div>
    </div>
  );
}