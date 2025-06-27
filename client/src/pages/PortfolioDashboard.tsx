import React, { useState } from 'react';
import { usePortfolioManager } from '../hooks/usePortfolioManager';
import { PortfolioSummary } from '../components/portfolio/PortfolioSummary';
import { PortfolioPositionsTable } from '../components/portfolio/PortfolioPositionsTable';
import { PortfolioAllocationChart } from '../components/portfolio/PortfolioAllocationChart';
import { PortfolioRiskPanel } from '../components/portfolio/PortfolioRiskPanel';
import { PortfolioTradesTable } from '../components/portfolio/PortfolioTradesTable';
import { PortfolioEquityChart } from '../components/portfolio/PortfolioEquityChart';
import { PortfolioAlertsList } from '../components/portfolio/PortfolioAlertsList';
import { AccountsTable } from '../components/portfolio/AccountsTable';
import { Briefcase, Plus, RefreshCw, Settings } from 'lucide-react';

export function PortfolioDashboard() {
  const {
    accounts,
    portfolios,
    selectedPortfolioId,
    setSelectedPortfolioId,
    portfolioMetrics,
    getPortfolioPositions,
    getPortfolioAllocations,
    getPortfolioTrades,
    getPortfolioRiskLimits,
    getPortfolioRiskAssessment,
    updatePortfolioRiskLimits,
    alerts,
    markAlertAsRead,
    clearAllAlerts,
  } = usePortfolioManager();

  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);

  // Get data for selected portfolio
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const selectedMetrics = selectedPortfolioId ? portfolioMetrics.get(selectedPortfolioId) : null;
  const positions = selectedPortfolioId ? getPortfolioPositions(selectedPortfolioId) : [];
  const allocations = selectedPortfolioId ? getPortfolioAllocations(selectedPortfolioId) : [];
  const trades = selectedPortfolioId ? getPortfolioTrades(selectedPortfolioId) : [];
  const riskLimits = selectedPortfolioId ? getPortfolioRiskLimits(selectedPortfolioId) : null;
  const riskAssessment = selectedPortfolioId ? getPortfolioRiskAssessment(selectedPortfolioId) : null;

  // Create account name lookup
  const accountNames: Record<string, string> = {};
  accounts.forEach(account => {
    accountNames[account.id] = account.name;
  });

  // Handle portfolio selection
  const handlePortfolioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPortfolioId(e.target.value);
  };

  // Handle risk limits update
  const handleUpdateRiskLimits = (updates: any) => {
    if (selectedPortfolioId) {
      updatePortfolioRiskLimits(selectedPortfolioId, updates);
    }
  };

  // Mock function for position closing (would be implemented with OrderExecutor)
  const handleClosePosition = (portfolioId: string, accountId: string, symbol: string) => {
    console.log(`Closing position: ${symbol} in account ${accountId} for portfolio ${portfolioId}`);
    // In a real implementation, this would call the OrderExecutor to close the position
  };

  // Mock function for account editing
  const handleEditAccount = (account: any) => {
    console.log('Edit account:', account);
    // In a real implementation, this would open a modal to edit the account
  };

  // Mock function for account deletion
  const handleDeleteAccount = (accountId: string) => {
    console.log('Delete account:', accountId);
    // In a real implementation, this would confirm and delete the account
  };

  if (!selectedPortfolio || !selectedMetrics) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Briefcase className="text-blue-400 mr-2" size={24} />
            <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
          </div>
          
          <button
            onClick={() => setShowCreatePortfolioModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Create Portfolio
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="text-xl text-gray-300 mb-4">No Portfolio Selected</div>
          <p className="text-gray-400 mb-6">Please select or create a portfolio to get started</p>
          
          {portfolios.length > 0 ? (
            <div className="max-w-md mx-auto">
              <label className="block text-sm text-gray-300 mb-2">Select a Portfolio</label>
              <select
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                onChange={handlePortfolioChange}
                value=""
              >
                <option value="" disabled>Select a portfolio</option>
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={() => setShowCreatePortfolioModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Create Your First Portfolio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Briefcase className="text-blue-400 mr-2" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedPortfolio.name}</h1>
            {selectedPortfolio.description && (
              <p className="text-gray-400 text-sm">{selectedPortfolio.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 pr-8"
              value={selectedPortfolioId}
              onChange={handlePortfolioChange}
            >
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowAccountsModal(true)}
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Settings size={16} className="mr-2" />
            Manage Accounts
          </button>
          
          <button
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Summary and Equity Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioSummary metrics={selectedMetrics} />
          <PortfolioEquityChart metricsHistory={[selectedMetrics]} />
        </div>
        
        {/* Positions and Allocations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioPositionsTable 
              positions={positions}
              onClosePosition={handleClosePosition}
            />
          </div>
          <div>
            <PortfolioAllocationChart 
              allocations={allocations}
              accountNames={accountNames}
            />
          </div>
        </div>
        
        {/* Risk Management and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {riskLimits && riskAssessment && (
              <PortfolioRiskPanel 
                riskLimits={riskLimits}
                riskAssessment={riskAssessment}
                onUpdateRiskLimits={handleUpdateRiskLimits}
              />
            )}
          </div>
          <div>
            <PortfolioAlertsList 
              alerts={alerts}
              onMarkAsRead={markAlertAsRead}
              onClearAll={clearAllAlerts}
            />
          </div>
        </div>
        
        {/* Recent Trades */}
        <PortfolioTradesTable trades={trades} />
      </div>

      {/* Accounts Modal (would be implemented with a proper modal component) */}
      {showAccountsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Manage Accounts</h2>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <AccountsTable 
              accounts={accounts}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
            />
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAccountsModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}