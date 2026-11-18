import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH || '/';
const prefix = base === '/' ? '' : base.replace(/\/$/, '');

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'github-pages-spa-fallback',
      apply: 'build',
      closeBundle() {
        const source = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Somente</title></head><body><script>const base=${JSON.stringify(prefix)};const p=location.pathname.startsWith(base + '/')?location.pathname.slice(base.length):location.pathname;const route=(p||'/')+location.search+location.hash;location.replace(base+'/?__path='+encodeURIComponent(route));</script></body></html>`;
        writeFileSync(path.resolve(process.cwd(), 'dist/404.html'), source);
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
  },
});
