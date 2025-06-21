import { createSlice, PayloadAction, configureStore } from '@reduxjs/toolkit';
import { TALibIndicatorConfig } from '../utils/talib-indicators';

export interface IndicatorConfiguration {
  id: string;
  name: string;
  displayName: string;
  parameters: { [key: string]: any };
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface IndicatorState {
  configurations: IndicatorConfiguration[];
  isLoaded: boolean;
}

const initialState: IndicatorState = {
  configurations: [],
  isLoaded: false,
};

const indicatorSlice = createSlice({
  name: 'indicators',
  initialState,
  reducers: {
    addIndicator: (state, action: PayloadAction<{
      config: TALibIndicatorConfig;
      parameters: { [key: string]: any };
    }>) => {
      const { config, parameters } = action.payload;
      const newIndicator: IndicatorConfiguration = {
        id: `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        displayName: config.displayName,
        parameters,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.configurations.push(newIndicator);
      persistToLocalStorage(state.configurations);
    },
    
    updateIndicator: (state, action: PayloadAction<{
      id: string;
      parameters?: { [key: string]: any };
      enabled?: boolean;
    }>) => {
      const { id, parameters, enabled } = action.payload;
      const indicator = state.configurations.find(ind => ind.id === id);
      if (indicator) {
        if (parameters) indicator.parameters = { ...indicator.parameters, ...parameters };
        if (enabled !== undefined) indicator.enabled = enabled;
        indicator.updatedAt = Date.now();
        persistToLocalStorage(state.configurations);
      }
    },
    
    removeIndicator: (state, action: PayloadAction<string>) => {
      state.configurations = state.configurations.filter(ind => ind.id !== action.payload);
      persistToLocalStorage(state.configurations);
    },
    
    reorderIndicators: (state, action: PayloadAction<string[]>) => {
      const orderedIds = action.payload;
      const reordered = orderedIds
        .map(id => state.configurations.find(ind => ind.id === id))
        .filter(Boolean) as IndicatorConfiguration[];
      state.configurations = reordered;
      persistToLocalStorage(state.configurations);
    },
    
    loadFromStorage: (state, action: PayloadAction<IndicatorConfiguration[]>) => {
      state.configurations = action.payload;
      state.isLoaded = true;
    },
    
    clearAll: (state) => {
      state.configurations = [];
      persistToLocalStorage([]);
    },
  },
});

// Persistence middleware
const persistToLocalStorage = (configurations: IndicatorConfiguration[]) => {
  try {
    localStorage.setItem('legacy_indicators', JSON.stringify(configurations));
  } catch (error) {
    console.error('Failed to persist indicators to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): IndicatorConfiguration[] => {
  try {
    const stored = localStorage.getItem('legacy_indicators');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load indicators from localStorage:', error);
    return [];
  }
};

export const {
  addIndicator,
  updateIndicator,
  removeIndicator,
  reorderIndicators,
  loadFromStorage,
  clearAll,
} = indicatorSlice.actions;

export default indicatorSlice.reducer;

export type RootState = {
  indicators: IndicatorState;
};

// Rehydration utility
export const rehydrateStore = () => {
  const configurations = loadFromLocalStorage();
  // Note: This will be handled by the new store structure
};