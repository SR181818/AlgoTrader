import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PnLGaugeProps {
  currentPnL: number;
  dailyPnL: number;
  totalPnL: number;
  accountBalance: number;
}

export function PnLGauge({ currentPnL, dailyPnL, totalPnL, accountBalance }: PnLGaugeProps) {
  const currentPnLPercent = (currentPnL / accountBalance) * 100;
  const dailyPnLPercent = (dailyPnL / accountBalance) * 100;
  const totalPnLPercent = (totalPnL / accountBalance) * 100;

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getIcon = (value: number) => {
    if (value > 0) return <TrendingUp size={20} />;
    if (value < 0) return <TrendingDown size={20} />;
    return <Minus size={20} />;
  };

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

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">P&L Overview</h3>
        <div className="text-sm text-gray-400">
          Balance: {formatCurrency(accountBalance)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current P&L */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Current P&L</span>
            <div className={getColorClass(currentPnL)}>
              {getIcon(currentPnL)}
            </div>
          </div>
          <div className={`text-2xl font-bold ${getColorClass(currentPnL)}`}>
            {formatCurrency(currentPnL)}
          </div>
          <div className={`text-sm ${getColorClass(currentPnL)}`}>
            {formatPercent(currentPnLPercent)}
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Daily P&L</span>
            <div className={getColorClass(dailyPnL)}>
              {getIcon(dailyPnL)}
            </div>
          </div>
          <div className={`text-2xl font-bold ${getColorClass(dailyPnL)}`}>
            {formatCurrency(dailyPnL)}
          </div>
          <div className={`text-sm ${getColorClass(dailyPnL)}`}>
            {formatPercent(dailyPnLPercent)}
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total P&L</span>
            <div className={getColorClass(totalPnL)}>
              {getIcon(totalPnL)}
            </div>
          </div>
          <div className={`text-2xl font-bold ${getColorClass(totalPnL)}`}>
            {formatCurrency(totalPnL)}
          </div>
          <div className={`text-sm ${getColorClass(totalPnL)}`}>
            {formatPercent(totalPnLPercent)}
          </div>
        </div>
      </div>

      {/* P&L Gauge Visualization */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>-10%</span>
          <span>0%</span>
          <span>+10%</span>
        </div>
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-gray-600 to-green-500"></div>
          
          {/* Current position indicator */}
          <div 
            className="absolute top-0 w-1 h-full bg-white shadow-lg"
            style={{ 
              left: `${Math.max(0, Math.min(100, (currentPnLPercent + 10) * 5))}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
        <div className="text-center mt-2 text-xs text-gray-400">
          Current Position: {formatPercent(currentPnLPercent)}
        </div>
      </div>
    </div>
  );
}