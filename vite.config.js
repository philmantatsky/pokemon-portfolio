import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // honor an assigned port (e.g. from the Claude Code preview harness); falls
  // back to Vite's default 5173 when PORT isn't set
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
