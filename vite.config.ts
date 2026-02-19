import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Fallback to process.env if loadEnv (from .env files) is empty
  // Useful for CI/CD like GitHub Actions
  const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

  return {
    base: '/iABSS/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    define: {
      'process.env.API_KEY': JSON.stringify(GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
      'process.env.EXPO_PUBLIC_SUPABASE_KEY': JSON.stringify(SUPABASE_KEY),
      'process': { env: {} }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});