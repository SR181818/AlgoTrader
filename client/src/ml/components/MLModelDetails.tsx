import React, { useState } from 'react';
import { MLPlugin, MLPluginMetadata } from '../MLPlugin';
import { useMLPlugin } from '../hooks/useMLPlugin';
import { Brain, Cpu, BarChart3, Activity, Zap, Play, Pause, Settings, Save, Trash2 } from 'lucide-react';

interface MLModelDetailsProps {
  plugin: MLPlugin;
  onRunInference?: (result: any) => void;
  onUnload?: () => void;
}

export function MLModelDetails({ plugin, onRunInference, onUnload }: MLModelDetailsProps) {
  const { metadata, predict, canTrain, train, isLoading, error } = useMLPlugin(plugin.id);
  const [inputData, setInputData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Get icon for plugin type
  const getPluginTypeIcon = (type: string) => {
    switch (type) {
      case 'classifier':
        return <Brain size={24} className="text-blue-400" />;
      case 'regressor':
        return <BarChart3 size={24} className="text-green-400" />;
      case 'anomaly_detector':
        return <Activity size={24} className="text-red-400" />;
      case 'reinforcement_learning':
        return <Zap size={24} className="text-purple-400" />;
      default:
        return <Cpu size={24} className="text-gray-400" />;
    }
  };
  
  // Run inference
  const handleRunInference = async () => {
    if (!inputData) {
      return;
    }
    
    try {
      setIsRunning(true);
      const prediction = await predict(inputData);
      setResult(prediction);
      
      if (onRunInference) {
        onRunInference(prediction);
      }
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Handle unload
  const handleUnload = () => {
    if (onUnload) {
      onUnload();
    }
  };
  
  if (!metadata) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400 py-8">
          <Cpu size={48} className="mx-auto mb-4 opacity-50" />
          <div className="text-lg mb-2">Loading Model Details</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getPluginTypeIcon(metadata.type)}
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-white">{metadata.name}</h3>
              <div className="text-sm text-gray-400">v{metadata.version}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleUnload}
              className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition-colors"
              title="Unload Model"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Model Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="text-sm text-gray-400 mb-3">{metadata.description}</div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Framework</div>
            <div className="text-white">{metadata.framework}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Type</div>
            <div className="text-white capitalize">{metadata.type.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Input Features</div>
            <div className="text-white">{metadata.inputFeatures.join(', ')}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Output Features</div>
            <div className="text-white">{metadata.outputFeatures.join(', ')}</div>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 text-sm text-red-400 bg-red-400/10 p-2 rounded">
            Error: {error}
          </div>
        )}
      </div>
      
      {/* Settings Panel (conditionally shown) */}
      {showSettings && (
        <div className="p-4 border-b border-gray-700 bg-gray-700/30">
          <h4 className="text-white font-medium mb-3">Model Settings</h4>
          
          <div className="space-y-3">
            {/* Input Shape */}
            <div>
              <div className="text-gray-400 text-sm mb-1">Input Shape</div>
              <div className="bg-gray-700 rounded p-2 text-sm text-white font-mono">
                {Array.isArray(metadata.inputShape) 
                  ? `[${metadata.inputShape.join(', ')}]`
                  : JSON.stringify(metadata.inputShape)
                }
              </div>
            </div>
            
            {/* Output Shape */}
            <div>
              <div className="text-gray-400 text-sm mb-1">Output Shape</div>
              <div className="bg-gray-700 rounded p-2 text-sm text-white font-mono">
                {Array.isArray(metadata.outputShape) 
                  ? `[${metadata.outputShape.join(', ')}]`
                  : JSON.stringify(metadata.outputShape)
                }
              </div>
            </div>
            
            {/* Training Support */}
            <div className="flex items-center">
              <div className="text-gray-400 text-sm mr-2">Training Support:</div>
              <div className={`text-sm ${canTrain ? 'text-green-400' : 'text-red-400'}`}>
                {canTrain ? 'Supported' : 'Not Supported'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inference Panel */}
      <div className="p-4">
        <h4 className="text-white font-medium mb-3">Run Inference</h4>
        
        <div className="space-y-3">
          <div>
            <div className="text-gray-400 text-sm mb-1">Input Data (JSON)</div>
            <textarea
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 font-mono text-sm"
              rows={5}
              placeholder="Enter input data as JSON"
              onChange={(e) => {
                try {
                  const data = JSON.parse(e.target.value);
                  setInputData(data);
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleRunInference}
              disabled={isLoading || isRunning || !inputData}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              {isRunning ? (
                <>
                  <Pause size={16} className="mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Run Inference
                </>
              )}
            </button>
          </div>
          
          {result && (
            <div>
              <div className="text-gray-400 text-sm mb-1">Result</div>
              <div className="bg-gray-700 rounded p-3 text-sm text-white font-mono overflow-auto max-h-40">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}