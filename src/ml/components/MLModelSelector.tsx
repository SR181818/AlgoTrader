import React, { useState, useEffect } from 'react';
import { MLPluginManager } from '../MLPluginManager';
import { MLPlugin, MLPluginMetadata } from '../MLPlugin';
import { Brain, Cpu, BarChart3, Activity, Zap } from 'lucide-react';

interface MLModelSelectorProps {
  onSelectModel: (plugin: MLPlugin) => void;
}

export function MLModelSelector({ onSelectModel }: MLModelSelectorProps) {
  const [pluginManager] = useState(() => new MLPluginManager());
  const [plugins, setPlugins] = useState<MLPlugin[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStatus, setLoadingStatus] = useState<Map<string, any>>(new Map());
  
  // Load plugins on mount
  useEffect(() => {
    const loadPlugins = () => {
      const allPlugins = pluginManager.getAllPlugins();
      setPlugins(allPlugins);
    };
    
    loadPlugins();
    
    // Subscribe to loading status updates
    const subscription = pluginManager.getLoadingStatus().subscribe(status => {
      setLoadingStatus(status);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [pluginManager]);
  
  // Filter plugins by type and search term
  const filteredPlugins = plugins.filter(plugin => {
    const matchesType = selectedType === 'all' || plugin.type === selectedType;
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });
  
  // Get icon for plugin type
  const getPluginTypeIcon = (type: string) => {
    switch (type) {
      case 'classifier':
        return <Brain size={16} />;
      case 'regressor':
        return <BarChart3 size={16} />;
      case 'anomaly_detector':
        return <Activity size={16} />;
      case 'reinforcement_learning':
        return <Zap size={16} />;
      default:
        return <Cpu size={16} />;
    }
  };
  
  // Get color for plugin type
  const getPluginTypeColor = (type: string) => {
    switch (type) {
      case 'classifier':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'regressor':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'anomaly_detector':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'reinforcement_learning':
        return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">ML Models</h3>
        
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('classifier')}
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedType === 'classifier' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Classifiers
            </button>
            <button
              onClick={() => setSelectedType('regressor')}
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedType === 'regressor' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Regressors
            </button>
            <button
              onClick={() => setSelectedType('anomaly_detector')}
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedType === 'anomaly_detector' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Anomaly
            </button>
          </div>
        </div>
      </div>
      
      {/* Model List */}
      <div className="p-4">
        {filteredPlugins.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Cpu size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-lg mb-2">No Models Found</div>
            <div className="text-sm">Try a different search or filter</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.map(plugin => {
              const status = loadingStatus.get(plugin.id);
              const isLoading = status?.status === 'loading';
              const hasError = status?.status === 'error';
              
              return (
                <div 
                  key={plugin.id}
                  className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                  onClick={() => onSelectModel(plugin)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-2 ${getPluginTypeColor(plugin.type)}`}>
                        {getPluginTypeIcon(plugin.type)}
                      </div>
                      <div className="text-white font-medium">{plugin.name}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${getPluginTypeColor(plugin.type)}`}>
                      {plugin.type}
                    </div>
                  </div>
                  
                  <div className="text-gray-400 text-sm mb-3">{plugin.description}</div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>Framework: {plugin.framework}</div>
                    <div>v{plugin.version}</div>
                  </div>
                  
                  {isLoading && (
                    <div className="mt-2 text-xs text-blue-400">
                      Loading... {status.progress ? `${status.progress.toFixed(0)}%` : ''}
                    </div>
                  )}
                  
                  {hasError && (
                    <div className="mt-2 text-xs text-red-400">
                      Error: {status.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}