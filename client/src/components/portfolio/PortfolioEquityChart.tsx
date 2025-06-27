import React from 'react';
import { PortfolioMetrics } from '../../services/PortfolioManager';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

interface PortfolioEquityChartProps {
  metricsHistory: PortfolioMetrics[];
}

export function PortfolioEquityChart({ metricsHistory }: PortfolioEquityChartProps) {
  // Sort metrics by timestamp
  const sortedMetrics = [...metricsHistory].sort((a, b) => a.lastUpdate - b.lastUpdate);
  
  // Prepare chart data
  const chartData = sortedMetrics.map(metrics => ({
    timestamp: metrics.lastUpdate,
    date: new Date(metrics.lastUpdate).toLocaleDateString(),
    time: new Date(metrics.lastUpdate).toLocaleTimeString(),
    equity: metrics.totalEquity,
    unrealizedPnL: metrics.totalUnrealizedPnL,
    realizedPnL: metrics.totalRealizedPnL,
    drawdown: metrics.currentDrawdown * 100
  }));

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
          <p className="text-gray-300 text-sm">{`${payload[0].payload.date} ${payload[0].payload.time}`}</p>
          <p className="text-blue-400 font-medium">
            {`Equity: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="text-green-400 font-medium">
            {`Unrealized P&L: ${formatCurrency(payload[1].value)}`}
          </p>
          <p className="text-red-400 font-medium">
            {`Drawdown: ${formatPercent(payload[2].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // If no data, show placeholder
  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Equity</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">No Equity Data Available</div>
          <div className="text-sm">Portfolio equity history will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Portfolio Equity</h3>
      
      <div className="h-80">
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
              yAxisId="pnl"
              orientation="right"
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
              hide
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Initial equity reference line */}
            <ReferenceLine 
              yAxisId="equity"
              y={chartData[0].equity} 
              stroke="#6B7280" 
              strokeDasharray="2 2"
              label={{ value: "Initial Equity", position: "insideTopLeft", fill: "#6B7280" }}
            />
            
            {/* Zero line for PnL */}
            <ReferenceLine 
              yAxisId="pnl"
              y={0} 
              stroke="#6B7280" 
              strokeDasharray="2 2"
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
            
            {/* Unrealized PnL */}
            <Line 
              yAxisId="pnl"
              type="monotone" 
              dataKey="unrealizedPnL" 
              stroke="#34D399" 
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: "#34D399" }}
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
      </div>
      
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-px bg-blue-400 mr-2"></div>
          <span className="text-gray-400">Equity</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-green-400 mr-2"></div>
          <span className="text-gray-400">Unrealized P&L</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-red-400 mr-2" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-gray-400">Drawdown %</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-px bg-gray-400 mr-2" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-gray-400">Initial Equity</span>
        </div>
      </div>
    </div>
  );
}