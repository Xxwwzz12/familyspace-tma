// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Явно указываем корневую директорию проекта (относительно этого конфига)
  root: process.cwd(),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Опционально: явно задаем путь для сборки
  build: {
    outDir: 'dist'
  }
});