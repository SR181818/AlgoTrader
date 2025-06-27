import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { TALibIndicatorConfig } from '../utils/talib-indicators';

export interface TALibIndicatorConfiguration {
  id: string;
  name: string;
  displayName: string;
  category: string;
  parameters: { [key: string]: any };
  enabled: boolean;
  position: number; // For ordering
  createdAt: number;
  updatedAt: number;
}

interface TALibIndicatorState {
  configurations: TALibIndicatorConfiguration[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: TALibIndicatorState = {
  configurations: [],
  isLoaded: false,
  isLoading: false,
  error: null,
};

// Async thunk for rehydration from localStorage
export const rehydrateIndicators = createAsyncThunk(
  'talibIndicators/rehydrate',
  async () => {
    try {
      const stored = localStorage.getItem('talib_indicator_configs');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the data structure
        if (Array.isArray(parsed)) {
          return parsed as TALibIndicatorConfiguration[];
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to rehydrate TA-Lib indicators from localStorage:', error);
      return [];
    }
  }
);

// Async thunk for persisting to localStorage
export const persistIndicators = createAsyncThunk(
  'talibIndicators/persist',
  async (configurations: TALibIndicatorConfiguration[]) => {
    try {
      localStorage.setItem('talib_indicator_configs', JSON.stringify(configurations));
      return configurations;
    } catch (error) {
      console.error('Failed to persist TA-Lib indicators to localStorage:', error);
      throw error;
    }
  }
);

const talibIndicatorSlice = createSlice({
  name: 'talibIndicators',
  initialState,
  reducers: {
    addIndicator: (state, action: PayloadAction<{
      config: TALibIndicatorConfig;
      parameters: { [key: string]: any };
    }>) => {
      const { config, parameters } = action.payload;
      const newIndicator: TALibIndicatorConfiguration = {
        id: `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        displayName: config.displayName,
        category: config.category,
        parameters,
        enabled: true,
        position: state.configurations.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      state.configurations.push(newIndicator);
      state.error = null;
      
      // Trigger persistence
      persistIndicators(state.configurations);
    },
    
    updateIndicator: (state, action: PayloadAction<{
      id: string;
      updates: Partial<Pick<TALibIndicatorConfiguration, 'parameters' | 'enabled' | 'position'>>;
    }>) => {
      const { id, updates } = action.payload;
      const indicator = state.configurations.find(ind => ind.id === id);
      
      if (indicator) {
        Object.assign(indicator, updates, { updatedAt: Date.now() });
        state.error = null;
        
        // Trigger persistence
        persistIndicators(state.configurations);
      } else {
        state.error = `Indicator with id ${id} not found`;
      }
    },
    
    removeIndicator: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const initialLength = state.configurations.length;
      
      state.configurations = state.configurations.filter(ind => ind.id !== id);
      
      if (state.configurations.length === initialLength) {
        state.error = `Indicator with id ${id} not found`;
      } else {
        // Reorder positions after removal
        state.configurations.forEach((indicator, index) => {
          indicator.position = index;
        });
        state.error = null;
        
        // Trigger persistence
        persistIndicators(state.configurations);
      }
    },
    
    reorderIndicators: (state, action: PayloadAction<string[]>) => {
      const orderedIds = action.payload;
      const reordered: TALibIndicatorConfiguration[] = [];
      
      // Reorder based on provided ID array
      orderedIds.forEach((id, index) => {
        const indicator = state.configurations.find(ind => ind.id === id);
        if (indicator) {
          indicator.position = index;
          indicator.updatedAt = Date.now();
          reordered.push(indicator);
        }
      });
      
      // Add any indicators not in the ordered list at the end
      state.configurations.forEach(indicator => {
        if (!orderedIds.includes(indicator.id)) {
          indicator.position = reordered.length;
          reordered.push(indicator);
        }
      });
      
      state.configurations = reordered;
      state.error = null;
      
      // Trigger persistence
      persistIndicators(state.configurations);
    },
    
    toggleIndicator: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const indicator = state.configurations.find(ind => ind.id === id);
      
      if (indicator) {
        indicator.enabled = !indicator.enabled;
        indicator.updatedAt = Date.now();
        state.error = null;
        
        // Trigger persistence
        persistIndicators(state.configurations);
      } else {
        state.error = `Indicator with id ${id} not found`;
      }
    },
    
    updateIndicatorParameters: (state, action: PayloadAction<{
      id: string;
      parameters: { [key: string]: any };
    }>) => {
      const { id, parameters } = action.payload;
      const indicator = state.configurations.find(ind => ind.id === id);
      
      if (indicator) {
        indicator.parameters = { ...indicator.parameters, ...parameters };
        indicator.updatedAt = Date.now();
        state.error = null;
        
        // Trigger persistence
        persistIndicators(state.configurations);
      } else {
        state.error = `Indicator with id ${id} not found`;
      }
    },
    
    clearAllIndicators: (state) => {
      state.configurations = [];
      state.error = null;
      
      // Clear localStorage
      try {
        localStorage.removeItem('talib_indicator_configs');
      } catch (error) {
        console.error('Failed to clear TA-Lib indicators from localStorage:', error);
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Rehydration cases
      .addCase(rehydrateIndicators.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rehydrateIndicators.fulfilled, (state, action) => {
        state.configurations = action.payload;
        state.isLoaded = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(rehydrateIndicators.rejected, (state, action) => {
        state.isLoaded = true;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load indicators';
      })
      
      // Persistence cases
      .addCase(persistIndicators.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save indicators';
      });
  },
});

export const {
  addIndicator,
  updateIndicator,
  removeIndicator,
  reorderIndicators,
  toggleIndicator,
  updateIndicatorParameters,
  clearAllIndicators,
  clearError,
} = talibIndicatorSlice.actions;

export default talibIndicatorSlice.reducer;

// Selectors
export const selectAllIndicators = (state: { talibIndicators: TALibIndicatorState }) => 
  state.talibIndicators.configurations;

export const selectEnabledIndicators = (state: { talibIndicators: TALibIndicatorState }) =>
  state.talibIndicators.configurations.filter(indicator => indicator.enabled);

export const selectIndicatorsByCategory = (category: string) => 
  (state: { talibIndicators: TALibIndicatorState }) =>
    state.talibIndicators.configurations.filter(indicator => indicator.category === category);

export const selectIndicatorById = (id: string) =>
  (state: { talibIndicators: TALibIndicatorState }) =>
    state.talibIndicators.configurations.find(indicator => indicator.id === id);

export const selectIndicatorsLoading = (state: { talibIndicators: TALibIndicatorState }) =>
  state.talibIndicators.isLoading;

export const selectIndicatorsLoaded = (state: { talibIndicators: TALibIndicatorState }) =>
  state.talibIndicators.isLoaded;

export const selectIndicatorsError = (state: { talibIndicators: TALibIndicatorState }) =>
  state.talibIndicators.error;

// Helper function to get default parameters for an indicator
export const getDefaultParameters = (config: TALibIndicatorConfig): { [key: string]: any } => {
  const defaults: { [key: string]: any } = {};
  Object.entries(config.parameters).forEach(([key, param]) => {
    defaults[key] = param.default;
  });
  return defaults;
};