import React, { useState } from 'react';
import { PortfolioRiskLimits } from '../../services/PortfolioManager';
import { AlertTriangle, Save, ShieldCheck, AlertCircle } from 'lucide-react';

interface PortfolioRiskPanelProps {
  riskLimits: PortfolioRiskLimits;
  riskAssessment: {
    approved: boolean;
    riskScore: number;
    warnings: string[];
    restrictions: string[];
  };
  onUpdateRiskLimits: (updates: Partial<PortfolioRiskLimits>) => void;
}

export function PortfolioRiskPanel({ 
  riskLimits, 
  riskAssessment, 
  onUpdateRiskLimits 
}: PortfolioRiskPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLimits, setEditedLimits] = useState<PortfolioRiskLimits>(riskLimits);

  const handleInputChange = (field: keyof PortfolioRiskLimits, value: string) => {
    setEditedLimits({
      ...editedLimits,
      [field]: parseFloat(value)
    });
  };

  const handleSave = () => {
    onUpdateRiskLimits(editedLimits);
    setIsEditing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheck className="text-blue-400 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-white">Portfolio Risk Management</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
              riskAssessment.approved ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
            }`}>
              {riskAssessment.approved ? 'Approved' : 'Restricted'}
            </div>
            
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${getRiskScoreColor(riskAssessment.riskScore)} bg-gray-700/50`}>
              Risk Score: {riskAssessment.riskScore}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Risk Limits */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">Risk Limits</h4>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
              >
                Edit Limits
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors"
              >
                <Save size={14} className="mr-1" />
                Save Changes
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Max Total Exposure</div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedLimits.maxTotalExposure}
                  onChange={(e) => handleInputChange('maxTotalExposure', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatCurrency(riskLimits.maxTotalExposure)}</div>
              )}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Max Single Position</div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedLimits.maxSinglePositionSize}
                  onChange={(e) => handleInputChange('maxSinglePositionSize', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatCurrency(riskLimits.maxSinglePositionSize)}</div>
              )}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Max Correlated Exposure</div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedLimits.maxCorrelatedExposure}
                  onChange={(e) => handleInputChange('maxCorrelatedExposure', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatCurrency(riskLimits.maxCorrelatedExposure)}</div>
              )}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Max Daily Loss</div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedLimits.maxDailyLoss}
                  onChange={(e) => handleInputChange('maxDailyLoss', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatCurrency(riskLimits.maxDailyLoss)}</div>
              )}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Max Drawdown</div>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={editedLimits.maxDrawdown}
                  onChange={(e) => handleInputChange('maxDrawdown', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatPercent(riskLimits.maxDrawdown)}</div>
              )}
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-1">Emergency Stop Loss</div>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={editedLimits.emergencyStopLoss}
                  onChange={(e) => handleInputChange('emergencyStopLoss', e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="text-white font-medium">{formatPercent(riskLimits.emergencyStopLoss)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Risk Warnings & Restrictions */}
        {(riskAssessment.warnings.length > 0 || riskAssessment.restrictions.length > 0) && (
          <div>
            <h4 className="text-white font-medium mb-3">Risk Alerts</h4>
            
            {riskAssessment.restrictions.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center text-red-400 mb-2">
                  <AlertTriangle size={16} className="mr-1" />
                  <span className="font-medium">Restrictions</span>
                </div>
                <div className="space-y-1">
                  {riskAssessment.restrictions.map((restriction, index) => (
                    <div key={index} className="bg-red-600/20 border border-red-600/30 rounded px-3 py-2 text-sm text-red-300">
                      {restriction}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {riskAssessment.warnings.length > 0 && (
              <div>
                <div className="flex items-center text-yellow-400 mb-2">
                  <AlertCircle size={16} className="mr-1" />
                  <span className="font-medium">Warnings</span>
                </div>
                <div className="space-y-1">
                  {riskAssessment.warnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-600/20 border border-yellow-600/30 rounded px-3 py-2 text-sm text-yellow-300">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}