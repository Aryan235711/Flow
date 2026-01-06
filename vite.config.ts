import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': 'http://localhost:4000'
        }
      },
      build: {
        chunkSizeWarningLimit: 300, // Warn if chunks exceed 300KB
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'motion': ['framer-motion'],
              'icons': ['lucide-react']
            }
          }
        }
      },
      worker: {
        format: 'es', // Use ES modules for workers
        plugins: () => [react()]
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
