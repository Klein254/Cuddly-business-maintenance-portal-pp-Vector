import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Set by the Tauri CLI when it builds the installed desktop/mobile app (see src-tauri/).
const isTauriBuild = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // The installed apps ship their files locally, so the offline service worker is only for the web/PWA build.
      ...(isTauriBuild ? [] : [VitePWA({
        registerType: 'autoUpdate',
        // Include the background photos so the glass interface looks the same offline
        workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg}'] },
        manifest: {
          name: 'Vector Technical Maintenance App',
          short_name: 'Vector',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Keep Tauri CLI output visible in the terminal.
    clearScreen: false,
    server: {
      // The Tauri window loads this exact port, so fail instead of silently switching ports.
      strictPort: isTauriBuild,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/src-tauri/**'] },
    },
  };
});
