import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { BacktestResult } from '../trading/Backtester';

interface EquityCurveChartProps {
  results: BacktestResult;
}

export function EquityCurveChart({ results }: EquityCurveChartProps) {
  const chartData = results.equity.map(point => ({
    timestamp: point.timestamp,
    date: new Date(point.timestamp).toLocaleDateString(),
    equity: point.value,
    drawdown: calculateDrawdown(point.value, results.equity.slice(0, results.equity.indexOf(point) + 1))
  }));

  function calculateDrawdown(currentValue: number, equityHistory: Array<{ value: number }>): number {
    const peak = Math.max(...equityHistory.map(e => e.value));
    return ((currentValue - peak) / peak) * 100;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{`Date: ${label}`}</p>
          <p className="text-blue-400 font-medium">
            {`Equity: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="text-red-400 font-medium">
            {`Drawdown: ${formatPercent(payload[1].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="equity"
            orientation="left"
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <YAxis 
            yAxisId="drawdown"
            orientation="right"
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={formatPercent}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Initial balance reference line */}
          <ReferenceLine 
            yAxisId="equity"
            y={results.equity[0].value} 
            stroke="#6B7280" 
            strokeDasharray="2 2"
            label={{ value: "Initial Balance", position: "topLeft", fill: "#6B7280" }}
          />
          
          {/* Equity curve */}
          <Line 
            yAxisId="equity"
            type="monotone" 
            dataKey="equity" 
            stroke="#60A5FA" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#60A5FA" }}
          />
          
          {/* Drawdown */}
          <Line 
            yAxisId="drawdown"
            type="monotone" 
            dataKey="drawdown" 
            stroke="#EF4444" 
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-px bg-blue-400 mr-2"></div>
          <span className="text-gray-400">Equity Curve</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-red-400 mr-2" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-gray-400">Drawdown %</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-gray-400 mr-2" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-gray-400">Initial Balance</span>
        </div>
      </div>
    </div>
  );
}