import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hub/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/hub/api': {
        target: 'http://localhost:3400',
        rewrite: (p) => p.replace(/^\/hub/, ''),
      },
    },
  },
})
