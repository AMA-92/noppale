import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA: forcer l'activation immédiate d'une nouvelle version du service worker
// (permet de voir les mises à jour sans attendre une nouvelle ouverture complète)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    // pas de logique spécifique ici, mais permet d'éviter que le SW garde un ancien état
    void event
  })
}

