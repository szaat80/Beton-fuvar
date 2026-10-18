import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// Minden buildnél új cache-név kerül a service workerbe, így a felhasználók mindig az új verziót kapják.
function serviceWorkerVerzio() {
  return {
    name: 'service-worker-verzio',
    closeBundle() {
      const fajl = 'dist/sw.js'
      if (!existsSync(fajl)) return
      const tartalom = readFileSync(fajl, 'utf8')
      writeFileSync(fajl, tartalom.replace(/const CACHE_NAME = '([^']+?)(?:-b\d+)?'/, `const CACHE_NAME = '$1-b${Date.now()}'`))
    }
  }
}

export default defineConfig({
  plugins: [serviceWorkerVerzio()],
  build: {
    target: 'esnext',
    cssMinify: 'lightningcss',
    chunkSizeWarningLimit: 1000
  },
  css: { transformer: 'lightningcss' },
  server: {
    watch: {
      ignored: [
        /(^|[/\\])node_modules([/\\]|$)/,
        /(^|[/\\])\.git([/\\]|$)/,
        /(^|[/\\])release([/\\]|$)/
      ]
    }
  }
})
