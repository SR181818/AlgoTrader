import { useState, useEffect, useCallback } from 'react';
import { MLPlugin, MLPluginMetadata } from '../MLPlugin';
import { MLPluginManager, PluginLoadingStatus } from '../MLPluginManager';

export function useMLPlugin(pluginId: string) {
  const [pluginManager] = useState(() => new MLPluginManager());
  const [plugin, setPlugin] = useState<MLPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MLPluginMetadata | null>(null);
  
  // Load plugin on mount
  useEffect(() => {
    const loadPlugin = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const loadedPlugin = pluginManager.getPlugin(pluginId);
        if (loadedPlugin) {
          setPlugin(loadedPlugin);
          setMetadata(loadedPlugin.getMetadata());
        } else {
          setError(`Plugin with ID ${pluginId} not found`);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlugin();
    
    // Subscribe to loading status updates
    const subscription = pluginManager.getLoadingStatus().subscribe(statusMap => {
      const status = statusMap.get(pluginId);
      if (status) {
        setIsLoading(status.status === 'loading');
        if (status.status === 'error' && status.message) {
          setError(status.message);
        } else if (status.status === 'loaded') {
          setError(null);
          const loadedPlugin = pluginManager.getPlugin(pluginId);
          if (loadedPlugin) {
            setPlugin(loadedPlugin);
            setMetadata(loadedPlugin.getMetadata());
          }
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [pluginId]);
  
  // Run prediction
  const predict = useCallback(async (inputs: any) => {
    if (!plugin) {
      throw new Error('Plugin not loaded');
    }
    
    try {
      return await plugin.predict(inputs);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [plugin]);
  
  // Run training if supported
  const train = useCallback(async (data: any, options?: any) => {
    if (!plugin) {
      throw new Error('Plugin not loaded');
    }
    
    if (!plugin.canTrain() || !plugin.train) {
      throw new Error('Plugin does not support training');
    }
    
    try {
      return await plugin.train(data, options);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [plugin]);
  
  // Unload plugin
  const unload = useCallback(() => {
    if (plugin) {
      pluginManager.unloadPlugin(pluginId);
      setPlugin(null);
      setMetadata(null);
    }
  }, [plugin, pluginId]);
  
  return {
    plugin,
    metadata,
    isLoading,
    error,
    predict,
    train,
    unload,
    canTrain: plugin?.canTrain() || false,
  };
}