import React, { useState } from 'react'
import { Settings, Users, Shield, Database, LogOut, Menu, X } from 'lucide-react'
import AdminUserManager from '../components/AdminUserManager'
import { supabase } from '../supabase/config'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Déconnexion réussie')
      window.location.href = '/login'
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const menuItems = [
    {
      id: 'users',
      label: 'Gestion des Utilisateurs',
      icon: Users,
      description: 'Supprimer et gérer les utilisateurs'
    },
    {
      id: 'database',
      label: 'Base de Données',
      icon: Database,
      description: 'Statistiques et maintenance'
    },
    {
      id: 'settings',
      label: 'Paramètres Admin',
      icon: Settings,
      description: 'Configuration système'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <Shield className="w-8 h-8 text-primary-600" />
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-slate-800">Admin</h1>
                  <p className="text-xs text-slate-500">Noppalé</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-slate-600"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary-50 text-primary-600 border border-primary-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && (
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {menuItems.find(item => item.id === activeTab)?.label}
                </h1>
                <p className="text-slate-500">
                  {menuItems.find(item => item.id === activeTab)?.description}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Shield className="w-4 h-4" />
                Panneau Administrateur
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {activeTab === 'users' && <AdminUserManager />}
          
          {activeTab === 'database' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Base de Données</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800">Utilisateurs</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">--</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-800">Produits</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">--</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800">Ventes</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-2">--</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-medium text-red-800">Dépenses</h3>
                  <p className="text-2xl font-bold text-red-600 mt-2">--</p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Paramètres Administrateur</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">Configuration Système</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-600">
                      Les paramètres système seront bientôt disponibles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
