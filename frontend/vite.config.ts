import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const env = loadEnv('', process.cwd(), '')
const apiUrl = env.VITE_API_BASE_URL;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v1': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
})
