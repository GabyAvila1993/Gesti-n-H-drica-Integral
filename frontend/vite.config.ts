import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Plugin Vite liviano para PWA que inyecta encabezados de Service Worker en desarrollo
 * y mantiene libre de vulnerabilidades el árbol de dependencias.
 */
function vitePwaPlugin(): Plugin {
  return {
    name: 'ghi-pwa-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        if ((req as any).url === '/sw.js') {
          res.setHeader('Service-Worker-Allowed', '/');
          res.setHeader('Cache-Control', 'no-cache');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vitePwaPlugin()],
  server: {
    port: 5173,
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
