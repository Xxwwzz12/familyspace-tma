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
        root: config.root,
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
// Custom HTML Inject Plugin (Variant C)
// -----------------------------
function customHtmlInjectPlugin(): Plugin {
  let resolvedBase = '/';
  // собранные имена файлов (заполняем в generateBundle)
  const collected = { css: [] as string[], js: [] as string[] };

  return {
    name: 'custom-html-inject',

    configResolved(config) {
      resolvedBase = (config.base ?? '/').toString();
      if (!resolvedBase.endsWith('/')) resolvedBase = resolvedBase + '/';
      console.log('🔧 [Custom HTML] resolved base =', resolvedBase);
    },

    transformIndexHtml: {
      enforce: 'pre',
      transform(_html) {
        try {
          const originalPath = path.join(process.cwd(), 'index.html');
          if (fs.existsSync(originalPath)) {
            let originalHtml = fs.readFileSync(originalPath, 'utf-8');
            originalHtml = originalHtml.replace(/<script\s+type=["']module["']\s+src=["']\/src\/.*?<\/script>/g, '');
            if (!originalHtml.includes('<!-- VITE_INJECT -->')) {
              if (originalHtml.includes('</head>')) {
                originalHtml = originalHtml.replace('</head>', '    <!-- VITE_INJECT -->\n</head>');
                console.log('🔧 [Custom HTML] Placeholder inserted before </head>');
              } else {
                originalHtml = originalHtml + '\n<!-- VITE_INJECT -->';
                console.log('🔧 [Custom HTML] Placeholder appended to end of file');
              }
            } else {
              console.log('🔧 [Custom HTML] Placeholder already present in original index.html');
            }
            return originalHtml;
          } else {
            console.log('❌ [Custom HTML] original index.html not found, falling back to provided html');
            return _html;
          }
        } catch (err) {
          console.error('❌ [Custom HTML] transform error:', err);
          return _html;
        }
      }
    },

    // НАДЁЖНО собираем имена файлов здесь
    generateBundle(_options, bundle) {
      try {
        console.log('🔁 [Custom HTML] generateBundle — collecting asset names');
        // очищаем предыдущие значения
        collected.css.length = 0;
        collected.js.length = 0;

        for (const key of Object.keys(bundle || {})) {
          const item: any = (bundle as any)[key];
          if (!item) continue;
          const outName: string = (item.fileName ?? key).toString();

          // игнорируем сам index.html
          if (outName === 'index.html' || outName.endsWith('/index.html')) {
            console.log(`   ↪ skipping emitted index.html entry: ${outName}`);
            continue;
          }

          if (outName.endsWith('.css')) {
            collected.css.push(outName);
          } else if (outName.endsWith('.js')) {
            collected.js.push(outName);
          }

          console.log(`   ↪ found asset (generateBundle): ${outName}, type=${item.type}, isEntry=${item.isEntry ?? 'n/a'}`);
        }

        collected.css.sort();
        collected.js.sort();

        console.log(`   ↪ collected.css=${collected.css.length}, collected.js=${collected.js.length}`);
      } catch (err) {
        console.error('❌ [Custom HTML] generateBundle collect error:', err);
      }
    },

    // В writeBundle используем уже собранные имена — это надёжно
    writeBundle(_options, bundle) {
      try {
        console.log('🔁 [Custom HTML] writeBundle — composing asset tags and writing final index.html');

        // Если по какой-то причине collected пуст, пытаемся собрать прямо сейчас (fallback)
        if (collected.css.length === 0 && collected.js.length === 0) {
          console.log('   ↪ collected arrays empty, trying fallback collection from writeBundle bundle...');
          for (const key of Object.keys(bundle || {})) {
            const item: any = (bundle as any)[key];
            if (!item) continue;
            const outName: string = (item.fileName ?? key).toString();
            if (outName === 'index.html' || outName.endsWith('/index.html')) continue;
            if (outName.endsWith('.css')) collected.css.push(outName);
            else if (outName.endsWith('.js')) collected.js.push(outName);
            console.log(`   ↪ found asset (writeBundle fallback): ${outName}, type=${item.type}, isEntry=${item.isEntry ?? 'n/a'}`);
          }
          collected.css.sort();
          collected.js.sort();
        }

        // Сформировать теги
        const makeHref = (fname: string) => {
          if (/^https?:\/\//.test(resolvedBase)) return resolvedBase + fname;
          const baseTrim = resolvedBase.replace(/\/+$/,'');
          return ('/' + [baseTrim.replace(/^\//,''), fname].filter(Boolean).join('/')).replace(/\/+/g,'/');
        };

        const cssTags = collected.css.map(f => `<link rel="stylesheet" href="${makeHref(f)}">`).join('\n    ');
        const jsTags = collected.js.map(f => `<script type="module" src="${makeHref(f)}"></script>`).join('\n    ');
        const injectMarkup = [cssTags, jsTags].filter(Boolean).join('\n    ');

        // Подставляем в оригинал (или dist как fallback)
        const originalIndexPath = path.join(process.cwd(), 'index.html');
        let finalHtml = '';
        if (fs.existsSync(originalIndexPath)) {
          finalHtml = fs.readFileSync(originalIndexPath, 'utf-8');
        } else {
          const fallbackDist = path.join(process.cwd(), 'dist', 'index.html');
          if (fs.existsSync(fallbackDist)) finalHtml = fs.readFileSync(fallbackDist, 'utf-8');
          else {
            console.error('❌ [Custom HTML] No original or dist index.html available to inject into — aborting');
            return;
          }
        }

        if (injectMarkup) {
          if (finalHtml.includes('<!-- VITE_INJECT -->')) {
            finalHtml = finalHtml.replace('<!-- VITE_INJECT -->', '\n    ' + injectMarkup + '\n');
            console.log('🔧 [Custom HTML] Replaced <!-- VITE_INJECT --> with composed tags');
          } else if (finalHtml.includes('</head>')) {
            finalHtml = finalHtml.replace('</head>', '    ' + injectMarkup + '\n</head>');
            console.log('🔧 [Custom HTML] Injected tags before </head>');
          } else if (finalHtml.includes('<body')) {
            finalHtml = finalHtml.replace(/<body([^>]*)>/i, match => `${match}\n    ${injectMarkup}`);
            console.log('🔧 [Custom HTML] Injected tags at top of <body>');
          } else {
            finalHtml = injectMarkup + '\n' + finalHtml;
            console.log('🔧 [Custom HTML] Prepended tags to document');
          }
        } else {
          console.log('⚠️ [Custom HTML] No assets found to inject (injectMarkup empty)');
        }

        const outPath = path.join(process.cwd(), 'dist', 'index.html');
        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, finalHtml, 'utf-8');

        console.log(`💾 [Custom HTML] dist/index.html overwritten (css:${collected.css.length} js:${collected.js.length})`);
      } catch (err) {
        console.error('❌ [Custom HTML] writeBundle error:', err);
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
