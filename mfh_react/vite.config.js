import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || ''

  return {
    plugins: [react(), tailwindcss()],
    base: basePath ? basePath + '/' : '/',
    server: {
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://django:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
