import React from 'react';
import { PortfolioPosition } from '../../services/PortfolioManager';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface PortfolioPositionsTableProps {
  positions: PortfolioPosition[];
  onClosePosition?: (portfolioId: string, accountId: string, symbol: string) => void;
}

export function PortfolioPositionsTable({ positions, onClosePosition }: PortfolioPositionsTableProps) {
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

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSideColor = (side: string) => {
    return side === 'long' ? 'text-green-400' : 'text-red-400';
  };

  const getSideIcon = (side: string) => {
    return side === 'long' ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Positions</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">No Open Positions</div>
          <div className="text-sm">Your portfolio positions will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Portfolio Positions</h3>
        <div className="text-sm text-gray-400 mt-1">
          {positions.length} position{positions.length !== 1 ? 's' : ''} across all accounts
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
              <th className="text-left p-4 text-gray-400 font-medium">Account</th>
              <th className="text-left p-4 text-gray-400 font-medium">Side</th>
              <th className="text-right p-4 text-gray-400 font-medium">Size</th>
              <th className="text-right p-4 text-gray-400 font-medium">Entry Price</th>
              <th className="text-right p-4 text-gray-400 font-medium">Current Price</th>
              <th className="text-right p-4 text-gray-400 font-medium">Unrealized P&L</th>
              <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => {
              const pnlPercent = ((position.currentPrice - position.averageEntryPrice) / position.averageEntryPrice) * 100;
              const adjustedPnLPercent = position.side === 'short' ? -pnlPercent : pnlPercent;
              
              return (
                <tr key={`${position.symbol}-${position.accountId}-${index}`} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-4">
                    <div className="font-medium text-white">{position.symbol}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-300">{position.accountId}</div>
                  </td>
                  <td className="p-4">
                    <div className={`flex items-center ${getSideColor(position.side)}`}>
                      {getSideIcon(position.side)}
                      <span className="ml-1 font-medium uppercase">{position.side}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{position.totalAmount.toFixed(4)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{formatCurrency(position.averageEntryPrice)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono">{formatCurrency(position.currentPrice)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className={`font-mono ${getPnLColor(position.unrealizedPnL)}`}>
                      {formatCurrency(position.unrealizedPnL)}
                    </div>
                    <div className={`text-xs ${getPnLColor(position.unrealizedPnL)}`}>
                      {formatPercent(adjustedPnLPercent)}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {onClosePosition && (
                      <button
                        onClick={() => onClosePosition(position.portfolioId, position.accountId, position.symbol)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Close Position"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-gray-700 bg-gray-700/30">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Unrealized P&L:</span>
          <span className={`font-mono font-bold ${getPnLColor(
            positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
          )}`}>
            {formatCurrency(positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}