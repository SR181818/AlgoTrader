import React from 'react';
import { AlertCircle, AlertTriangle, Bell, CheckCircle } from 'lucide-react';

interface PortfolioAlert {
  id: string;
  portfolioId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  timestamp: number;
}

interface PortfolioAlertsListProps {
  alerts: PortfolioAlert[];
  onMarkAsRead: (alertId: string) => void;
  onClearAll: () => void;
}

export function PortfolioAlertsList({ alerts, onMarkAsRead, onClearAll }: PortfolioAlertsListProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle size={16} className="text-red-400" />;
      case 'medium':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'low':
        return <Bell size={16} className="text-blue-400" />;
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-600/20 border-red-600/30';
      case 'medium':
        return 'bg-yellow-600/20 border-yellow-600/30';
      case 'low':
        return 'bg-blue-600/20 border-blue-600/30';
      default:
        return 'bg-gray-600/20 border-gray-600/30';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Risk Alerts</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">No Alerts</div>
          <div className="text-sm">Risk alerts will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="text-blue-400 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-white">Risk Alerts</h3>
        </div>
        
        <button
          onClick={onClearAll}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`rounded-lg border p-3 ${getSeverityClass(alert.severity)} ${
                alert.isRead ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {getSeverityIcon(alert.severity)}
                  <span className={`ml-2 font-medium ${
                    alert.severity === 'high' ? 'text-red-400' :
                    alert.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Alert
                  </span>
                </div>
                <div className="text-gray-400 text-xs">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
              
              <div className={`text-sm ${
                alert.severity === 'high' ? 'text-red-300' :
                alert.severity === 'medium' ? 'text-yellow-300' :
                'text-blue-300'
              }`}>
                {alert.message}
              </div>
              
              {!alert.isRead && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => onMarkAsRead(alert.id)}
                    className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    Mark as read
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}