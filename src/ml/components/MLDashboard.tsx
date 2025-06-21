import React, { useState, useEffect } from 'react';
import { MLPluginManager } from '../MLPluginManager';
import { MLPlugin } from '../MLPlugin';
import { InferenceEngine, InferenceConfig } from '../inference/InferenceEngine';
import { MLModelSelector } from './MLModelSelector';
import { MLModelDetails } from './MLModelDetails';
import { MLModelTraining } from './MLModelTraining';
import { PricePredictionPlugin } from '../examples/PricePredictionPlugin';
import { AnomalyDetectionPlugin } from '../examples/AnomalyDetectionPlugin';
import { MarketRegimePlugin } from '../examples/MarketRegimePlugin';
import { Brain, Plus, Cpu, Activity, BarChart3 } from 'lucide-react';

export function MLDashboard() {
  const [pluginManager] = useState(() => new MLPluginManager());
  const [inferenceEngine] = useState(() => new InferenceEngine(pluginManager));
  const [selectedPlugin, setSelectedPlugin] = useState<MLPlugin | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'training' | 'inference'>('details');
  const [inferenceResults, setInferenceResults] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize example plugins
  useEffect(() => {
    const initExamplePlugins = async () => {
      try {
        setIsLoading(true);
        
        // Load example plugins if no plugins are loaded
        if (pluginManager.getAllPlugins().length === 0) {
          await Promise.all([
            PricePredictionPlugin.create(),
            AnomalyDetectionPlugin.create(),
            MarketRegimePlugin.create(),
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize example plugins:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initExamplePlugins();
    
    // Subscribe to inference results
    const subscription = inferenceEngine.getResults().subscribe(result => {
      setInferenceResults(prev => new Map(prev).set(result.pluginId, result));
    });
    
    return () => {
      subscription.unsubscribe();
      inferenceEngine.dispose();
    };
  }, [pluginManager, inferenceEngine]);
  
  // Handle model selection
  const handleSelectModel = (plugin: MLPlugin) => {
    setSelectedPlugin(plugin);
    setActiveTab('details');
  };
  
  // Handle inference result
  const handleInferenceResult = (result: any) => {
    console.log('Inference result:', result);
  };
  
  // Handle training completion
  const handleTrainingComplete = (result: any) => {
    console.log('Training complete:', result);
  };
  
  // Handle unload model
  const handleUnloadModel = () => {
    if (selectedPlugin) {
      pluginManager.unloadPlugin(selectedPlugin.id);
      setSelectedPlugin(null);
    }
  };
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain className="text-blue-400 mr-2" size={24} />
          <h1 className="text-2xl font-bold text-white">ML Models Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Load Model
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selector */}
        <div className="lg:col-span-1">
          <MLModelSelector onSelectModel={handleSelectModel} />
          
          {/* Inference Results */}
          {inferenceResults.size > 0 && (
            <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center">
                  <Activity className="text-blue-400 mr-2" size={20} />
                  <h3 className="text-lg font-semibold text-white">Inference Results</h3>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {Array.from(inferenceResults.entries()).map(([pluginId, result]) => {
                  const plugin = pluginManager.getPlugin(pluginId);
                  return (
                    <div key={pluginId} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">{plugin?.name || 'Unknown Model'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <div className="bg-gray-700 rounded p-2 text-xs text-white font-mono overflow-auto max-h-32">
                        <pre>{JSON.stringify(result.outputs, null, 2)}</pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Model Details and Training */}
        <div className="lg:col-span-2">
          {selectedPlugin ? (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'details'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Model Details
                </button>
                <button
                  onClick={() => setActiveTab('training')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'training'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Training
                </button>
                <button
                  onClick={() => setActiveTab('inference')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'inference'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Inference
                </button>
              </div>
              
              {/* Tab Content */}
              {activeTab === 'details' && (
                <MLModelDetails 
                  plugin={selectedPlugin} 
                  onRunInference={handleInferenceResult}
                  onUnload={handleUnloadModel}
                />
              )}
              
              {activeTab === 'training' && (
                <MLModelTraining 
                  plugin={selectedPlugin}
                  onTrainingComplete={handleTrainingComplete}
                />
              )}
              
              {activeTab === 'inference' && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Inference Configuration</h3>
                  <div className="text-center text-gray-400 py-8">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <div className="text-lg mb-2">Inference Configuration</div>
                    <div className="text-sm">Configure real-time inference settings</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <Cpu size={64} className="mx-auto mb-6 text-gray-600" />
              <div className="text-xl text-gray-300 mb-4">No Model Selected</div>
              <p className="text-gray-400 mb-6">Select a model from the list to view details and run inference</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}