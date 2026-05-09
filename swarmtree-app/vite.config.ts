import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Beeport's hosted backend at beeport.ethswarm.org/bzz only allows CORS
    // from its own origins (beeport.ethswarm.org, beeport.eth.limo). We proxy
    // through Vite so the browser sees a same-origin request to /api/swarm/...
    // while the actual hop to beeport happens server-to-server (no CORS).
    proxy: {
      '/api/swarm': {
        target: 'https://beeport.ethswarm.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/swarm/, ''),
      },
    },
  },
})
