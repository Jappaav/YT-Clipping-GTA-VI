import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // `npm run demo` start de app in demomodus (voorbeeldgegevens, geen login).
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify(mode === 'demo' ? 'true' : 'false'),
  },
}))
