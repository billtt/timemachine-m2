import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Get build-time version information
const getBuildInfo = () => {
  try {
    const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const buildTime = new Date().toISOString();
    return { gitSha, buildTime };
  } catch (error) {
    console.warn('Could not get git info, using fallback version');
    return { gitSha: 'unknown', buildTime: new Date().toISOString() };
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  define: {
    __BUILD_INFO__: JSON.stringify(getBuildInfo()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          // Handle IP address access by proxying to backend on same network
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const host = req.headers.host;
            if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
              // Extract IP from host and proxy to backend on that IP
              const ip = host.split(':')[0];
              proxyReq.path = req.url;
              proxyReq.setHeader('host', `${ip}:3001`);
            }
          });
        }
      }
    }
  }
});