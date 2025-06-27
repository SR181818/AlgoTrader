import React, { useState, useEffect } from 'react';
import { Plugin, PluginVersion, PluginStatus } from '../models/PluginModel';
import { Plus, Edit, Trash2, Upload, Download, CheckCircle, AlertTriangle, Eye, Code, Settings, Package } from 'lucide-react';

interface PluginDeveloperDashboardProps {
  userId: string;
  username: string;
}

export function PluginDeveloperDashboard({ userId, username }: PluginDeveloperDashboardProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plugins' | 'analytics' | 'settings'>('plugins');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch developer's plugins on mount
  useEffect(() => {
    const fetchPlugins = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, this would be an API call
        // For this example, we'll use the sample data from PluginService
        
        // Create plugin service instance
        const { PluginService } = await import('../services/PluginService');
        const pluginService = new PluginService();
        
        // Fetch plugins by author
        const authorPlugins = await pluginService.getPlugins({
          authorId: userId
        });
        
        setPlugins(authorPlugins);
      } catch (error) {
        console.error('Failed to fetch plugins:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlugins();
  }, [userId]);
  
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
  
  const getStatusIcon = (status: PluginStatus) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} />;
      case 'rejected':
      case 'suspended':
        return <AlertTriangle size={16} />;
      default:
        return null;
    }
  };
  
  const formatPrice = (price: number, pricingModel: string, interval?: string) => {
    if (price === 0) return 'Free';
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
    
    if (pricingModel === 'subscription') {
      return `${formattedPrice}/${interval === 'year' ? 'yr' : 'mo'}`;
    }
    
    return formattedPrice;
  };
  
  const handleCreatePlugin = () => {
    setShowCreateModal(true);
  };
  
  const handleEditPlugin = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
  };
  
  const handleDeletePlugin = (pluginId: string) => {
    // In a real implementation, this would be an API call
    console.log('Delete plugin:', pluginId);
    
    // For this example, we'll just remove it from the local state
    setPlugins(prev => prev.filter(p => p.id !== pluginId));
  };
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Developer Dashboard</h1>
        
        <button
          onClick={handleCreatePlugin}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Create New Plugin
        </button>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('plugins')}
            className={`pb-3 px-1 ${
              activeTab === 'plugins'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            My Plugins
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-1 ${
              activeTab === 'analytics'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Analytics
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
      {activeTab === 'plugins' && (
        <div>
          {isLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-lg mb-2">Loading Plugins...</div>
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center bg-gray-800 rounded-lg p-12 border border-gray-700">
              <Package size={64} className="mx-auto mb-6 text-gray-600" />
              <div className="text-xl text-gray-300 mb-4">You haven't created any plugins yet</div>
              <p className="text-gray-400 mb-6">
                Create your first plugin to share with the community or sell on the marketplace.
              </p>
              <button
                onClick={handleCreatePlugin}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                Create Your First Plugin
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">My Plugins</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-400 font-medium">Plugin</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Version</th>
                      <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Downloads</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Rating</th>
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
                              <div className="text-xs text-gray-400">{plugin.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white">{plugin.version}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(plugin.updatedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(plugin.status)}`}>
                            {getStatusIcon(plugin.status)}
                            <span className={getStatusIcon(plugin.status) ? 'ml-1' : ''}>
                              {plugin.status.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-white">
                            {formatPrice(plugin.price, plugin.pricingModel, plugin.subscriptionInterval)}
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
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditPlugin(plugin)}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                              title="Edit Plugin"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                              title="View Plugin"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                              title="Edit Code"
                            >
                              <Code size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePlugin(plugin.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Plugin"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'analytics' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Analytics</h2>
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg mb-2">Analytics Dashboard</div>
            <div className="text-sm">Track your plugin performance, downloads, and revenue</div>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Developer Settings</h2>
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg mb-2">Developer Settings</div>
            <div className="text-sm">Manage your developer account and payment settings</div>
          </div>
        </div>
      )}
    </div>
  );
}