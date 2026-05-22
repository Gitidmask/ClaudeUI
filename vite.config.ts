import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tauri from 'vite-plugin-tauri'

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  plugins: [react(), tailwindcss(), tauri()],
  build: {
    rollupOptions: {
      input: {
        index: resolve('src/renderer/index.html'),
        'log-viewer': resolve('src/renderer/log-viewer.html')
      }
    }
  }
})
