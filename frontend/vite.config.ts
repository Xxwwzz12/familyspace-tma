import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// -----------------------------
// Закомментированные плагины
// -----------------------------
/*
// HTML Debug Plugin (закомментирован)
function htmlDebugPlugin(): Plugin {
  // ... весь код плагина
}

// Custom HTML Inject Plugin (закомментирован)  
function customHtmlInjectPlugin(): Plugin {
  // ... весь код плагина
}
*/

// -----------------------------
// Export Vite config
// -----------------------------
export default defineConfig({
  plugins: [
    react(),
    // htmlDebugPlugin(), // Закомментировано
    // customHtmlInjectPlugin(), // Закомментировано
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