import { configureStore } from '@reduxjs/toolkit';
import indicatorReducer from './indicatorStore';
import talibIndicatorReducer from './talibIndicatorSlice';

export const store = configureStore({
  reducer: {
    indicators: indicatorReducer,
    talibIndicators: talibIndicatorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'indicators/loadFromStorage',
          'talibIndicators/rehydrate/fulfilled',
          'talibIndicators/persist/fulfilled',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Rehydration utility for both slices
export const rehydrateStore = async () => {
  const { rehydrateStore: rehydrateIndicators } = await import('./indicatorStore');
  const { rehydrateIndicators: rehydrateTALibIndicators } = await import('./talibIndicatorSlice');
  
  // Rehydrate original indicators
  rehydrateIndicators();
  
  // Rehydrate TA-Lib indicators
  store.dispatch(rehydrateTALibIndicators());
};