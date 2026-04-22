import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy : les appels /api/... sont redirigés vers le backend Express
    // Cela évite les problèmes CORS en développement
    proxy: {
      '/api': {
        target:      'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target:      'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
