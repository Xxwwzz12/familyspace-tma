import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlInjectionPlugin } from 'vite-plugin-html-injection';

export default defineConfig({
  plugins: [
    react(),
    htmlInjectionPlugin({
      injections: [
        {
          name: 'Telegram WebApp SDK',
          type: 'raw',
          injectTo: 'head',
          path: './src/injections/telegram-sdk.html', // Создайте этот файл
          buildModes: 'both',
        }
      ]
    })
  ],
});