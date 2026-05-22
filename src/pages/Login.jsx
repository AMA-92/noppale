import React, { useState } from 'react'
import { usersStorage, authStorage } from '../utils/storage'
import { TrendingUp, Mail, Lock, Eye, EyeOff, Loader2, Play, X, Phone } from 'lucide-react'
import toast from 'react-hot-toast'


export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+221') // Sénégal par défaut

  // Charger les identifiants sauvegardés au démarrage
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedCredentials = localStorage.getItem('noppale_remembered_credentials')
        if (savedCredentials) {
          const credentials = JSON.parse(savedCredentials)
          setEmail(credentials.email || '')
          setPassword(credentials.password || '')
          setRememberMe(true)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des identifiants:', error)
      }
    }
  }, [])

  // Détecter la plateforme et l'état PWA
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Détecter iOS
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      setIsIOS(ios)

      // Détecter si déjà installé
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      setIsStandalone(standalone)

      // Écouter l'événement beforeinstallprompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault()
        setDeferredPrompt(e)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  // Fonction d'installation PWA
  const handleInstallPWA = async () => {
    // Si déjà installé
    if (isStandalone) {
      toast('Noppalé est déjà installée sur votre appareil !')
      return
    }

    // iOS - instructions manuelles
    if (isIOS) {
      toast('Pour installer Noppalé : 1️⃣ Appuyez sur Partager 2️⃣ "Sur l\'écran d\'accueil"', { 
        duration: 5000, 
        icon: '📱' 
      })
      return
    }

    // Android/Desktop avec prompt disponible
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('Installation en cours...')
        } else {
          toast('Installation annulée')
        }
        setDeferredPrompt(null)
      } catch (error) {
        console.error('Erreur installation PWA:', error)
        toast.error('Erreur lors de l\'installation')
      }
      return
    }

    // Fallback - instructions manuelles pour Android/Desktop
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    
    if (isChrome || isEdge) {
      toast('Cliquez sur le menu ⋮ → "Installer Noppalé"', { 
        duration: 5000, 
        icon: '📱' 
      })
    } else {
      toast('Utilisez Chrome ou Edge pour installer Noppalé', { 
        duration: 5000, 
        icon: '🌐' 
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    try {
      if (isLogin) {
        // Connexion avec Supabase
        const user = await usersStorage.signIn(email, password)
        if (user) {
          // Sauvegarder les identifiants si "Se souvenir de moi" est coché
          if (typeof window !== 'undefined' && window.localStorage) {
            if (rememberMe) {
              try {
                localStorage.setItem('noppale_remembered_credentials', JSON.stringify({
                  email,
                  password
                }))
              } catch (error) {
                console.error('Erreur lors de la sauvegarde des identifiants:', error)
              }
            } else {
              // Supprimer les identifiants sauvegardés si décoché
              try {
                localStorage.removeItem('noppale_remembered_credentials')
              } catch (error) {
                console.error('Erreur lors de la suppression des identifiants:', error)
              }
            }
          }
          
          toast.success('Connexion réussie !')
          // Redirection gérée par le composant App
          window.location.href = '/'
        } else {
          toast.error('Email ou mot de passe incorrect')
        }
      } else {
        // Création de compte avec Supabase
        if (password.length < 6) {
          toast.error('Mot de passe trop faible (minimum 6 caractères)')
          setLoading(false)
          return
        }

        if (phone.length < 8) {
          toast.error('Numéro de téléphone invalide (minimum 8 chiffres)')
          setLoading(false)
          return
        }

        const fullPhone = countryCode + phone
        const newUser = await usersStorage.signUp(email, password, email.split('@')[0], fullPhone)
        
        if (newUser) {
          toast.success('Compte créé avec succès !')
          window.location.href = '/'
        } else {
          toast.error('Erreur lors de la création du compte')
        }
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-8 overflow-hidden">
            <img src="/logo-exact.svg" alt="Noppalé" className="w-20 h-20" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4">Noppalé</h1>
          <p className="text-primary-200 text-lg mb-8">
            Votre partenaire de confiance pour gérer efficacement votre boutique ou commerce.
          </p>
          
          {/* Boutons vidéo et installation PWA */}
          <div className="mb-8 space-y-4">
            <button
              onClick={() => setShowVideoModal(true)}
              className="group relative w-full max-w-sm mx-auto bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl p-6 shadow-2xl border border-primary-400/30 transition-all duration-300 hover:scale-105 hover:shadow-primary-500/25"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <Play size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">Regarder la vidéo démo</p>
                  <p className="text-primary-200 text-sm">Découvrez Noppalé en action</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>

            <button
              onClick={handleInstallPWA}
              className="group relative w-full max-w-sm mx-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-2xl p-6 shadow-2xl border border-orange-400/30 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/25"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">Installer l'application</p>
                  <p className="text-orange-200 text-sm">Sur votre appareil</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </div>
          
          {/* Fonctionnalités en dessous de la vidéo */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '�', label: 'Stocks' },
              { icon: '💰', label: 'Ventes' },
              { icon: '�', label: 'Clients' },
              { icon: '�', label: 'Rapports' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-primary-100">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex items-center justify-center w-full lg:w-[480px] bg-white lg:rounded-l-[40px] shadow-2xl lg:px-8 lg:py-12 px-6 py-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-4 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo-exact.svg" alt="Noppalé" className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-800 text-lg">Noppalé</span>
          </div>

          <h2 className="text-xl lg:text-2xl font-black text-slate-800 mb-1">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-slate-500 text-xs lg:text-sm mb-4">
            {isLogin 
              ? 'Accédez à votre espace de gestion' 
              : 'Commencez à gérer votre commerce'
            }
          </p>

          {/* Mobile buttons - Video demo and PWA install */}
          <div className="lg:hidden space-y-3 mb-6">
            <button
              onClick={() => setShowVideoModal(true)}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl p-4 shadow-lg border border-primary-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-primary-500/25"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Play size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Regarder la vidéo démo</p>
                  <p className="text-primary-200 text-xs">Découvrez Noppalé</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleInstallPWA}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-4 shadow-lg border border-orange-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-orange-500/25"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Installer l'application</p>
                  <p className="text-orange-200 text-xs">Sur votre mobile</p>
                </div>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-4">
            {/* Email */}
            <div>
              <label className="label-field">Adresse email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input-field-with-icon"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-field">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field-with-icon pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Phone number (only for registration) */}
            {!isLogin && (
              <div>
                <label className="label-field">Numéro de téléphone</label>
                <div className="flex">
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="+221"
                      className="pl-10 pr-3 py-2.5 border border-slate-200 rounded-l-xl bg-slate-50 text-sm font-medium text-slate-600 w-28 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      // N'accepter que les chiffres
                      const value = e.target.value.replace(/\D/g, '')
                      setPhone(value)
                    }}
                    placeholder="77 123 45 67"
                    className="flex-1 pl-4 pr-4 py-2.5 border border-l-0 border-slate-200 rounded-r-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400 transition-all duration-150"
                    required
                  />
                </div>
              </div>
            )}

            
            {/* Remember me checkbox (only for login) */}
            {isLogin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-600">
                  Se souvenir de moi
                </label>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {isLogin ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            Conçu pour les commerçants d'Afrique de l'Ouest 🌍
          </p>
        </div>
      </div>

      {/* Modal Vidéo Démo */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Play size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Vidéo de démonstration Noppalé</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Contenu vidéo */}
            <div className="p-6">
              <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden">
                <video
                  key={showVideoModal} // Force re-render when modal opens
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  poster="/video-poster.jpg"
                  onLoadStart={() => {
                    console.log('Début du chargement vidéo');
                    setVideoError(false);
                  }}
                  onCanPlay={() => {
                    console.log('Vidéo prête à jouer');
                    setVideoError(false);
                  }}
                  onError={(e) => {
                    console.log('Erreur de chargement vidéo:', e);
                    setVideoError(true);
                  }}
                >
                  <source src="/videos/demo.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas les vidéos.
                </video>
                
                {/* Message d'erreur si vidéo ne charge pas */}
                {videoError && (
                  <div className="absolute inset-0 bg-slate-200 rounded-2xl flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play size={24} className="text-slate-500" />
                      </div>
                      <p className="text-slate-600 font-medium mb-2">Vidéo non disponible</p>
                      <p className="text-slate-500 text-sm mb-4">La vidéo n'a pas pu être chargée</p>
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>• Vérifiez que le fichier est dans /videos/</p>
                        <p>• Formats supportés: MP4, WebM, MP3</p>
                        <p>• Nom attendu: demo.mp4</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Description */}
              <div className="mt-6 text-center">
                <p className="text-slate-600 mb-4">
                  Découvrez comment Noppalé simplifie la gestion de votre commerce au quotidien.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span>Gestion des stocks</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Ventes rapides</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>Rapports détaillés</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      </div>
  )
}
