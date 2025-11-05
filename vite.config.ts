import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Use GitHub Pages base only for production build; keep '/' in dev to avoid path warnings
  base: command === 'build' ? '/Wynikownia/' : '/',
  plugins: [react()],
}))
