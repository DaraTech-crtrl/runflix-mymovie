import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  /**
   * Load all env variables
   */
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    /**
     * Environment variables exposed to client
     * ONLY expose variables prefixed with VITE_
     */
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,

      /**
       * HMR Handling
       */
      hmr: process.env.DISABLE_HMR !== 'true',

      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {},

      /**
       * API Proxy
       */
      proxy: {
        '/api': {
          target:
            env.VITE_API_PROXY_TARGET || 'https://movieapi.gifted.co.ke',
          changeOrigin: true,
          secure: true,
          timeout: 30_000,
          proxyTimeout: 30_000,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_API_KEY) {
                proxyReq.setHeader(
                  'Authorization',
                  `Bearer ${env.VITE_API_KEY}`
                );
              }
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });

            proxy.on('error', (err, _req, res) => {
              const message =
                err instanceof Error ? err.message : 'Proxy error';
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    success: false,
                    message:
                      'Movie API unreachable from dev proxy. Check network, VITE_API_KEY, or VITE_API_PROXY_TARGET in .env',
                    detail: message,
                  })
                );
              }
            });
          },
        },
        '/img-proxy': {
          target: 'https://pbcdnw.aoneroom.com',
          changeOrigin: true,
          secure: true,
          router: (req) => {
            const urlParams = new URL(req.url || '', 'http://localhost');
            const targetUrlStr = urlParams.searchParams.get('url');
            if (targetUrlStr) {
              try {
                const targetUrl = new URL(targetUrlStr);
                return `${targetUrl.protocol}//${targetUrl.host}`;
              } catch (e) {
                // Ignore
              }
            }
            return 'https://pbcdnw.aoneroom.com';
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const urlParams = new URL(req.url || '', 'http://localhost');
              const targetUrlStr = urlParams.searchParams.get('url');
              if (targetUrlStr) {
                try {
                  const targetUrl = new URL(targetUrlStr);
                  proxyReq.path = targetUrl.pathname + targetUrl.search;
                  proxyReq.removeHeader('referer');
                  proxyReq.removeHeader('origin');
                  proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                } catch (e) {
                  // Ignore
                }
              }
            });
          },
        },
      },
    },

    /**
     * Build optimizations
     */
    build: {
      sourcemap: mode === 'development',

      chunkSizeWarningLimit: 1200,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
                return 'react';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'motion';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              if (id.includes('axios')) {
                return 'http';
              }
            }
            if (id.includes('CinematicPlayer')) {
              return 'player';
            }
            if (id.includes('/pages/Daratech')) {
              return 'daratech';
            }
            if (id.includes('/pages/Home')) {
              return 'home';
            }
          },
        },
      },
    },

    /**
     * Optimize dependencies
     */
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'motion',
        'lucide-react',
      ],
    },
  };
});
