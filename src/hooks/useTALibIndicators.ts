import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { AppDispatch, RootState } from '../store';
import {
  addIndicator,
  updateIndicator,
  removeIndicator,
  reorderIndicators,
  toggleIndicator,
  updateIndicatorParameters,
  clearAllIndicators,
  clearError,
  rehydrateIndicators,
  selectAllIndicators,
  selectEnabledIndicators,
  selectIndicatorsByCategory,
  selectIndicatorById,
  selectIndicatorsLoading,
  selectIndicatorsLoaded,
  selectIndicatorsError,
  getDefaultParameters,
  TALibIndicatorConfiguration,
} from '../store/talibIndicatorSlice';
import { TALibIndicatorConfig, runIndicatorInWorker } from '../utils/talib-indicators';

export const useTALibIndicators = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const allIndicators = useSelector(selectAllIndicators);
  const enabledIndicators = useSelector(selectEnabledIndicators);
  const isLoading = useSelector(selectIndicatorsLoading);
  const isLoaded = useSelector(selectIndicatorsLoaded);
  const error = useSelector(selectIndicatorsError);

  // Initialize on mount
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      dispatch(rehydrateIndicators());
    }
  }, [dispatch, isLoaded, isLoading]);

  // Actions
  const addNewIndicator = useCallback((
    config: TALibIndicatorConfig,
    customParameters?: { [key: string]: any }
  ) => {
    const parameters = customParameters || getDefaultParameters(config);
    dispatch(addIndicator({ config, parameters }));
  }, [dispatch]);

  const updateIndicatorConfig = useCallback((
    id: string,
    updates: Partial<Pick<TALibIndicatorConfiguration, 'parameters' | 'enabled' | 'position'>>
  ) => {
    dispatch(updateIndicator({ id, updates }));
  }, [dispatch]);

  const removeIndicatorById = useCallback((id: string) => {
    dispatch(removeIndicator(id));
  }, [dispatch]);

  const reorderIndicatorList = useCallback((orderedIds: string[]) => {
    dispatch(reorderIndicators(orderedIds));
  }, [dispatch]);

  const toggleIndicatorEnabled = useCallback((id: string) => {
    dispatch(toggleIndicator(id));
  }, [dispatch]);

  const updateParameters = useCallback((
    id: string,
    parameters: { [key: string]: any }
  ) => {
    dispatch(updateIndicatorParameters({ id, parameters }));
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch(clearAllIndicators());
  }, [dispatch]);

  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Selector factories
  const getIndicatorsByCategory = useCallback((category: string) => {
    return allIndicators.filter(indicator => indicator.category === category);
  }, [allIndicators]);

  const getIndicatorById = useCallback((id: string) => {
    return allIndicators.find(indicator => indicator.id === id);
  }, [allIndicators]);

  // Utility functions
  const getEnabledIndicatorConfigs = useCallback(() => {
    return enabledIndicators.map(indicator => ({
      name: indicator.name,
      parameters: indicator.parameters,
    }));
  }, [enabledIndicators]);

  const hasIndicator = useCallback((name: string) => {
    return allIndicators.some(indicator => indicator.name === name);
  }, [allIndicators]);

  const getIndicatorCount = useCallback(() => {
    return {
      total: allIndicators.length,
      enabled: enabledIndicators.length,
      disabled: allIndicators.length - enabledIndicators.length,
    };
  }, [allIndicators, enabledIndicators]);

  return {
    // State
    indicators: allIndicators,
    enabledIndicators,
    isLoading,
    isLoaded,
    error,
    
    // Actions
    addIndicator: addNewIndicator,
    updateIndicator: updateIndicatorConfig,
    removeIndicator: removeIndicatorById,
    reorderIndicators: reorderIndicatorList,
    toggleIndicator: toggleIndicatorEnabled,
    updateParameters,
    clearAllIndicators: clearAll,
    clearError: dismissError,
    
    // Selectors
    getIndicatorsByCategory,
    getIndicatorById,
    getEnabledIndicatorConfigs,
    hasIndicator,
    getIndicatorCount,
  };
};

// Hook for specific category
export const useTALibIndicatorsByCategory = (category: string) => {
  const allIndicators = useSelector(selectAllIndicators);
  const categoryIndicators = useSelector(selectIndicatorsByCategory(category));
  
  return {
    indicators: categoryIndicators,
    count: categoryIndicators.length,
    enabledCount: categoryIndicators.filter(ind => ind.enabled).length,
  };
};

// Hook for specific indicator
export const useTALibIndicator = (id: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const indicator = useSelector(selectIndicatorById(id));
  
  const updateThisIndicator = useCallback((
    updates: Partial<Pick<TALibIndicatorConfiguration, 'parameters' | 'enabled' | 'position'>>
  ) => {
    dispatch(updateIndicator({ id, updates }));
  }, [dispatch, id]);
  
  const updateThisParameters = useCallback((parameters: { [key: string]: any }) => {
    dispatch(updateIndicatorParameters({ id, parameters }));
  }, [dispatch, id]);
  
  const toggleThisIndicator = useCallback(() => {
    dispatch(toggleIndicator(id));
  }, [dispatch, id]);
  
  const removeThisIndicator = useCallback(() => {
    dispatch(removeIndicator(id));
  }, [dispatch, id]);
  
  return {
    indicator,
    updateIndicator: updateThisIndicator,
    updateParameters: updateThisParameters,
    toggleIndicator: toggleThisIndicator,
    removeIndicator: removeThisIndicator,
    exists: !!indicator,
  };
};

// Example: Offload calculation to Web Worker
export const useIndicatorWorker = () => {
  const calculateIndicator = useCallback(async (indicator: string, input: any) => {
    return await runIndicatorInWorker(indicator, input);
  }, []);
  return { calculateIndicator };
};