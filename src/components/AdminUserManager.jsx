import React, { useState, useEffect } from 'react'
import { Trash2, Users, Mail, Calendar, Package, ShoppingCart, CreditCard, Users2, Search, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabase/config'
import toast from 'react-hot-toast'

export default function AdminUserManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('admin_users_list')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteUser = async (user) => {
    if (!adminEmail.trim()) {
      toast.error('Veuillez entrer votre email administrateur')
      return
    }

    const confirm = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.email} ?\n\n` +
      `Cela supprimera :\n` +
      `- ${user.products_count || 0} produits\n` +
      `- ${user.sales_count || 0} ventes\n` +
      `- ${user.expenses_count || 0} dépenses\n` +
      `- ${user.customers_count || 0} clients\n\n` +
      `Cette action est IRRÉVERSIBLE !`
    )

    if (!confirm) return

    try {
      setDeleteLoading(true)
      
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: user.id,
        admin_email: adminEmail.trim()
      })

      if (error) throw error

      toast.success(`Utilisateur ${user.email} supprimé avec succès`)
      await loadUsers() // Recharger la liste
      setSelectedUser(null)
      
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2">Chargement des utilisateurs...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-800">Gestion des Utilisateurs</h1>
            </div>
            <div className="text-sm text-slate-500">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Admin Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Administrateur (requis pour supprimer)
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="votre@email.admin"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par email ou nom..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Données
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-900">{user.email}</div>
                      <div className="text-sm text-slate-500">
                        {user.user_metadata?.name || 'Nom non défini'}
                      </div>
                      {user.phone && (
                        <div className="text-xs text-slate-400">{user.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(user.last_sign_in_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-blue-500" />
                        <span className="font-medium">{user.products_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3 text-green-500" />
                        <span className="font-medium">{user.sales_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-red-500" />
                        <span className="font-medium">{user.expenses_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users2 className="w-3 h-3 text-purple-500" />
                        <span className="font-medium">{user.customers_count || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={deleteLoading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg m-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Attention - Action irréversible</p>
              <p className="text-amber-700 mt-1">
                La suppression d'un utilisateur effacera définitivement toutes ses données 
                (produits, ventes, dépenses, clients). Cette action ne peut pas être annulée.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
