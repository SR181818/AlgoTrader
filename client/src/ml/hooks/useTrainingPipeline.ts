import { useState, useEffect, useCallback } from 'react';
import { MLPluginManager } from '../MLPluginManager';
import { TrainingPipeline, TrainingPipelineConfig, TrainingPipelineRegistry, TrainingProgress } from '../training/TrainingPipeline';

export function useTrainingPipeline(pipelineId: string) {
  const [pluginManager] = useState(() => new MLPluginManager());
  const [pipelineRegistry] = useState(() => TrainingPipelineRegistry.getInstance());
  const [pipeline, setPipeline] = useState<TrainingPipeline | null>(null);
  const [config, setConfig] = useState<TrainingPipelineConfig | null>(null);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load pipeline on mount
  useEffect(() => {
    const loadPipeline = () => {
      try {
        const loadedPipeline = pipelineRegistry.getPipeline(pipelineId);
        if (loadedPipeline) {
          setPipeline(loadedPipeline);
          setConfig(loadedPipeline.getConfig());
        } else {
          setError(`Pipeline with ID ${pipelineId} not found`);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    
    loadPipeline();
  }, [pipelineId, pipelineRegistry]);
  
  // Subscribe to training progress
  useEffect(() => {
    if (!pipeline) return;
    
    const subscription = pipeline.getProgress().subscribe(progressUpdate => {
      setProgress(progressUpdate);
      setIsTraining(progressUpdate.status === 'running');
      
      if (progressUpdate.status === 'error' && progressUpdate.message) {
        setError(progressUpdate.message);
      } else if (progressUpdate.status === 'completed') {
        setError(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [pipeline]);
  
  // Create a new pipeline
  const createPipeline = useCallback(async (config: TrainingPipelineConfig) => {
    try {
      const plugin = pluginManager.getPlugin(config.pluginId);
      if (!plugin) {
        throw new Error(`Plugin with ID ${config.pluginId} not found`);
      }
      
      if (!plugin.canTrain()) {
        throw new Error(`Plugin ${plugin.name} does not support training`);
      }
      
      const newPipeline = new TrainingPipeline(config, plugin);
      pipelineRegistry.registerPipeline(newPipeline);
      
      setPipeline(newPipeline);
      setConfig(config);
      setError(null);
      
      return newPipeline;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [pluginManager, pipelineRegistry]);
  
  // Start training
  const train = useCallback(async (data: any) => {
    if (!pipeline) {
      throw new Error('Pipeline not loaded');
    }
    
    try {
      setIsTraining(true);
      setError(null);
      
      const result = await pipeline.train(data);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsTraining(false);
    }
  }, [pipeline]);
  
  // Stop training
  const stopTraining = useCallback(() => {
    if (!pipeline) {
      return false;
    }
    
    try {
      pipeline.stop();
      setIsTraining(false);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, [pipeline]);
  
  return {
    pipeline,
    config,
    progress,
    isTraining,
    error,
    createPipeline,
    train,
    stopTraining,
  };
}