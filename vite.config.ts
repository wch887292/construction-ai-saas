import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端构建根目录为 client，产物输出到项目根 dist/，由后端 Express 静态托管
export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
