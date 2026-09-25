import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // यह लाइन आपके .env या .env.production से वैरियेबल्स लोड करेगी
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          // अगर .env में URL नहीं मिला, तो यह डिफ़ॉल्ट रूप से localhost पर चलेगा
          target: env.VITE_API_BASE_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          timeout: 60000,
          proxyTimeout: 60000,
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          timeout: 60000,
          proxyTimeout: 60000,
        },
      },
    },
  };
});
