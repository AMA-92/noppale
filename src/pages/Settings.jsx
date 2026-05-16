import React, { useState, useEffect } from 'react'
import { authStorage, usersStorage, appStorage } from '../utils/storage'
import storage from '../utils/storage'
import { Settings as SettingsIcon, User, Bell, Shield, Database, LogOut, X, Eye, EyeOff, Trash2, Moon, Sun, Store, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '../hooks/useI18n.jsx'
import { useShopInfoRealtime, useUserPreferencesRealtime, useSecretCodeRealtime } from '../hooks/useRealtime.jsx'
import { currencies } from '../utils/i18n'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { updateLanguage, updateCurrency, updateDarkMode, language, currency, t, availableLanguages } = useI18n()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('personal')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)
  const [showDataDeleteModal, setShowDataDeleteModal] = useState(false)
  const [showShopInfoModal, setShowShopInfoModal] = useState(false)
  const [dataDeletePassword, setDataDeletePassword] = useState('')
  
  // États pour le code secret
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false)
  const [showChangeCodeModal, setShowChangeCodeModal] = useState(false)
  const [secretCode, setSecretCode] = useState('')
  const [currentCodeForChange, setCurrentCodeForChange] = useState('')
  const [newSecretCode, setNewSecretCode] = useState('')
  const [confirmNewSecretCode, setConfirmNewSecretCode] = useState('')
  
  // États pour les formulaires
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  })
  const [preferences, setPreferences] = useState({
    darkMode: document.documentElement.classList.contains('dark'),
    notifications: true,
    language: language,
    currency: currency
  })
  const [shopInfo, setShopInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: ''
  })

  useEffect(() => {
    // Charger les informations de l'utilisateur et les préférences
    const currentUser = authStorage.getCurrentUser()
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || ''
      })
    }

    // Charger les préférences depuis Supabase
    loadPreferences()

    // Charger les informations de la boutique
    loadShopInfo()

    // Charger le code secret depuis Supabase
    loadSecretCode()
  }, [])

  // Écouter les changements en temps réel sur les informations de la boutique
  useShopInfoRealtime((payload) => {
    console.log('Realtime shop_info change:', payload)
    loadShopInfo()
  })

  // Écouter les changements en temps réel sur les préférences utilisateur
  useUserPreferencesRealtime((payload) => {
    console.log('Realtime user_preferences change:', payload)
    loadPreferences()
  })

  // Écouter les changements en temps réel sur le code secret
  useSecretCodeRealtime((payload) => {
    console.log('Realtime user_secret_code change:', payload)
    loadSecretCode()
  })

  const loadShopInfo = async () => {
    try {
      const savedShopInfo = await appStorage.getShopInfo()
      setShopInfo(savedShopInfo)
    } catch (error) {
      console.error('Erreur de chargement des informations de la boutique:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const savedPreferences = await appStorage.getUserPreferences()
      if (savedPreferences) {
        setPreferences({
          darkMode: savedPreferences.dark_mode || false,
          notifications: savedPreferences.notifications !== false,
          language: savedPreferences.language || 'fr',
          currency: savedPreferences.currency || 'FCFA'
        })
      } else {
        // Utiliser les valeurs par défaut si pas de préférences dans Supabase
        setPreferences({
          darkMode: document.documentElement.classList.contains('dark'),
          notifications: true,
          language: language,
          currency: currency
        })
      }
    } catch (error) {
      console.error('Erreur de chargement des préférences:', error)
    }
  }

  const loadSecretCode = async () => {
    try {
      const savedSecretCode = await appStorage.getSecretCode()
      setSecretCode(savedSecretCode)
    } catch (error) {
      console.error('Erreur de chargement du code secret:', error)
      setSecretCode('1234')
    }
  }

  // Synchroniser le mode sombre avec l'état actuel du document
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setPreferences(prev => ({ ...prev, darkMode: isDark }))
  }, [])

  // Gestion du changement de mot de passe
  const handlePasswordChange = (e) => {
    e.preventDefault()
    
    console.log('🔍 Début changement mot de passe')
    console.log('📝 Formulaire:', passwordForm)
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      console.log('❌ Champs manquants')
      toast.error('Tous les champs sont requis')
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      console.log('❌ Mots de passe ne correspondent pas')
      toast.error('Les nouveaux mots de passe ne correspondent pas')
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      console.log('❌ Mot de passe trop court')
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    
    try {
      const currentUser = authStorage.getCurrentUser()
      console.log('👤 Utilisateur actuel:', currentUser)
      
      if (!currentUser) {
        console.log('❌ Aucun utilisateur connecté')
        toast.error('Aucun utilisateur connecté')
        return
      }
      
      console.log('🔐 Vérification authentification avec:', currentUser.email, passwordForm.currentPassword)
      const authenticatedUser = usersStorage.authenticate(currentUser.email, passwordForm.currentPassword)
      console.log('✅ Résultat authentification:', authenticatedUser)
      
      if (authenticatedUser) {
        console.log('🔄 Mise à jour mot de passe pour utilisateur ID:', currentUser.id)
        const updatedUser = usersStorage.updateUser(currentUser.id, { password: passwordForm.newPassword })
        console.log('✅ Utilisateur mis à jour:', updatedUser)
        
        toast.success('Mot de passe changé avec succès')
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        console.log('❌ Échec authentification')
        toast.error('Mot de passe actuel incorrect')
      }
    } catch (error) {
      console.error('💥 Erreur lors du changement de mot de passe:', error)
      toast.error(`Erreur: ${error.message || 'Erreur lors du changement de mot de passe'}`)
    }
  }

  // Gestion des informations personnelles
  const handleProfileUpdate = (e) => {
    e.preventDefault()
    
    console.log('🔍 Début mise à jour profil')
    console.log('📝 Formulaire profil:', profileForm)
    
    if (!profileForm.name || !profileForm.email) {
      console.log('❌ Champs manquants')
      toast.error('Tous les champs sont requis')
      return
    }
    
    try {
      const currentUser = authStorage.getCurrentUser()
      console.log('👤 Utilisateur actuel pour mise à jour:', currentUser)
      
      if (!currentUser) {
        console.log('❌ Aucun utilisateur connecté')
        toast.error('Aucun utilisateur connecté')
        return
      }
      
      console.log('🔄 Mise à jour utilisateur ID:', currentUser.id, 'avec:', { name: profileForm.name, email: profileForm.email })
      const updatedUser = usersStorage.updateUser(currentUser.id, {
        name: profileForm.name,
        email: profileForm.email
      })
      console.log('✅ Utilisateur mis à jour dans storage:', updatedUser)
      
      // Mettre à jour l'utilisateur connecté
      const updatedCurrentUser = { ...currentUser, name: profileForm.name, email: profileForm.email }
      authStorage.setCurrentUser(updatedCurrentUser)
      console.log('✅ Session utilisateur mise à jour:', updatedCurrentUser)
      console.log('🔄 Notification envoyée au Layout pour synchronisation')
      
      toast.success('Informations mises à jour avec succès')
      setShowProfileModal(false)
    } catch (error) {
      console.error('💥 Erreur lors de la mise à jour du profil:', error)
      toast.error(`Erreur: ${error.message || 'Erreur lors de la mise à jour des informations'}`)
    }
  }

  // Gestion des préférences
  const handlePreferencesSave = async () => {
    try {
      // Sauvegarder dans Supabase
      await appStorage.setUserPreferences(preferences)

      // Appliquer les changements localement
      updateLanguage(preferences.language)
      updateCurrency(preferences.currency)
      updateDarkMode(preferences.darkMode)

      toast.success('Préférences sauvegardées avec succès')
      setShowPreferencesModal(false)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      toast.error('Erreur lors de la sauvegarde des préférences')
    }
  }

  // Gestion des informations de la boutique
  const handleShopInfoUpdate = (e) => {
    e.preventDefault()
    
    try {
      appStorage.setShopInfo(shopInfo)
      toast.success('Informations de la boutique mises à jour avec succès')
      setShowShopInfoModal(false)
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des informations de la boutique')
    }
  }

  // Gestion du téléchargement du logo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast.error('L\'image ne doit pas dépasser 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        setShopInfo({ ...shopInfo, logo: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  // Gestion de la déconnexion
  const handleLogout = () => {
    authStorage.logout()
    toast.success('Déconnexion réussie')
    window.location.href = '/login'
  }

  // Fonction de bypass pour test (sans vérification mot de passe)
  const bypassDataDelete = () => {
    console.log('🚨 BYPASS - Suppression sans vérification')
    
    if (confirm('⚠️ ATTENTION: Ceci est un test de bypass. Voulez-vous vraiment supprimer toutes les données sans vérification de mot de passe?')) {
      console.log('🗑️ Lancement suppression directe...')
      handleClearData()
      setShowDataDeleteModal(false)
      setDataDeletePassword('')
      toast.warning('Suppression effectuée via bypass de test')
    }
  }

  // Fonction de test pour vérifier l'authentification
  const testAuthentication = () => {
    console.log('TEST AUTHENTIFICATION - MEME METHODE QUE LOGIN.JS')
    
    const currentUser = authStorage.getCurrentUser()
    console.log('Utilisateur connecte:', currentUser?.email)
    
    if (!currentUser) {
      console.log('Aucun utilisateur connecte')
      return
    }
    
    if (!dataDeletePassword) {
      console.log('Aucun mot de passe fourni')
      return
    }
    
    console.log('Test avec usersStorage.authenticate()...')
    console.log('- Email:', currentUser.email)
    console.log('- Password provided:', dataDeletePassword ? 'YES' : 'NO')
    
    // UTILISER EXACTEMENT LA MEME METHODE
    const authenticatedUser = usersStorage.authenticate(currentUser.email, dataDeletePassword)
    
    if (authenticatedUser) {
      console.log('RESULTAT: SUCCES - Le mot de passe est CORRECT')
      console.log('La suppression devrait fonctionner')
    } else {
      console.log('RESULTAT: ECHEC - Le mot de passe est INCORRECT')
      console.log('Le meme probleme que si vous essayiez de vous reconnecter avec ce mot de passe')
    }
    
    // Debug: voir l'utilisateur retourne
    console.log('Authenticated user details:', authenticatedUser)
  }

  // Gestion de la suppression des données
  const handleSecureDataDelete = (e) => {
    e.preventDefault()
    
    if (!dataDeletePassword) {
      toast.error('Veuillez entrer votre mot de passe')
      return
    }
    
    try {
      const currentUser = authStorage.getCurrentUser()
      
      if (!currentUser) {
        toast.error('Aucun utilisateur connecte')
        return
      }
      
      console.log('Test authentification avec la meme methode que Login.jsx')
      console.log('Email:', currentUser.email)
      console.log('Password provided:', dataDeletePassword ? 'YES' : 'NO')
      
      // UTILISER EXACTEMENT LA MEME METHODE QUE LOGIN.JS
      const authenticatedUser = usersStorage.authenticate(currentUser.email, dataDeletePassword)
      console.log('Authentication result:', authenticatedUser ? 'SUCCESS' : 'FAILED')
      
      if (authenticatedUser) {
        console.log('Mot de passe correct - suppression autorisee')
        handleClearData()
        setShowDataDeleteModal(false)
        setDataDeletePassword('')
      } else {
        console.log('Mot de passe incorrect - meme methode que login')
        toast.error('Mot de passe incorrect')
      }
    } catch (error) {
      console.error('Erreur verification mot de passe:', error)
      toast.error('Erreur lors de la verification')
    }
  }

  const handleClearData = () => {
    console.log('🗑️ Début suppression complète des données')
    
    try {
      // Étape 1: Compter les données avant suppression
      const shopInfoBefore = appStorage.getShopInfo()
      const shopInfoBeforeCount = Object.values(shopInfoBefore).filter(value => 
        value !== '' && value !== null && value !== undefined
      ).length
      
      const dataBefore = {
        users: usersStorage.getUsers().length,
        products: appStorage.getProducts().length,
        sales: appStorage.getSales().length,
        expenses: appStorage.getExpenses().length,
        customers: appStorage.getCustomers().length,
        shopInfo: shopInfoBeforeCount
      }
      console.log('📊 Données avant suppression:', dataBefore)
      console.log('📊 ShopInfo avant suppression détaillé:', shopInfoBefore)
      
      // Étape 2: Suppression complète et forcée de toutes les données
      console.log('🧹 Nettoyage complet en cours...')
      
      // Vider toutes les collections avec des valeurs par défaut
      appStorage.setProducts([])
      appStorage.setSales([])
      appStorage.setExpenses([])
      appStorage.setCustomers([])
      appStorage.setShopInfo({
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: ''
      })
      
      // Vider tous les utilisateurs
      usersStorage.setUsers([])
      
      // Supprimer l'utilisateur connecté
      authStorage.logout()
      
      // Nettoyage complet du localStorage
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (key.startsWith('noppale_')) {
          localStorage.removeItem(key)
          console.log(`🗑️ Supprimé: ${key}`)
        }
      })
      
      // Nettoyage du sessionStorage
      sessionStorage.clear()
      
      // Utiliser la fonction clear() du storage
      storage.clear()
      
      // Étape 3: Vérification immédiate de la suppression
      console.log('🔍 Vérification de la suppression...')
      
      const shopInfo = appStorage.getShopInfo()
      const shopInfoCount = Object.values(shopInfo).filter(value => 
        value !== '' && value !== null && value !== undefined
      ).length
      
      const dataAfter = {
        users: usersStorage.getUsers().length,
        products: appStorage.getProducts().length,
        sales: appStorage.getSales().length,
        expenses: appStorage.getExpenses().length,
        customers: appStorage.getCustomers().length,
        shopInfo: shopInfoCount
      }
      console.log('📊 Données après suppression:', dataAfter)
      console.log('📊 ShopInfo détaillé:', shopInfo)
      
      // Étape 4: Confirmation et redirection
      const totalRemaining = Object.values(dataAfter).reduce((sum, count) => sum + count, 0)
      
      if (totalRemaining === 0) {
        console.log('✅ Toutes les données ont été supprimées avec succès!')
        toast.success('✅ Toutes les données ont été supprimées avec succès !', { duration: 3000 })
        
        // Forcer le rechargement complet après un court délai
        setTimeout(() => {
          toast('🔄 Redirection vers la page de connexion...', { duration: 2000 })
          // Redirection forcée pour éviter les caches
          window.location.replace('/login')
        }, 2000)
      } else {
        console.error('❌ Certaines données n\'ont pas été supprimées:', dataAfter)
        toast.error('❌ Erreur: Certaines données n\'ont pas pu être supprimées', { duration: 4000 })
      }
      
    } catch (error) {
      console.error('💥 Erreur critique lors de la suppression:', error)
      toast.error(`💥 Erreur lors de la suppression: ${error.message}`, { duration: 4000 })
    }
  }

  // Gestion du code secret
  const handleSecretCodeSubmit = () => {
    const savedSecretCode = storage.get('secretCode', '1234')
    
    if (secretCode === savedSecretCode) {
      // Code correct - supprimer toutes les données
      toast.loading('Suppression de toutes les données en cours...', { duration: 1000 })
      
      setTimeout(() => {
        handleClearData()
        setShowSecretCodeModal(false)
        setSecretCode('')
      }, 1000)
    } else {
      toast.error('❌ Code secret incorrect - Veuillez réessayer', { duration: 3000 })
      setSecretCode('')
    }
  }

  const handleChangeSecretCode = async () => {
    if (!currentCodeForChange || !newSecretCode || !confirmNewSecretCode) {
      toast.error('❌ Veuillez remplir tous les champs', { duration: 3000 })
      return
    }

    // Vérifier le code actuel
    const savedSecretCode = await appStorage.getSecretCode()
    if (currentCodeForChange !== savedSecretCode) {
      toast.error('❌ Code actuel incorrect - Veuillez réessayer', { duration: 3000 })
      return
    }

    if (newSecretCode.length !== 4 || !/^\d+$/.test(newSecretCode)) {
      toast.error('❌ Le code secret doit comporter exactement 4 chiffres', { duration: 3000 })
      return
    }

    if (newSecretCode !== confirmNewSecretCode) {
      toast.error('❌ Les nouveaux codes ne correspondent pas', { duration: 3000 })
      return
    }

    try {
      // Sauvegarder le nouveau code secret dans Supabase
      await appStorage.setSecretCode(newSecretCode)
      toast.success('✅ Code secret modifié avec succès !', { duration: 3000 })

      // Réinitialiser le formulaire
      setCurrentCodeForChange('')
      setNewSecretCode('')
      setConfirmNewSecretCode('')
      setShowChangeCodeModal(false)
    } catch (error) {
      console.error('Erreur lors de la modification du code secret:', error)
      toast.error('Erreur lors de la modification du code secret')
    }
  }

  const settingsSections = [
    {
      title: t('shopInfo'),
      icon: Store,
      items: [
        {
          label: t('shopInfo'),
          description: t('shopInfoDesc'),
          action: () => {
            console.log('🏪 Clic sur Information de la boutique')
            setShowShopInfoModal(true)
          }
        }
      ]
    },
    {
      title: t('personalInfo'),
      icon: User,
      items: [
        {
          label: t('personalInfo'),
          description: t('personalInfoDesc'),
          action: () => setShowProfileModal(true)
        }
      ]
    },
    {
      title: t('preferences'),
      icon: Bell,
      items: [
        {
          label: t('preferences'),
          description: t('preferencesDesc'),
          action: () => setShowPreferencesModal(true)
        }
      ]
    },
    {
      title: t('security'),
      icon: Shield,
      items: [
        {
          label: t('changePassword'),
          description: t('changePasswordDesc'),
          action: () => setShowPasswordModal(true)
        },
        {
          label: 'Code secret',
          description: 'Modifier le code secret de suppression des données',
          action: () => setShowChangeCodeModal(true)
        }
      ]
    },
    {
      title: t('data'),
      icon: Database,
      items: [
        {
          label: t('deleteAllData'),
          description: t('deleteAllDataDesc'),
          action: () => setShowSecretCodeModal(true),
          danger: true
        }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500">Gérez vos préférences et votre compte</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <section.icon className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">{section.title}</h2>
            </div>
            
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    item.danger 
                      ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  } transition-colors cursor-pointer`}
                  onClick={item.action}
                >
                  <div>
                    <h3 className={`font-medium ${
                      item.danger ? 'text-red-700' : 'text-slate-800'
                    }`}>
                      {item.label}
                    </h3>
                    <p className={`text-sm ${
                      item.danger ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                  <div className="text-slate-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="card p-6">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Se déconnecter</span>
        </button>
      </div>

      {/* Modal Informations Personnelles */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Informations personnelles</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="label-field">Nom complet</label>
                <input
                  type="text"
                  value={profileForm.name || ''}
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                  className="input-field"
                  placeholder="Entrez votre nom"
                  required
                />
              </div>

              <div>
                <label className="label-field">Adresse email</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                  className="input-field"
                  placeholder="Entrez votre email"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Changer Mot de Passe */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Changer le mot de passe</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="label-field">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword || ''}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="input-field pr-10"
                    placeholder="Entrez votre mot de passe actuel"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-field">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword || ''}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="input-field pr-10"
                    placeholder="Entrez le nouveau mot de passe"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-field">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword || ''}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="input-field pr-10"
                    placeholder="Confirmez le nouveau mot de passe"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Préférences */}
      {showPreferencesModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Préférences</h2>
              <button onClick={() => setShowPreferencesModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Apparence</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      {preferences.darkMode ? <Moon size={18} /> : <Sun size={18} />}
                      <span className="text-slate-700">Mode sombre</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.darkMode}
                      onChange={e => setPreferences({...preferences, darkMode: e.target.checked})}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Bell size={18} />
                      <span className="text-slate-700">Activer les notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={e => setPreferences({...preferences, notifications: e.target.checked})}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Paramètres régionaux</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label-field">Devise</label>
                    <select
                      value={preferences.currency || 'FCFA'}
                      onChange={e => setPreferences({...preferences, currency: e.target.value})}
                      className="input-field"
                    >
                      {currencies.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.symbol} - {curr.name[language]} ({curr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Langue</label>
                    <select
                      value={preferences.language || 'fr'}
                      onChange={e => setPreferences({...preferences, language: e.target.value})}
                      className="input-field"
                    >
                      {availableLanguages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button onClick={handlePreferencesSave} className="btn-primary flex-1">
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Information de la boutique */}
      {showShopInfoModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Information de la boutique</h2>
              <button onClick={() => setShowShopInfoModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleShopInfoUpdate} className="space-y-4">
              {/* Logo */}
              <div>
                <label className="label-field">Logo de la boutique</label>
                <div className="flex items-center gap-4">
                  {shopInfo.logo ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      <img src={shopInfo.logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Store size={32} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 cursor-pointer transition-colors"
                    >
                      <Upload size={18} />
                      <span>Choisir une image</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Formats: JPG, PNG, GIF (Max: 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Nom de la boutique */}
              <div>
                <label className="label-field">Nom de la boutique *</label>
                <input
                  type="text"
                  value={shopInfo.name || ''}
                  onChange={e => setShopInfo({...shopInfo, name: e.target.value})}
                  className="input-field"
                  placeholder="Entrez le nom de votre boutique"
                  required
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="label-field">Adresse</label>
                <textarea
                  value={shopInfo.address || ''}
                  onChange={e => setShopInfo({...shopInfo, address: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Entrez l'adresse de votre boutique"
                />
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Téléphone</label>
                  <input
                    type="tel"
                    value={shopInfo.phone || ''}
                    onChange={e => setShopInfo({...shopInfo, phone: e.target.value})}
                    className="input-field"
                    placeholder="+221 33 123 45 67"
                  />
                </div>
                <div>
                  <label className="label-field">Email</label>
                  <input
                    type="email"
                    value={shopInfo.email || ''}
                    onChange={e => setShopInfo({...shopInfo, email: e.target.value})}
                    className="input-field"
                    placeholder="contact@boutique.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowShopInfoModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Données */}
      {showDataModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Gestion des données</h2>
              <button onClick={() => setShowDataModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Exportation des données</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 mb-3">Exportez toutes vos données dans un fichier JSON</p>
                  <ul className="text-sm text-blue-700 space-y-1 mb-4">
                    <li>• Informations du compte</li>
                    <li>• Liste des clients</li>
                    <li>• Catalogue des produits</li>
                    <li>• Historique des ventes</li>
                    <li>• Historique des dépenses</li>
                  </ul>
                  <button onClick={handleExportData} className="btn-primary flex items-center gap-2">
                    <Download size={18} />
                    Exporter les données
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Suppression des données</h3>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 mb-3">⚠️ Attention - Action irréversible</p>
                  <p className="text-red-700 text-sm mb-4">
                    Cette action supprimera définitivement toutes vos données locales.
                  </p>
                  <button 
                    onClick={() => {
                      setShowDataModal(false)
                      setShowClearDataModal(true)
                    }}
                    className="btn-danger flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Supprimer toutes les données
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Déconnexion</h2>
              <button onClick={() => setShowLogoutModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-600">Êtes-vous sûr de vouloir vous déconnecter ?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger flex-1"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression sécurisée des données */}
      {showDataDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 size={24} />
                Suppression des données
              </h2>
              <button 
                onClick={() => {
                  setShowDataDeleteModal(false)
                  setDataDeletePassword('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSecureDataDelete} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Action irréversible</p>
                <p className="text-red-700 text-sm">
                  Cette action supprimera définitivement toutes les données de l'application :
                </p>
                <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
                  <li>Toutes les ventes</li>
                  <li>Tous les produits</li>
                  <li>Tous les clients</li>
                  <li>Toutes les dépenses</li>
                  <li>Votre profil utilisateur</li>
                  <li>Toutes les préférences</li>
                </ul>
              </div>

              <div>
                <label className="label-field">Confirmez avec votre mot de passe</label>
                <input
                  type="password"
                  value={dataDeletePassword || ''}
                  onChange={e => setDataDeletePassword(e.target.value)}
                  className="input-field"
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDataDeleteModal(false)
                    setDataDeletePassword('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-danger flex-1"
                >
                  <Trash2 size={16} className="inline mr-2" />
                  Supprimer tout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-red-600">Supprimer toutes les données</h2>
              <button onClick={() => setShowClearDataModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Attention - Action irréversible</p>
                <p className="text-red-700 text-sm">
                  Cette action supprimera définitivement toutes vos données locales :
                  clients, produits, ventes, dépenses et votre compte.
                </p>
              </div>
              <p className="text-slate-600">Êtes-vous absolument sûr de vouloir continuer ?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearDataModal(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={testAuthentication}
                className="btn-warning flex-1 mr-2"
                type="button"
              >
                🧪 Tester
              </button>
              <button
                onClick={bypassDataDelete}
                className="btn-danger flex-1 mr-2"
                type="button"
              >
                🚨 Bypass
              </button>
              <button
                onClick={handleClearData}
                className="btn-danger flex-1"
              >
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Code Modal */}
      {showSecretCodeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-red-600">Code secret requis</h2>
              <button onClick={() => setShowSecretCodeModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Suppression de toutes les données</p>
                <p className="text-red-700 text-sm">
                  Pour supprimer toutes les données, veuillez saisir votre code secret à 4 chiffres.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Code secret
                </label>
                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Entrez le code secret à 4 chiffres"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSecretCodeModal(false)
                  setSecretCode('')
                }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleSecretCodeSubmit}
                className="btn-danger flex-1"
                disabled={secretCode.length !== 4}
              >
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Secret Code Modal */}
      {showChangeCodeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Modifier le code secret</h2>
              <button onClick={() => setShowChangeCodeModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleChangeSecretCode(); }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Code actuel
                  </label>
                  <input
                    type="password"
                    value={currentCodeForChange}
                    onChange={(e) => setCurrentCodeForChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Entrez le code secret actuel"
                    maxLength={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nouveau code secret (4 chiffres)
                  </label>
                  <input
                    type="password"
                    value={newSecretCode}
                    onChange={(e) => setNewSecretCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nouveau code à 4 chiffres"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmer le nouveau code
                  </label>
                  <input
                    type="password"
                    value={confirmNewSecretCode}
                    onChange={(e) => setConfirmNewSecretCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Confirmez le nouveau code"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeCodeModal(false)
                    setCurrentCodeForChange('')
                    setNewSecretCode('')
                    setConfirmNewSecretCode('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Modifier le code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
