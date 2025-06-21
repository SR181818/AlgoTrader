import React, { useState, useEffect } from 'react';
import { Plugin, PluginStatus } from '../models/PluginModel';
import { CheckCircle, XCircle, AlertTriangle, Eye, Settings, Shield, DollarSign, Users, Package } from 'lucide-react';

interface PluginAdminDashboardProps {
  userId: string;
}

export function PluginAdminDashboard({ userId }: PluginAdminDashboardProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pendingPlugins, setPendingPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'review' | 'plugins' | 'users' | 'settings'>('review');
  
  // Fetch plugins on mount
  useEffect(() => {
    const fetchPlugins = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, this would be an API call
        // For this example, we'll use the sample data from PluginService
        
        // Create plugin service instance
        const { PluginService } = await import('../services/PluginService');
        const pluginService = new PluginService();
        
        // Fetch all plugins
        const allPlugins = await pluginService.getPlugins();
        setPlugins(allPlugins);
        
        // Fetch pending review plugins
        const pending = await pluginService.getPlugins({
          status: 'pending-review'
        });
        setPendingPlugins(pending);
      } catch (error) {
        console.error('Failed to fetch plugins:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlugins();
  }, []);
  
  const getStatusColor = (status: PluginStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-600/20 text-gray-400';
      case 'pending-review':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'approved':
        return 'bg-green-600/20 text-green-400';
      case 'rejected':
        return 'bg-red-600/20 text-red-400';
      case 'published':
        return 'bg-blue-600/20 text-blue-400';
      case 'deprecated':
        return 'bg-purple-600/20 text-purple-400';
      case 'suspended':
        return 'bg-orange-600/20 text-orange-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };
  
  const handleApprovePlugin = (pluginId: string) => {
    // In a real implementation, this would be an API call
    console.log('Approve plugin:', pluginId);
    
    // For this example, we'll just update the local state
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, status: 'approved' } : p
    ));
    
    setPendingPlugins(prev => prev.filter(p => p.id !== pluginId));
  };
  
  const handleRejectPlugin = (pluginId: string) => {
    // In a real implementation, this would be an API call
    console.log('Reject plugin:', pluginId);
    
    // For this example, we'll just update the local state
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, status: 'rejected' } : p
    ));
    
    setPendingPlugins(prev => prev.filter(p => p.id !== pluginId));
  };
  
  const handleVerifyPlugin = (pluginId: string, isVerified: boolean) => {
    // In a real implementation, this would be an API call
    console.log('Verify plugin:', pluginId, isVerified);
    
    // For this example, we'll just update the local state
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, isVerified } : p
    ));
  };
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Plugins</div>
              <div className="text-2xl font-bold text-white">{plugins.length}</div>
            </div>
            <Package className="text-blue-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Pending Review</div>
              <div className="text-2xl font-bold text-yellow-400">{pendingPlugins.length}</div>
            </div>
            <AlertTriangle className="text-yellow-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Total Users</div>
              <div className="text-2xl font-bold text-white">250</div>
            </div>
            <Users className="text-purple-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Revenue</div>
              <div className="text-2xl font-bold text-green-400">$1,250</div>
            </div>
            <DollarSign className="text-green-400" size={24} />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('review')}
            className={`pb-3 px-1 ${
              activeTab === 'review'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Review Queue
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`pb-3 px-1 ${
              activeTab === 'plugins'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            All Plugins
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 ${
              activeTab === 'users'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 ${
              activeTab === 'settings'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Settings
          </button>
        </div>
      </div>
      
      {/* Content */}
      {activeTab === 'review' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Plugins Pending Review</h2>
          </div>
          
          {isLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-lg mb-2">Loading Plugins...</div>
            </div>
          ) : pendingPlugins.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-lg mb-2">No Plugins Pending Review</div>
              <div className="text-sm">All plugins have been reviewed</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">Plugin</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Author</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Submitted</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPlugins.map(plugin => (
                    <tr key={plugin.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden">
                            {plugin.thumbnailUrl ? (
                              <img 
                                src={plugin.thumbnailUrl} 
                                alt={plugin.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <span>{plugin.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-white font-medium">{plugin.name}</div>
                            <div className="text-xs text-gray-400">v{plugin.version}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{plugin.author}</div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex px-2 py-1 rounded text-xs ${getStatusColor(plugin.category as any)}`}>
                          {plugin.category}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white">
                          {plugin.price === 0 ? 'Free' : `$${plugin.price.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {plugin.pricingModel !== 'free' && plugin.pricingModel}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-gray-300">
                          {new Date(plugin.updatedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Plugin"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleApprovePlugin(plugin.id)}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Approve Plugin"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleRejectPlugin(plugin.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Reject Plugin"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'plugins' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">All Plugins</h2>
          </div>
          
          {isLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-lg mb-2">Loading Plugins...</div>
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-lg mb-2">No Plugins Found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">Plugin</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Author</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Downloads</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Rating</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Verified</th>
                    <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plugins.map(plugin => (
                    <tr key={plugin.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden">
                            {plugin.thumbnailUrl ? (
                              <img 
                                src={plugin.thumbnailUrl} 
                                alt={plugin.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <span>{plugin.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-white font-medium">{plugin.name}</div>
                            <div className="text-xs text-gray-400">v{plugin.version}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{plugin.author}</div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(plugin.status)}`}>
                          <span>{plugin.status.replace('-', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white">
                          {plugin.price === 0 ? 'Free' : `$${plugin.price.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {plugin.pricingModel !== 'free' && plugin.pricingModel}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white">{plugin.downloadCount.toLocaleString()}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end">
                          <Star size={14} className="text-yellow-400 mr-1" />
                          <span className="text-white">{plugin.rating.toFixed(1)}</span>
                          <span className="text-gray-400 ml-1">({plugin.ratingCount})</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleVerifyPlugin(plugin.id, !plugin.isVerified)}
                            className={`p-1 ${plugin.isVerified ? 'text-blue-400' : 'text-gray-500'}`}
                            title={plugin.isVerified ? 'Remove Verification' : 'Verify Plugin'}
                          >
                            <Shield size={16} fill={plugin.isVerified ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Plugin"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                            title="Edit Plugin"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'users' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">User Management</h2>
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg mb-2">User Management</div>
            <div className="text-sm">Manage users, developers, and permissions</div>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Marketplace Settings</h2>
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg mb-2">Marketplace Settings</div>
            <div className="text-sm">Configure marketplace settings, categories, and payment options</div>
          </div>
        </div>
      )}
    </div>
  );
}