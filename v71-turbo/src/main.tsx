import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { migrate } from './core/version/migration'
import './styles.css'
import './modern.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Az alkalmazás gyökéreleme (#root) nem található.')
}

migrate()
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => r.unregister()))
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
}
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        await navigator.serviceWorker.ready
        const worker = registration.active
        if (!worker) throw new Error('Az offline alkalmazás háttérfolyamata nem indult el.')
        const assets = performance.getEntriesByType('resource')
          .map((entry) => new URL(entry.name, location.href))
          .filter((url) => url.origin === location.origin && url.pathname.startsWith('/assets/'))
          .map((url) => `${url.pathname}${url.search}`)
        worker.postMessage({ type: 'PRECACHE_ASSETS', assets })
      })
      .catch((error: unknown) => {
        console.error('Az offline webalkalmazás regisztrálása nem sikerült.', error)
      })
  })
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
