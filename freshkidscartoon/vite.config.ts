/// <reference types="vitest" />
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const isComingSoon = process.env.COMING_SOON === 'true';

export default defineConfig({
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        isComingSoon && {
          name: 'coming-soon',
          configureServer(server) {
            server.middlewares.use((_req, res) => {
              const html = fs.readFileSync(
                path.resolve(__dirname, 'coming-soon.html'), 'utf-8'
              );
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            });
          },
          generateBundle() {
            const html = fs.readFileSync(
              path.resolve(__dirname, 'coming-soon.html'), 'utf-8'
            );
            this.emitFile({ type: 'asset', fileName: 'index.html', source: html });
          },
        },
      ].filter(Boolean),
      define: {
        'process.env': '{}',
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: './src/setupTests.ts',
        css: false,
        server: {
            deps: {
                fallbackCJS: true
            }
        }
      },
      build: {
        minify: false,
        sourcemap: true,
        rollupOptions: isComingSoon ? { input: 'coming-soon.html' } : {},
      }
    });
