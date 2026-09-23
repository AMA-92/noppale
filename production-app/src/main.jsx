import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

const BUILD_MARKER = 'noppale-claude-flow-20260922-3'
if (typeof window !== 'undefined' && localStorage.getItem('noppale_build_marker') !== BUILD_MARKER) {
  localStorage.setItem('noppale_build_marker', BUILD_MARKER)
  localStorage.removeItem('cached_user')
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()))
  }
  if ('caches' in window) caches.keys().then((names) => names.forEach((name) => caches.delete(name)))
}

// Performance: Suppression de StrictMode pour éviter les double-rendus
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)


// PWA: forcer l'activation immédiate d'une nouvelle version du service worker
// (permet de voir les mises à jour sans attendre une nouvelle ouverture complète)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    // pas de logique spécifique ici, mais permet d'éviter que le SW garde un ancien état
    void event
  })
}
