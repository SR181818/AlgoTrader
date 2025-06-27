import React, { useState, useEffect } from 'react';
import { liveMarketDataService } from '../services/LiveMarketDataService';
import { Wifi, WifiOff, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function WebSocketMonitor() {
  const [connectionStatus, setConnectionStatus] = useState<{
    status: string;
    message?: string;
  }>({ status: 'disconnected' });
  
  const [stats, setStats] = useState({
    activeConnections: 0,
    activeStreams: 0,
    totalReconnectAttempts: 0,
    uptime: 0
  });

  useEffect(() => {
    // Subscribe to connection status updates
    const statusSubscription = liveMarketDataService.getConnectionStatus().subscribe(status => {
      setConnectionStatus(status);
    });
    
    // Update stats periodically
    const statsInterval = setInterval(() => {
      // In a real implementation, we would get stats from the service
      // For now, we'll simulate some stats
      setStats({
        activeConnections: Math.floor(Math.random() * 5) + 1,
        activeStreams: Math.floor(Math.random() * 10) + 1,
        totalReconnectAttempts: Math.floor(Math.random() * 5),
        uptime: Date.now() - (Date.now() - Math.floor(Math.random() * 3600000))
      });
    }, 1000);
    
    return () => {
      statusSubscription.unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'connecting':
      case 'reconnecting':
        return <Clock size={16} className="text-yellow-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <WifiOff size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'error':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Activity className="text-blue-400 mr-2" size={18} />
          <h3 className="text-white font-medium">WebSocket Monitor</h3>
        </div>
        
        <div className={`flex items-center px-2 py-1 rounded border ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-1 text-xs font-medium">
            {connectionStatus.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-400">Connections</div>
          <div className="text-lg font-bold text-white">{stats.activeConnections}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-400">Streams</div>
          <div className="text-lg font-bold text-white">{stats.activeStreams}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-400">Reconnects</div>
          <div className="text-lg font-bold text-white">{stats.totalReconnectAttempts}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-400">Uptime</div>
          <div className="text-lg font-bold text-white">
            {stats.uptime > 0 ? formatUptime(stats.uptime) : '-'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {connectionStatus.message && connectionStatus.status === 'error' && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <AlertCircle size={16} className="text-red-400 mr-2" />
            <span className="text-red-400 text-sm font-medium">Connection Error</span>
          </div>
          <div className="text-red-300 text-xs mt-1">{connectionStatus.message}</div>
        </div>
      )}

      {/* No Connections Message */}
      {stats.activeConnections === 0 && (
        <div className="text-center text-gray-400 py-4">
          <Wifi size={24} className="mx-auto mb-2 opacity-50" />
          <div className="text-sm">No active connections</div>
        </div>
      )}
    </div>
  );
}