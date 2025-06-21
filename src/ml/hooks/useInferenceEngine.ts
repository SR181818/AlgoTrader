import { useState, useEffect, useCallback } from 'react';
import { MLPluginManager } from '../MLPluginManager';
import { InferenceEngine, InferenceConfig, InferenceResult } from '../inference/InferenceEngine';
import { CandleData } from '../../types/trading';

export function useInferenceEngine() {
  const [pluginManager] = useState(() => new MLPluginManager());
  const [inferenceEngine] = useState(() => new InferenceEngine(pluginManager));
  const [results, setResults] = useState<Map<string, InferenceResult>>(new Map());
  const [status, setStatus] = useState<Map<string, boolean>>(new Map());
  
  // Subscribe to inference results and status
  useEffect(() => {
    const resultsSubscription = inferenceEngine.getResults().subscribe(result => {
      setResults(prev => new Map(prev).set(result.pluginId, result));
    });
    
    const statusSubscription = inferenceEngine.getStatus().subscribe(newStatus => {
      setStatus(newStatus);
    });
    
    return () => {
      resultsSubscription.unsubscribe();
      statusSubscription.unsubscribe();
      inferenceEngine.dispose();
    };
  }, [inferenceEngine]);
  
  // Register inference configuration
  const registerInference = useCallback((config: InferenceConfig) => {
    inferenceEngine.registerInference(config);
  }, [inferenceEngine]);
  
  // Unregister inference configuration
  const unregisterInference = useCallback((pluginId: string) => {
    return inferenceEngine.unregisterInference(pluginId);
  }, [inferenceEngine]);
  
  // Start inference
  const startInference = useCallback((pluginId: string) => {
    return inferenceEngine.startInference(pluginId);
  }, [inferenceEngine]);
  
  // Stop inference
  const stopInference = useCallback((pluginId: string) => {
    return inferenceEngine.stopInference(pluginId);
  }, [inferenceEngine]);
  
  // Update data
  const updateData = useCallback((symbol: string, candle: CandleData) => {
    inferenceEngine.updateData(symbol, candle);
  }, [inferenceEngine]);
  
  // Run one-time inference
  const runOneTimeInference = useCallback(async (
    pluginId: string, 
    data: any, 
    preprocessor?: (data: any) => any,
    postprocessor?: (result: any) => any
  ) => {
    return inferenceEngine.runOneTimeInference(pluginId, data, preprocessor, postprocessor);
  }, [inferenceEngine]);
  
  return {
    results,
    status,
    registerInference,
    unregisterInference,
    startInference,
    stopInference,
    updateData,
    runOneTimeInference,
    isRunning: (pluginId: string) => status.get(pluginId) || false,
    getResult: (pluginId: string) => results.get(pluginId) || null,
  };
}