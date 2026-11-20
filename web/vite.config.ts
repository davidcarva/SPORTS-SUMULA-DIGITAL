import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: o build abre em qualquer pasta servida (serve.py, pendrive, GitHub Pages).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": versão nova nunca recarrega sozinha. O app só oferece atualizar fora de jogo em andamento.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Súmula Digital',
        short_name: 'Súmula',
        description: 'Súmula de basquete no celular, com os horários que viram os clipes de cada atleta.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0b0b0b',
        theme_color: '#0b0b0b',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tudo que o app usa fica guardado, inclusive o gerador de PDF. Fontes de alfabetos que não usamos ficam de fora.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*-cyrillic*', '**/*-greek*', '**/*-vietnamese*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/(api|clipes)\//],
        importScripts: ['push-sw.js'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
