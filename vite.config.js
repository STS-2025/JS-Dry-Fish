import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-route-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/admin' || req.url === '/admin/' || req.url === '/admin-main') {
            req.url = '/admin.html';
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        store: resolve(appDir, 'index.html'),
        admin: resolve(appDir, 'admin.html'),
        qrLanding: resolve(appDir, 'QR-Landing-page/index.html')
      }
    }
  }
});
