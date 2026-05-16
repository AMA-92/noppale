import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { authStorage, appStorage } from '../utils/storage'
import { useI18n } from '../hooks/useI18n.jsx'
import { 
  LayoutDashboard, Package, ShoppingCart, 
  BarChart3, LogOut, Settings, Wallet, Menu, X,
  TrendingUp, ChevronRight, Store
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Layout({ user }) {
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shopInfo, setShopInfo] = useState({})
  const [currentUser, setCurrentUser] = useState(user)

  const navItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/products', label: t('products'), icon: Package },
    { path: '/sales', label: t('sales'), icon: ShoppingCart },
    { path: '/expenses', label: t('expenses'), icon: Wallet },
    { path: '/reports', label: t('reports'), icon: BarChart3 },
    { path: '/settings', label: t('settings'), icon: Settings },
  ]

  // Charger les informations de la boutique
  useEffect(() => {
    try {
      const savedShopInfo = appStorage.getShopInfo()
      console.log('Shop info loaded:', savedShopInfo)
      setShopInfo(savedShopInfo)
    } catch (error) {
      console.error('Erreur de chargement des informations de la boutique:', error)
    }
  }, [language])

  // Synchroniser l'utilisateur connecté
  useEffect(() => {
    const updatedUser = authStorage.getCurrentUser()
    if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
      console.log('🔄 Utilisateur mis à jour dans Layout:', updatedUser)
      setCurrentUser(updatedUser)
    }
  }, [user, language])

  // Vérifier périodiquement les changements d'utilisateur
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = authStorage.getCurrentUser()
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        console.log('🔄 Changement d utilisateur détecté:', updatedUser)
        setCurrentUser(updatedUser)
      }
    }, 1000) // Vérifier chaque seconde

    return () => clearInterval(interval)
  }, [currentUser])

  const handleLogout = () => {
    try {
      authStorage.logout()
      toast.success('Déconnexion réussie')
      navigate('/login')
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Bandeau de la boutique */}
      {shopInfo.name && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-md">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6" />
              <h1 className="text-xl font-bold">{shopInfo.name}</h1>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-white border-r border-slate-100 flex flex-col transition-all duration-200 shadow-sm flex-shrink-0`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">N</span>
              </div>
              <div>
                <span className="font-black text-slate-800 text-base">Noppalé</span>
                <p className="text-xs text-slate-400 -mt-0.5">Gestion Com.</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`sidebar-item w-full ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen ? label : ''}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {sidebarOpen && isActive && <ChevronRight size={14} className="ml-auto text-primary-400" />}
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-100 p-3">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold text-xs">
                  {currentUser?.email?.slice(0, 2).toUpperCase() || 'US'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {currentUser?.name || currentUser?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Déconnexion' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  )
}
