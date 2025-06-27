import React from 'react';
import { PortfolioTrade } from '../../services/PortfolioManager';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PortfolioTradesTableProps {
  trades: PortfolioTrade[];
}

export function PortfolioTradesTable({ trades }: PortfolioTradesTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-400" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">No Trades Yet</div>
          <div className="text-sm">Your portfolio trades will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
              <th className="text-left p-4 text-gray-400 font-medium">Account</th>
              <th className="text-left p-4 text-gray-400 font-medium">Side</th>
              <th className="text-right p-4 text-gray-400 font-medium">Amount</th>
              <th className="text-right p-4 text-gray-400 font-medium">Price</th>
              <th className="text-right p-4 text-gray-400 font-medium">P&L</th>
              <th className="text-right p-4 text-gray-400 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-4">
                  <div className="flex items-center">
                    {getStatusIcon(trade.status)}
                    <span className="ml-2 text-white capitalize">{trade.status}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-white font-medium">{trade.symbol}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-300">{trade.accountId}</div>
                </td>
                <td className="p-4">
                  <span className={`flex items-center ${
                    trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.side === 'buy' ? <ArrowUpCircle size={16} className="mr-1" /> : <ArrowDownCircle size={16} className="mr-1" />}
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="text-white font-mono">{trade.amount.toFixed(4)}</div>
                </td>
                <td className="p-4 text-right">
                  <div className="text-white font-mono">{formatCurrency(trade.price)}</div>
                </td>
                <td className="p-4 text-right">
                  {trade.pnl !== undefined ? (
                    <div className={`font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(trade.pnl)}
                    </div>
                  ) : (
                    <div className="text-gray-400">-</div>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="text-gray-400 text-sm">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}