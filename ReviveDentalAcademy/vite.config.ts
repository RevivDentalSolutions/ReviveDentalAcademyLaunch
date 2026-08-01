import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy Stripe API requests to your backend server
      '/api/stripe': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy AI API requests to the AI server
      '/api/ai': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Proxy video generation requests to the video server
      '/api/video': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      // Proxy admin video lesson rendering requests to the video server
      '/api/admin/video-lessons': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
