import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.tsx';
import { store, rehydrateStore } from './store';
import './index.css';
import { runSmokeTest } from './utils/healthCheck';

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  // You could also log to a monitoring service like Sentry here
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // You could also log to a monitoring service like Sentry here
});

// Rehydrate store from localStorage
rehydrateStore();

// Run a health check on startup in development mode
if (import.meta.env.DEV) {
  console.log('Running health check...');
  performHealthCheck();
}

async function performHealthCheck() {
  try {
    const { performHealthCheck } = await import('./utils/healthCheck');
    const result = await performHealthCheck();
    console.log('Health check result:', result);
    
    if (result.status !== 'healthy') {
      console.warn('⚠️ Health check failed. Some features may not work correctly.');
      console.warn('Errors:', result.errors);
    }
  } catch (error) {
    console.error('Failed to run health check:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);