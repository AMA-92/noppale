import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { authStorage } from './utils/storage'
import { I18nProvider } from './hooks/useI18n.jsx'
import Layout from './components/Layout'
import Login from './pages/Login'
import LoadingScreen from './components/LoadingScreen'
import SubscriptionGate from './components/SubscriptionGate'
import Dashboard from './pages/Dashboard-simple'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'

const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Contact = lazy(() => import('./pages/Contact'))
const SubscriptionBlocked = lazy(() => import('./pages/SubscriptionBlocked'))

// Mode temporaire pour permettre la modification de l’interface sans Supabase.
// Pour réactiver l’authentification, définir VITE_BYPASS_AUTH=false dans .env.
const AUTH_BYPASS = import.meta.env.VITE_BYPASS_AUTH === 'true'
const DEMO_USER = {
  id: null,
  email: 'demo@noppale.app',
  name: 'Utilisateur démo'
}

function App() {
  const [user, setUser] = useState(AUTH_BYPASS ? DEMO_USER : null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (AUTH_BYPASS) {
      setLoading(false)
      return undefined
    }

    // Vérifier l'état de l'authentification avec un timeout minimal (500ms)
    // Utilise le cache localStorage en priorité pour une expérience instantanée
    const checkAuth = async () => {
      try {
        // Cache local en priorité (quasi instantané)
        const cachedUser = localStorage.getItem('cached_user')
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser))
          } catch (e) {
            // Cache invalide, ignorer
          }
        }
        
        // Vérifier l'auth réelle avec timeout court (2000ms)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout auth')), 2000)
        )
        
        const currentUser = await Promise.race([
          authStorage.getCurrentUser(),
          timeoutPromise
        ])
        
        if (currentUser) {
          setUser(currentUser)
          localStorage.setItem('cached_user', JSON.stringify(currentUser))
        }
      } catch (error) {
        // Utiliser le cache si la requête fail
        const cachedUser = localStorage.getItem('cached_user')
        if (!cachedUser) {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = authStorage.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <LoadingScreen />

  // Composant de fallback ultra-léger pour Suspense
  const PageFallback = () => null
  
  return (
    <I18nProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#fff', borderRadius: '8px' }
        }} />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
            <Route index element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Dashboard /></SubscriptionGate></Suspense>} />
            <Route path="products" element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Products /></SubscriptionGate></Suspense>} />
            <Route path="sales" element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Sales /></SubscriptionGate></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Reports /></SubscriptionGate></Suspense>} />
            <Route path="expenses" element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Expenses /></SubscriptionGate></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageFallback />}><SubscriptionGate user={user}><Settings /></SubscriptionGate></Suspense>} />
            <Route path="contact" element={<Suspense fallback={<PageFallback />}><Contact /></Suspense>} />
          </Route>
          <Route path="/subscription-blocked" element={user ? <Suspense fallback={<PageFallback />}><SubscriptionBlocked /></Suspense> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </I18nProvider>
  )
}

export default App
