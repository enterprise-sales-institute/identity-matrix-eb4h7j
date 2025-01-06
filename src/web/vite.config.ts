import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0

export default defineConfig({
  // React plugin configuration with Fast Refresh and automatic JSX runtime
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime', { helpers: true }]
        ]
      }
    }),
    // TypeScript path resolution plugin
    tsconfigPaths({
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    })
  ],

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    host: true, // Listen on all network interfaces
    cors: true,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: ['console.log']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk splitting for optimal caching
          vendor: ['react', 'react-dom', '@mui/material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['d3'],
          utils: ['date-fns', 'lodash']
        }
      }
    }
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    host: true
  },

  // Path resolution and aliases
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@store': '/src/store'
    }
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";'
      }
    }
  },

  // ESBuild configuration
  esbuild: {
    jsxInject: "import React from 'react'",
    legalComments: 'none'
  }
});