import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Share } from 'lucide-react'
import toast from 'react-hot-toast'

const APP_URL = 'https://noppale.vercel.app'

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    setIsMobile(mobile)

    if (isStandalone()) {
      setShowBanner(false)
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      setShowBanner(false)
      setDeferredPrompt(null)
      toast.success('Application installée avec succès !')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Sur mobile sans prompt natif (surtout iOS), afficher les instructions
    if (mobile && !isStandalone()) {
      const dismissed = sessionStorage.getItem('noppale_pwa_hint_dismissed')
      if (!dismissed) setShowBanner(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') toast.success('Installation en cours...')
      setDeferredPrompt(null)
      setShowBanner(false)
      return
    }

    if (isIOS()) {
      toast('Safari : Partager → « Sur l\'écran d\'accueil »', { duration: 5000, icon: '📱' })
    } else {
      window.open(APP_URL, '_blank')
      toast(`Ouvrez ${APP_URL} dans Chrome`, { duration: 5000 })
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('noppale_pwa_hint_dismissed', '1')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            {isMobile ? <Smartphone size={24} /> : <Download size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">Noppalé sur mobile</h3>
            {deferredPrompt ? (
              <p className="text-sm text-white/90 mb-3">
                Installez l&apos;application pour un accès rapide depuis votre téléphone.
              </p>
            ) : isIOS() ? (
              <p className="text-sm text-white/90 mb-3">
                <Share size={14} className="inline mr-1" />
                Safari → bouton <strong>Partager</strong> → <strong>Sur l&apos;écran d&apos;accueil</strong>
              </p>
            ) : (
              <p className="text-sm text-white/90 mb-3">
                Ouvrez <strong className="break-all">{APP_URL}</strong> dans Chrome, puis « Ajouter à l&apos;écran d&apos;accueil ».
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 bg-white text-orange-600 font-semibold px-4 py-2 rounded-lg hover:bg-white/90"
              >
                {deferredPrompt ? 'Installer' : 'Comment faire'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                aria-label="Fermer"
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
