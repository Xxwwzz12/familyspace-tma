import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// -----------------------------
// HTML Debug Plugin
// -----------------------------
function htmlDebugPlugin(): Plugin {
  let step = 0;

  return {
    name: 'html-debug-plugin',

    config(config) {
      console.log('🔧 [HTML Debug] Config loaded:', {
        root: path.resolve(__dirname),
        build: config.build,
        pluginNames: (config.plugins ?? [])
          .map((p: any) => {
            if (!p) return String(p);
            if (Array.isArray(p)) return '[Plugin array]';
            if (typeof p === 'function') return p.name || '[function plugin]';
            return (p as any).name ?? '[anonymous plugin]';
          })
          .filter(Boolean),
      });

      const htmlPlugins =
        (config.plugins ?? []).filter(
          (p: any) => p && typeof p === 'object' && 'transformIndexHtml' in p
        ) ?? [];
      console.log('🔌 [HTML Debug] Plugins handling HTML:', htmlPlugins.map((p: any) => p.name ?? '[anon]'));

      return null;
    },

    buildStart() {
      const debugDir = path.join(process.cwd(), 'vite-debug');
      try {
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
      } catch (err) {
        console.warn('⚠️ [HTML Debug] Failed to ensure vite-debug dir:', err);
      }
      console.log('🏗️ [HTML Debug] buildStart — debug dir prepared');
    },

    transformIndexHtml: {
      enforce: 'pre',
      async transform(html, ctx) {
        step++;
        const stepName = `Step_${step}`;
        try {
          console.log(`📄 [HTML Debug] ${stepName} - transformIndexHtml called`);
          console.log(`📁 [HTML Debug] ${stepName} - Context:`, { path: ctx.path, filename: ctx.filename, server: !!ctx.server });

          const debugDir = path.join(process.cwd(), 'vite-debug');
          if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
          const debugFile = path.join(debugDir, `${stepName}_${Date.now()}.html`);
          fs.writeFileSync(debugFile, html, 'utf-8');

          console.log(`💾 [HTML Debug] ${stepName} - HTML saved to: ${debugFile}`);
          console.log(`📝 [HTML Debug] ${stepName} - HTML length: ${html.length} chars`);
        } catch (err) {
          console.error(`❌ [HTML Debug] ${stepName} - Error saving HTML:`, err);
        }

        return html;
      }
    },

    generateBundle(_options, bundle) {
      try {
        const keys = Object.keys(bundle || {});
        console.log('📦 [HTML Debug] generateBundle called — bundle keys count:', keys.length);

        keys.forEach(fileName => {
          const item: any = (bundle as any)[fileName];
          if (!item) return;
          if (item.type === 'chunk') {
            const size = typeof item.code === 'string' ? item.code.length : 0;
            console.log(`📋 [HTML Debug] Chunk ${fileName}: size=${size}`);
          } else {
            const size = typeof item.source === 'string' ? item.source.length : (item.source?.byteLength ?? 0);
            console.log(`📋 [HTML Debug] Asset ${fileName}: size=${size}`);
          }
        });
      } catch (err) {
        console.error('❌ [HTML Debug] generateBundle error:', err);
      }
    },

    buildEnd() {
      try {
        const distIndex = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(distIndex)) {
          const finalHtml = fs.readFileSync(distIndex, 'utf-8');
          const debugFile = path.join(process.cwd(), 'vite-debug', `FINAL_${Date.now()}.html`);
          fs.writeFileSync(debugFile, finalHtml, 'utf-8');
          console.log('🏁 [HTML Debug] buildEnd — final index saved to vite-debug');
          console.log(`📏 [HTML Debug] Final HTML length: ${finalHtml.length} chars`);
        } else {
          console.log('🏁 [HTML Debug] buildEnd — dist/index.html not found');
        }
      } catch (err) {
        console.error('❌ [HTML Debug] buildEnd error:', err);
      }
    }
  };
}

// -----------------------------
// Custom HTML Inject Plugin (Исправленная версия)
// -----------------------------
function customHtmlInjectPlugin(): Plugin {
  return {
    name: 'custom-html-inject',
    transformIndexHtml: {
      enforce: 'pre', // Важно: обрабатываем HTML до стандартных плагинов Vite
      async transform(html) {
        console.log('🔧 [Custom HTML] Starting HTML transformation...');
        
        // 1. УДАЛЯЕМ старый тег с исходным main.tsx
        const htmlWithoutOldScript = html.replace(
          /<script type="module" src="\.\/src\/main\.tsx"><\/script>\s*/g, 
          ''
        );
        console.log('✅ [Custom HTML] Removed old main.tsx script tag');
        
        // 2. Формируем новые теги для CSS и JS
        const cssTag = '<link rel="stylesheet" href="/assets/index-f68f4a23.css">';
        const jsTags = [
          '<script type="module" src="/assets/eruda-3f8a668f.js"></script>',
          '<script type="module" src="/assets/index-37d3d0eb.js"></script>'
        ].join('\n    ');
        
        const composedTags = `${cssTag}\n    ${jsTags}`;
        
        // 3. ЗАМЕНЯЕМ плейсхолдер на сгенерированные теги
        const finalHtml = htmlWithoutOldScript.replace(
          '<!-- VITE_INJECT -->', 
          composedTags
        );
        
        console.log('✅ [Custom HTML] Successfully replaced VITE_INJECT placeholder');
        return finalHtml;
      }
    }
  };
}

// -----------------------------
// Export Vite config
// -----------------------------
export default defineConfig({
  plugins: [
    react(),
    // debug plugin first to capture initial transforms
    htmlDebugPlugin(),
    // then the injector plugin
    customHtmlInjectPlugin(),
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