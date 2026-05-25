import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// NOTE: package.json has "type":"module" so this file runs as ESM.
// __dirname is NOT available in ESM. Use import.meta.url instead.

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
})