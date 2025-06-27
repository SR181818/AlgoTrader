import React, { useState, useEffect } from 'react';
import { MLPlugin } from '../MLPlugin';
import { TrainingPipeline, TrainingPipelineConfig, TrainingPipelineRegistry, TrainingProgress } from '../training/TrainingPipeline';
import { useTrainingPipeline } from '../hooks/useTrainingPipeline';
import { Play, Pause, Save, Upload, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';

interface MLModelTrainingProps {
  plugin: MLPlugin;
  onTrainingComplete?: (result: any) => void;
}

export function MLModelTraining({ plugin, onTrainingComplete }: MLModelTrainingProps) {
  const [pipelineId] = useState(`training_${plugin.id}_${Date.now()}`);
  const {
    pipeline,
    config,
    progress,
    isTraining,
    error,
    createPipeline,
    train,
    stopTraining,
  } = useTrainingPipeline(pipelineId);
  
  const [trainingData, setTrainingData] = useState<any>(null);
  const [trainingConfig, setTrainingConfig] = useState<Partial<TrainingPipelineConfig>>({
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2,
    learningRate: 0.001,
    optimizer: 'adam',
    loss: 'meanSquaredError',
  });
  
  // Create pipeline on mount
  useEffect(() => {
    const initPipeline = async () => {
      if (!plugin.canTrain()) return;
      
      try {
        // Create default pipeline config
        const defaultConfig: TrainingPipelineConfig = {
          id: pipelineId,
          name: `Training for ${plugin.name}`,
          description: `Training pipeline for ${plugin.name}`,
          pluginId: plugin.id,
          dataPreprocessors: [],
          dataPostprocessors: [],
          epochs: 10,
          batchSize: 32,
          validationSplit: 0.2,
          learningRate: 0.001,
          optimizer: 'adam',
          loss: 'meanSquaredError',
        };
        
        await createPipeline(defaultConfig);
      } catch (err) {
        console.error('Failed to create training pipeline:', err);
      }
    };
    
    initPipeline();
  }, [plugin, pipelineId, createPipeline]);
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setTrainingData(data);
      } catch (err) {
        console.error('Failed to parse training data:', err);
      }
    };
    reader.readAsText(file);
  };
  
  // Start training
  const handleStartTraining = async () => {
    if (!trainingData) return;
    
    try {
      const result = await train(trainingData);
      
      if (onTrainingComplete) {
        onTrainingComplete(result);
      }
    } catch (err) {
      console.error('Training failed:', err);
    }
  };
  
  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  
  if (!plugin.canTrain()) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400 py-8">
          <XCircle size={48} className="mx-auto mb-4 opacity-50" />
          <div className="text-lg mb-2">Training Not Supported</div>
          <div className="text-sm">This model does not support training</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <BarChart3 className="text-blue-400 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-white">Model Training</h3>
        </div>
      </div>
      
      <div className="p-4">
        {/* Training Configuration */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Training Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Epochs</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={trainingConfig.epochs}
                onChange={(e) => setTrainingConfig({...trainingConfig, epochs: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Batch Size</label>
              <input
                type="number"
                min="1"
                max="1024"
                value={trainingConfig.batchSize}
                onChange={(e) => setTrainingConfig({...trainingConfig, batchSize: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Validation Split</label>
              <input
                type="number"
                min="0"
                max="0.5"
                step="0.05"
                value={trainingConfig.validationSplit}
                onChange={(e) => setTrainingConfig({...trainingConfig, validationSplit: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Learning Rate</label>
              <input
                type="number"
                min="0.0001"
                max="0.1"
                step="0.0001"
                value={trainingConfig.learningRate}
                onChange={(e) => setTrainingConfig({...trainingConfig, learningRate: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Optimizer</label>
              <select
                value={trainingConfig.optimizer}
                onChange={(e) => setTrainingConfig({...trainingConfig, optimizer: e.target.value})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              >
                <option value="adam">Adam</option>
                <option value="sgd">SGD</option>
                <option value="rmsprop">RMSprop</option>
                <option value="adagrad">Adagrad</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Loss Function</label>
              <select
                value={trainingConfig.loss}
                onChange={(e) => setTrainingConfig({...trainingConfig, loss: e.target.value})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                disabled={isTraining}
              >
                <option value="meanSquaredError">Mean Squared Error</option>
                <option value="categoricalCrossentropy">Categorical Crossentropy</option>
                <option value="binaryCrossentropy">Binary Crossentropy</option>
                <option value="meanAbsoluteError">Mean Absolute Error</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Training Data */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Training Data</h4>
          
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="training-data-upload"
              disabled={isTraining}
            />
            <label
              htmlFor="training-data-upload"
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer transition-colors disabled:opacity-50"
            >
              <Upload size={16} className="mr-2" />
              Upload Training Data
            </label>
            
            {trainingData && (
              <div className="text-green-400 text-sm">
                <CheckCircle size={16} className="inline mr-1" />
                Data loaded successfully
              </div>
            )}
          </div>
        </div>
        
        {/* Training Progress */}
        {progress && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Training Progress</h4>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Progress</span>
                <span>Epoch {progress.epoch} / {progress.totalEpochs}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.epoch / progress.totalEpochs) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">Status</div>
                <div className={`font-medium ${
                  progress.status === 'completed' ? 'text-green-400' :
                  progress.status === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">Elapsed Time</div>
                <div className="text-white font-mono">
                  {formatTime(progress.elapsedTime)}
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">Remaining Time</div>
                <div className="text-white font-mono">
                  {formatTime(progress.estimatedTimeRemaining)}
                </div>
              </div>
              
              {progress.metrics && Object.entries(progress.metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-gray-400">{key}</div>
                  <div className="text-white font-mono">
                    {typeof value === 'number' ? value.toFixed(4) : JSON.stringify(value)}
                  </div>
                </div>
              ))}
            </div>
            
            {error && (
              <div className="mt-3 text-sm text-red-400 bg-red-400/10 p-2 rounded">
                Error: {error}
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {isTraining ? (
            <button
              onClick={stopTraining}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
            >
              <Pause size={16} className="mr-2" />
              Stop Training
            </button>
          ) : (
            <button
              onClick={handleStartTraining}
              disabled={!trainingData}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Play size={16} className="mr-2" />
              Start Training
            </button>
          )}
          
          {progress?.status === 'completed' && (
            <button
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <Save size={16} className="mr-2" />
              Save Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}