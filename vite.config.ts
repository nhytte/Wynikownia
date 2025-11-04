import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // IMPORTANT for GitHub Pages when served under /Wynikownia/
  // Adjust if your repository name changes or you use a custom domain
  base: '/Wynikownia/',
  plugins: [react()],
})
