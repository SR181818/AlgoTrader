import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Middleware to automatically persist TA-Lib indicators on state changes
export const talibPersistenceMiddleware: Middleware<{}, RootState> = 
  (store) => (next) => (action) => {
    const result = next(action);
    
    // Check if the action affects TA-Lib indicators
    if (action.type?.startsWith('talibIndicators/') && 
        !action.type.includes('rehydrate') && 
        !action.type.includes('persist')) {
      
      const state = store.getState();
      
      // Debounce persistence to avoid excessive localStorage writes
      if (typeof window !== 'undefined') {
        clearTimeout((window as any).__talibPersistTimeout);
        (window as any).__talibPersistTimeout = setTimeout(() => {
          try {
            localStorage.setItem(
              'talib_indicator_configs', 
              JSON.stringify(state.talibIndicators.configurations)
            );
          } catch (error) {
            console.error('Failed to persist TA-Lib indicators:', error);
          }
        }, 100); // 100ms debounce
      }
    }
    
    return result;
  };

// Middleware to handle localStorage quota exceeded errors
export const storageErrorMiddleware: Middleware<{}, RootState> = 
  (store) => (next) => (action) => {
    try {
      return next(action);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Clearing old data...');
        
        // Clear old indicator data and retry
        try {
          localStorage.removeItem('talib_indicator_configs');
          localStorage.removeItem('talib_indicators'); // Legacy key
          return next(action);
        } catch (retryError) {
          console.error('Failed to clear localStorage and retry:', retryError);
        }
      }
      throw error;
    }
  };

function getLocalStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      if (value) total += value.length;
    }
  }
  return total;
}

function enforceLocalStorageQuota(maxBytes = 5 * 1024 * 1024) {
  while (getLocalStorageSize() > maxBytes) {
    // Remove the oldest entry (by key order)
    const keys = Object.keys(localStorage);
    if (keys.length === 0) break;
    localStorage.removeItem(keys[0]);
  }
}

// Before every setItem, enforce quota
localStorage.setItem = (function (originalSetItem) {
  return function (key, value) {
    enforceLocalStorageQuota();
    return originalSetItem.apply(this, arguments);
  };
})(localStorage.setItem);

// Combined persistence middleware
export const persistenceMiddleware = [
  talibPersistenceMiddleware,
  storageErrorMiddleware,
];