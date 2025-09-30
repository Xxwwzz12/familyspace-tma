import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// -----------------------------
// Export Vite config
// -----------------------------
export default defineConfig({
  base: './', // Базовый путь для ресурсов
  
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'es',
      },
      onwarn(warning, warn) {
        if ((warning as any).code === 'UNRESOLVED_IMPORT') {
          console.error('🚨 [Rollup] Unresolved import:', (warning as any).source ?? warning);
        }
        warn(warning as any);
      },
    },
    minify: 'terser',
    terserOptions: {
      format: { comments: false },
      compress: { drop_console: false },
    },
  },

  publicDir: 'public',
  logLevel: 'info',
});