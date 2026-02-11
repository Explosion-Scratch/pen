import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  root: 'web',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'web'),
      '@core': resolve(__dirname, 'core'),
      '@adapters': resolve(__dirname, 'adapters'),
      'fs': resolve(__dirname, 'web/mocks/node-modules.js'),
      'path': resolve(__dirname, 'web/mocks/node-modules.js'),
      'url': resolve(__dirname, 'web/mocks/node-modules.js')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      external: ['terser'],
      output: {
        inlineDynamicImports: true,
        globals: {
          'terser': 'Terser'
        }
      }
    }
  }
})
