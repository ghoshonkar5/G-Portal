import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // ── Placements backend (port 5005) ──
      '/api/placements': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/placements/, '/api'),
      },
      // ── Achievements backend (port 5004) ──
      '/api/achievements': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      '/api/export': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      '/achievement-uploads': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      // ── Publications-backend auth sub-paths (must come BEFORE generic /api/auth) ──
      '/api/auth/me': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/auth/profile-urls': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/auth/profile': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/auth/faculty-list': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/auth/faculty': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/auth/admin': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // ── General auth (login/register) → auth-service ──
      '/api/auth': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/profile': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/events': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/faculty': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/publications': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/flags': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/potential-flags': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/conferences': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/books': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/scholar': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/scopus': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/wos': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/krc': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/journal-rankings': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/admin/users': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },

    }
  }
})