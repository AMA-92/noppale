import React, { useState } from 'react'
import { usersStorage, authStorage } from '../utils/storage'
import { TrendingUp, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

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

        const newUser = await usersStorage.signUp(email, password, email.split('@')[0])
        
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
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl font-black text-primary-600">N</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-4">Noppalé</h1>
          <p className="text-primary-200 text-lg mb-8">
            Votre partenaire de confiance pour gérer efficacement votre boutique ou commerce.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '📦', label: 'Gestion des stocks' },
              { icon: '💰', label: 'Enregistrement des ventes' },
              { icon: '👥', label: 'Gestion clients & dettes' },
              { icon: '📊', label: 'Rapports & analyses' },
              { icon: '💵', label: 'Wave & Orange Money' },
              { icon: '📄', label: 'Export PDF factures' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-primary-100">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex items-center justify-center w-full lg:w-[480px] bg-white lg:rounded-l-[40px] shadow-2xl px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">N</span>
            </div>
            <span className="font-black text-slate-800 text-xl">Noppalé</span>
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-1">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isLogin 
              ? 'Accédez à votre espace de gestion' 
              : 'Commencez à gérer votre commerce'
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label-field">Adresse email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-field">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
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

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {isLogin ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Conçu pour les commerçants d'Afrique de l'Ouest 🌍
          </p>
        </div>
      </div>
    </div>
  )
}
