import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Appen udgives som et GitHub Pages "project site" på
  // https://maltheboel.github.io/WiebenDesign/ — ikke et rod-domæne — så alle
  // asset-stier skal præfikses med repo-navnet, ellers bliver siden blank.
  base: '/WiebenDesign/',
})
