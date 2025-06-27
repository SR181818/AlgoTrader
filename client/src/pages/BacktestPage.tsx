import React, { useState } from 'react';
import { BacktestDashboard } from '../components/BacktestDashboard';
import { BacktestResult } from '../trading/Backtester';
import { EquityCurveChart } from '../components/EquityCurveChart';

export default function BacktestPage() {
  const [results, setResults] = useState<BacktestResult | null>(null);
  
  const handleResultsGenerated = (newResults: BacktestResult) => {
    setResults(newResults);
  };
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Backtesting Dashboard</h1>
        <div className="text-sm text-gray-400">
          Test your strategies against historical data
        </div>
      </div>
      
      <div className="space-y-8">
        <BacktestDashboard onResultsGenerated={handleResultsGenerated} />
      </div>
    </div>
  );
}