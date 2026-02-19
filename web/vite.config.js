// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  // Emit assets beneath /in-kind-tracker/ in production; stay at / in dev
  base: process.env.VITE_BASE ?? (mode === 'production' ? '/in-kind-tracker/' : '/'),

  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    css: true
  },
}))
