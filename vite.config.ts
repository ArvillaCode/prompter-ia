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
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        // Only expose the key in local dev; production uses /api/generate
        // (Vercel function) so the key never ships in the bundle
        'process.env.API_KEY': JSON.stringify(mode === 'development' ? env.GEMINI_API_KEY : ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
