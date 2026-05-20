import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['clients.devshield.fr', 'factures.devshield.fr', 'audit.devshield.fr', 'onboard.devshield.fr', 'honeypot.devshield.fr'],
    // Le navigateur passe par Caddy sur le port 80 : on aligne le HMR dessus.
    hmr: { clientPort: 80 }
  }
})
