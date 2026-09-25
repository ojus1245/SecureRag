import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory.
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';

  return {
    // Plugins
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true
      })
    ],

    // Resolve configuration
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@services': path.resolve(__dirname, './src/services'),
        '@store': path.resolve(__dirname, './src/store'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@types': path.resolve(__dirname, './src/types'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@config': path.resolve(__dirname, './src/config')
      }
    },

    // Development server
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: true,
      open: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          ws: true
        },
        '/ws': {
          target: env.VITE_WS_PROXY_TARGET || 'ws://localhost:5000',
          ws: true,
          changeOrigin: true
        }
      }
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000
    },

    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@reduxjs/toolkit',
        'react-redux',
        '@mui/material',
        '@mui/icons-material',
        'axios',
        'date-fns',
        'recharts'
      ],
      exclude: []
    },

    // Preview server
    preview: {
      port: 4173,
      host: true
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __MODE__: JSON.stringify(mode)
    },

    // Logging
    logLevel: 'info',

    // Clear screen on rebuild
    clearScreen: false,

    // Static assets
    publicDir: 'public',

    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => []
    }
  };
});