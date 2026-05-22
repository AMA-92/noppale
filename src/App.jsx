import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { authStorage } from './utils/storage'
import { I18nProvider } from './hooks/useI18n.jsx'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard-simple'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import Expenses from './pages/Expenses-minimal'
import Settings from './pages/Settings'
import Contact from './pages/Contact'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier l'état de l'authentification au chargement avec timeout
    const checkAuth = async () => {
      try {
        // Timeout de 5 secondes maximum
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout auth')), 5000)
        )
        
        const currentUser = await Promise.race([
          authStorage.getCurrentUser(),
          timeoutPromise
        ])
        
        setUser(currentUser)
      } catch (error) {
        console.error('Erreur auth:', error)
        setUser(null)
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
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="sales" element={<Sales />} />
            <Route path="reports" element={<Reports />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="settings" element={<Settings />} />
            <Route path="contact" element={<Contact />} />
          </Route>
        </Routes>
      </Router>
    </I18nProvider>
  )
}

export default App
