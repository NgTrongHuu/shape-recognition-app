import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/data': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // onnxruntime-web cần để các .wasm chunk tách riêng
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('onnxruntime-web')) return 'onnx'
        },
      },
    },
  },
  // onnxruntime-web có module worker không tương thích pre-bundle
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
})
