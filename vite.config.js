import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at https://iamai.kg/thermopolium/ — nginx serves dist/ and proxies
// /thermopolium/api/ to the Node service (see deploy/).
export default defineConfig({
  base: '/thermopolium/',
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: { buffer: 'buffer' },
  },
  server: {
    port: 5173,
    proxy: {
      '/thermopolium/api': {
        target: 'http://localhost:3460',
        rewrite: (p) => p.replace(/^\/thermopolium/, ''),
      },
    },
  },
})
