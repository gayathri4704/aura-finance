import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Aura Finance Tracker',
        short_name: 'Aura Finance',
        display: 'standalone',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  // INDHA BUILD SECTION-A IPPO ADD PANNUNGA
  build: {
    chunkSizeWarningLimit: 2000, // Intha limit-a mathitta antha warning error-a maarathu
  }
})