import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    /**
     * `host: true` binds 0.0.0.0 as well as ::1. Without it Vite listens on 127.0.0.1
     * only, and a browser that resolves `localhost` to ::1 gets ERR_CONNECTION_REFUSED
     * even though curl works (curl falls back to IPv4, Chrome often does not).
     * `strictPort` keeps the URL predictable: it fails loudly instead of silently
     * moving to 5175 when the port is taken.
     */
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
    },
  },
});
