import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `base` è configurabile per il deploy in sottocartella (es. GitHub Pages: BASE=/goaldrive/)
const base = process.env.BASE ?? '/goaldrive/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.svg'],
      manifest: {
        name: 'GoalDrive — il tuo obiettivo, ogni giorno',
        short_name: 'GoalDrive',
        description: "Risparmia verso quello che desideri davvero. L'obiettivo è al centro, non il denaro.",
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0A',
        theme_color: '#0A0A0A',
        categories: ['finance', 'lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: base + 'index.html',
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://firestore.googleapis.com',
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          motion: ['framer-motion']
        }
      }
    }
  }
})
