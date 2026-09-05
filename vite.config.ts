import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: { name: 'Schulplaner', short_name: 'Schulplaner', description: 'Lokaler Schulplaner für die Schulleitung', theme_color: '#173f3a', background_color: '#f5f5f0', display: 'standalone', start_url: '.', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] },
    workbox: { navigateFallback: 'index.html', globPatterns: ['**/*.{js,css,html,svg}'] },
    devOptions: { enabled: true }
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true }
})
