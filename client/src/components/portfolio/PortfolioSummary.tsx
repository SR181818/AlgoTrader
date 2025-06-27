import React from 'react';
import { PortfolioMetrics } from '../../services/PortfolioManager';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';

interface PortfolioSummaryProps {
  metrics: PortfolioMetrics;
}

export function PortfolioSummary({ metrics }: PortfolioSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Portfolio Summary</h2>
        <div className="text-sm text-gray-400">
          Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Equity</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalEquity)}</div>
            </div>
            <DollarSign className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Return</div>
              <div className={`text-2xl font-bold ${getColorClass(metrics.totalReturn)}`}>
                {formatCurrency(metrics.totalReturn)}
              </div>
              <div className={`text-xs ${getColorClass(metrics.totalReturnPercent)}`}>
                {formatPercent(metrics.totalReturnPercent)}
              </div>
            </div>
            {metrics.totalReturn >= 0 ? 
              <TrendingUp className="text-green-400" size={24} /> :
              <TrendingDown className="text-red-400" size={24} />
            }
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Daily P&L</div>
              <div className={`text-2xl font-bold ${getColorClass(metrics.dailyPnL)}`}>
                {formatCurrency(metrics.dailyPnL)}
              </div>
            </div>
            {metrics.dailyPnL >= 0 ? 
              <TrendingUp className="text-green-400" size={24} /> :
              <TrendingDown className="text-red-400" size={24} />
            }
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Drawdown</div>
              <div className="text-2xl font-bold text-red-400">
                {formatPercent(metrics.currentDrawdown * 100)}
              </div>
            </div>
            <AlertTriangle className="text-red-400" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-white font-medium mb-3">Performance Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Win Rate:</span>
              <span className="text-white">{metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Trades:</span>
              <span className="text-white">{metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Positions:</span>
              <span className="text-white">{metrics.activePositions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sharpe Ratio:</span>
              <span className="text-white">{metrics.sharpeRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white font-medium mb-3">Risk Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Utilization:</span>
              <span className={`${metrics.riskUtilization > 80 ? 'text-red-400' : 'text-white'}`}>
                {metrics.riskUtilization.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Unrealized P&L:</span>
              <span className={getColorClass(metrics.totalUnrealizedPnL)}>
                {formatCurrency(metrics.totalUnrealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Realized P&L:</span>
              <span className={getColorClass(metrics.totalRealizedPnL)}>
                {formatCurrency(metrics.totalRealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Drawdown:</span>
              <span className="text-red-400">{formatPercent(metrics.maxDrawdown * 100)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}