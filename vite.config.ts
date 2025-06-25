import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@prisma/client': 'src/fallback-prisma.js',
    },
  },
  optimizeDeps: {
    exclude: ['@prisma/client'],
  },
  ssr: {
    external: ['@prisma/client'],
  },
  build: {
    rollupOptions: {
      external: ['@prisma/client'],
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});