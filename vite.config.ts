import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Provide empty process.env to avoid errors
    'process.env': {},
    // Map global to window for browser compatibility
    'global': 'window'
  }
});