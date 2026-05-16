import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher le comportement par défaut
      e.preventDefault()
      // Sauvegarder l'événement pour l'utiliser plus tard
      setDeferredPrompt(e)
      // Afficher la bannière d'installation
      setShowInstallBanner(true)
    }

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      // Cacher la bannière
      setShowInstallBanner(false)
      setDeferredPrompt(null)
      toast.success('Application installée avec succès!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Vérifier si l'application est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('Application déjà installée')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error('Installation non disponible')
      return
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt()
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('Utilisateur a accepté l\'installation')
      toast.success('Installation en cours...')
    } else {
      console.log('Utilisateur a refusé l\'installation')
    }
    
    // Nettoyer
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    // Ne pas supprimer deferredPrompt pour permettre l'installation ultérieure
  }

  if (!showInstallBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-2xl p-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Download size={24} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Installer Noppalé</h3>
            <p className="text-sm text-white/90 mb-3">
              Installez l'application sur votre appareil pour un accès rapide et une meilleure expérience.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-white text-orange-600 font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
