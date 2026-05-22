import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { authStorage, appStorage } from '../utils/storage'
import { useI18n } from '../hooks/useI18n.jsx'
import { useShopInfoRealtime } from '../hooks/useRealtime.jsx'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { 
  LayoutDashboard, Package, ShoppingCart, 
  BarChart3, LogOut, Settings, Wallet, Menu, X,
  TrendingUp, ChevronRight, Store, Mail, Clock, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Layout({ user }) {
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false) // Closed by default on mobile
  const [shopInfo, setShopInfo] = useState({})
  const [currentUser, setCurrentUser] = useState(user)
  const [isMobile, setIsMobile] = useState(false)
  const subscriptionInfo = useSubscription(currentUser?.id)
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setSidebarOpen(window.innerWidth >= 768) // Open on desktop, closed on mobile
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/products', label: t('products'), icon: Package },
    { path: '/sales', label: t('sales'), icon: ShoppingCart },
    { path: '/expenses', label: t('expenses'), icon: Wallet },
    { path: '/reports', label: t('reports'), icon: BarChart3 },
    { path: '/settings', label: t('settings'), icon: Settings },
    { path: '/contact', label: 'Contacter nous', icon: Mail },
  ]

  const loadShopInfo = async () => {
    try {
      const savedShopInfo = await appStorage.getShopInfo()
      setShopInfo(savedShopInfo || {})
    } catch (error) {
      console.error('Erreur de chargement des informations de la boutique:', error)
    }
  }

  useEffect(() => {
    loadShopInfo()
  }, [language])

  useShopInfoRealtime(() => {
    loadShopInfo()
  })

  useEffect(() => {
    setCurrentUser(user)
  }, [user])

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
      {/* Mobile header */}
      {isMobile && (
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={20} />
            </button>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo-exact.svg" alt="Noppalé" className="w-6 h-6" />
            </div>
            <span className="font-black text-slate-800 text-base">Noppalé</span>
          </div>
          {shopInfo.name && (
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <Store size={16} />
              <span className="font-medium truncate max-w-[120px]">{shopInfo.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Bandeau de la boutique (desktop only) */}
      {!isMobile && shopInfo.name && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-md flex-shrink-0">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6" />
              <h1 className="text-xl font-bold">{shopInfo.name}</h1>
            </div>
          </div>
        </div>
      )}

      {subscriptionInfo.isTrial && subscriptionInfo.isActive && (
        <div className={`${subscriptionInfo.isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'} text-white px-4 py-3 flex-shrink-0`}>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-center">
            {subscriptionInfo.isExpiringSoon ? <AlertTriangle size={18} /> : <Clock size={18} />}
            <span>
              {subscriptionInfo.isExpiringSoon
                ? `Votre période d'essai expire dans ${subscriptionInfo.daysRemaining} jour${subscriptionInfo.daysRemaining > 1 ? 's' : ''}. Contactez l'admin pour prolonger votre abonnement.`
                : `Vous êtes en phase d'essai de 10 jours. Il vous reste ${subscriptionInfo.daysRemaining} jour${subscriptionInfo.daysRemaining > 1 ? 's' : ''}.`
              }
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : isMobile ? '-translate-x-full' : 'w-16'} ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-64' : 'relative'} bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-xl flex-shrink-0`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200/50 shadow-lg">
          {!isMobile && sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shadow-lg border border-primary-200 overflow-hidden">
                <img src="/logo-exact.svg" alt="Noppalé" className="w-8 h-8" />
              </div>
              <div>
                <span className="font-black text-slate-800 text-lg">Noppalé</span>
              </div>
            </div>
          )}
          {!isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-200 shadow-md"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-200 shadow-md"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }, index) => {
            const isActive = location.pathname === path
            const gradients = [
              'from-blue-500 to-cyan-400',
              'from-emerald-500 to-teal-400',
              'from-violet-500 to-purple-400',
              'from-orange-500 to-amber-400',
              'from-pink-500 to-rose-400',
              'from-slate-600 to-slate-500',
              'from-indigo-500 to-blue-400'
            ]
            const gradient = gradients[index % gradients.length]
            
            return (
              <button
                key={path}
                onClick={() => {
                  navigate(path)
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r ' + gradient + ' text-white shadow-lg shadow-' + gradient.split('-')[1] + '-500/30 transform scale-[1.02]' 
                    : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 hover:shadow-md'
                } ${(!sidebarOpen && !isMobile) ? 'justify-center px-3' : ''}`}
                title={(!sidebarOpen && !isMobile) ? label : ''}
              >
                <div className={`relative ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} transition-colors duration-200`}>
                  <Icon size={20} className="flex-shrink-0" />
                  {isActive && (
                    <div className="absolute -inset-1 bg-white/30 rounded-lg blur-sm -z-10"></div>
                  )}
                </div>
                {(sidebarOpen || isMobile) && (
                  <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {label}
                  </span>
                )}
                {(sidebarOpen || isMobile) && isActive && (
                  <ChevronRight size={16} className="ml-auto text-white/80" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200/50 p-4 bg-gradient-to-t from-slate-100/50 to-transparent">
          {(sidebarOpen || isMobile) && (
            <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-white rounded-xl shadow-md border border-slate-200">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white font-bold text-sm">
                  {currentUser?.email?.slice(0, 2).toUpperCase() || 'US'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {currentUser?.name || currentUser?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] ${(!sidebarOpen && !isMobile) ? 'justify-center px-3' : ''}`}
            title={(!sidebarOpen && !isMobile) ? 'Déconnexion' : ''}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {(sidebarOpen || isMobile) && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className={`${isMobile ? 'p-4' : 'p-6'} animate-page-enter`}>
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  )
}
