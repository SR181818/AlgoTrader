import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: './client',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./client/src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ['talib', 'ccxt'],
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['algotrader-lngk.onrender.com'], // ✅ Allow your backend domain
    proxy: {
      '/api': {
        target: 'https://algotrader-lngk.onrender.com', // ✅ Use live backend during dev
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
