// Système de stockage Supabase pour Noppalé
// Utilise Supabase pour la persistance des données avec synchronisation en temps réel

import { supabase } from '../supabase/config.js'

// Cache pour l'ID utilisateur (évite les appels multiples)
let cachedUserId = null
let userIdPromise = null

// Obtenir l'ID de l'utilisateur connecté avec cache
const getCurrentUserId = async () => {
  // Si déjà en cache, retourner directement
  if (cachedUserId) return cachedUserId
  
  // Si une requête est en cours, retourner la promesse existante
  if (userIdPromise) return userIdPromise
  
  // Créer la promesse et la mettre en cache
  userIdPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Erreur getCurrentUserId:', error)
        cachedUserId = null
        return null
      }
      cachedUserId = data?.user?.id || null
      return cachedUserId
    } catch (error) {
      console.error('Erreur getCurrentUserId:', error)
      cachedUserId = null
      return null
    } finally {
      // Libérer la promesse après 2 secondes
      setTimeout(() => {
        userIdPromise = null
      }, 2000)
    }
  })()
  
  return userIdPromise
}

// Fonction pour invalider le cache (appelée lors de la déconnexion)
export const clearUserIdCache = () => {
  cachedUserId = null
  userIdPromise = null
}

// Gestion des utilisateurs avec Supabase Auth
export const usersStorage = {
  // Inscription d'un utilisateur
  async signUp(email, password, name, phone = null) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            phone: phone || null
          },
          emailConfirmTo: false // Désactiver la confirmation par email
        }
      })
      if (error) throw error

      // Synchroniser le profil après inscription réussie
      if (data.user) {
        const { ProfileManager } = await import('./profileManager.js')
        await ProfileManager.syncProfileAfterSignup(data.user.id, email, phone)
      }

      return data.user
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription:', error)
      throw error
    }
  },

  // Connexion d'un utilisateur
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      throw error
    }
  },

  // Déconnexion
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Vider le cache utilisateur
      clearUserIdCache()
      
      return true
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      throw error
    }
  },

  // Vérifier le mot de passe (ré-authentification)
  async verifyPassword(email, password) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return !error
    } catch {
      return false
    }
  },

  // Changer le mot de passe
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return true
  },

  // Mettre à jour le profil (nom dans les métadonnées)
  async updateProfile({ name, email, phone }) {
    const updates = { data: { name } }
    if (email) updates.email = email
    if (phone) updates.data.phone = phone

    const { data, error } = await supabase.auth.updateUser(updates)
    if (error) throw error
    return data.user
  }
}

// Gestion de l'authentification
export const authStorage = {
  // Sauvegarder l'utilisateur connecté (géré par Supabase)
  setCurrentUser() {
    // Supabase gère automatiquement la session
  },

  // Obtenir l'utilisateur connecté
  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Erreur getCurrentUser:', error)
        return null
      }
      return data?.user || null
    } catch (error) {
      console.error('Erreur getCurrentUser:', error)
      return null
    }
  },

  // Déconnexion
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Erreur lors de la déconnexion:', error)
  },

  // Vérifier si un utilisateur est connecté
  async isAuthenticated() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Erreur isAuthenticated:', error)
        return false
      }
      return data?.user !== null
    } catch (error) {
      console.error('Erreur isAuthenticated:', error)
      return false
    }
  },

  // Écouter les changements d'authentification
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Gestion des données de l'application avec Supabase
export const appStorage = {
  // Produits
  async getProducts() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map((p) => ({
        ...p,
        selling_price: parseFloat(p.selling_price) || 0,
        buying_price: parseFloat(p.buying_price) || 0,
        stock: parseInt(p.stock, 10) || 0
      }))
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error)
      return []
    }
  },

  async setProducts() {
    // Supabase gère les produits individuellement, pas en lot
    return true
  },

  async addProduct(product) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          name: product.name,
          category: product.category || '',
          buying_price: parseFloat(product.buyingPrice) || 0,
          selling_price: parseFloat(product.sellingPrice) || 0,
          stock: parseInt(product.stock, 10) || 0,
          min_stock: product.minStock || 0,
          barcode: product.barcode || '',
          image: product.image || ''
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit:', error)
      throw error
    }
  },

  async updateProduct(id, updates) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const productUpdate = {
        name: updates.name,
        category: updates.category,
        stock: updates.stock,
        min_stock: updates.minStock,
        barcode: updates.barcode,
        image: updates.image || '',
        updated_at: new Date().toISOString()
      }
      if (updates.buyingPrice !== undefined && updates.buyingPrice !== '') {
        productUpdate.buying_price = updates.buyingPrice
      }
      if (updates.sellingPrice !== undefined && updates.sellingPrice !== '') {
        productUpdate.selling_price = updates.sellingPrice
      }

      const { data, error } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error)
      throw error
    }
  },

  async deleteProduct(id) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error)
      throw error
    }
  },

  // Clients
  async getCustomers() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des clients:', error)
      return []
    }
  },

  async addCustomer(customer) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || ''
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error)
      throw error
    }
  },

  async updateCustomer(id, updates) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('customers')
        .update({
          name: updates.name,
          phone: updates.phone,
          email: updates.email,
          address: updates.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error)
      throw error
    }
  },

  async deleteCustomer(id) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error)
      throw error
    }
  },

  // Ventes
  async getSales() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((sale) => ({
        id: sale.id,
        user_id: sale.user_id,
        customerId: sale.customer_id,
        customerName: sale.customer_name || '',
        customer_name: sale.customer_name || '',
        total: sale.total,
        paymentMethod: sale.payment_method,
        payment_method: sale.payment_method,
        creditStatus: sale.credit_status || 'pending',
        credit_status: sale.credit_status || 'pending',
        notes: sale.notes,
        createdAt: sale.created_at,
        created_at: sale.created_at,
        items: (sale.sale_items || []).map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      }))
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error)
      return []
    }
  },

  async addSale(sale) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: userId,
          customer_id: sale.customerId || null,
          customer_name: sale.customerName || '',
          total: sale.total,
          payment_method: sale.paymentMethod || 'cash',
          notes: sale.notes || ''
        })
        .select()
        .single()

      if (saleError) throw saleError

      if (sale.items && Array.isArray(sale.items)) {
        const saleItems = sale.items.map(item => ({
          sale_id: saleData.id,
          product_id: item.productId || null,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)

        if (itemsError) throw itemsError
      }

      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (item.productId) {
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.productId)
              .single()

            if (product) {
              const currentStock = parseInt(product.stock, 10) || 0
              const qty = parseInt(item.quantity, 10) || 0
              const newStock = Math.max(0, currentStock - qty)
              await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.productId)
            }
          }
        }
      }

      return saleData
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vente:', error)
      throw error
    }
  },

  async deleteSale(id) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la vente:', error)
      throw error
    }
  },

  async updateSaleCreditStatus(id, creditStatus) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('sales')
        .update({
          credit_status: creditStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de crédit:', error)
      throw error
    }
  },

  // Dépenses
  async getExpenses() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      if (error) throw error
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Erreur lors de la récupération des dépenses:', error)
      return []
    }
  },

  async setExpenses(expenses) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      if (Array.isArray(expenses) && expenses.length === 0) {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('user_id', userId)
        if (error) throw error
      }
      return true
    } catch (error) {
      console.error('Erreur lors de la mise à jour des dépenses:', error)
      throw error
    }
  },

  async addExpense(expense) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          category: expense.category || '',
          description: expense.description || '',
          amount: parseFloat(expense.amount) || 0,
          date: expense.date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la dépense:', error)
      throw error
    }
  },

  async updateExpense(id, updates) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('expenses')
        .update({
          category: updates.category,
          description: updates.description,
          amount: parseFloat(updates.amount) || 0,
          date: updates.date
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la dépense:', error)
      throw error
    }
  },

  async deleteExpense(id) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la dépense:', error)
      throw error
    }
  },

  // Informations de la boutique
  async getShopInfo() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return {
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: ''
      }

      const { data, error } = await supabase
        .from('shop_info')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116' || error.status === 406) {
          // Pas de données, retourner les valeurs par défaut
          return {
            name: '',
            address: '',
            phone: '',
            email: '',
            logo: ''
          }
        }
        throw error
      }

      return data || {
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: ''
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des infos boutique:', error)
      return {
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: ''
      }
    }
  },

  async setShopInfo(shopInfo) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // Vérifier si les infos existent déjà
      const { data: existing } = await supabase
        .from('shop_info')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from('shop_info')
          .update({
            name: shopInfo.name,
            address: shopInfo.address,
            phone: shopInfo.phone,
            email: shopInfo.email,
            logo: shopInfo.logo,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Créer
        const { data, error } = await supabase
          .from('shop_info')
          .insert({
            user_id: userId,
            name: shopInfo.name,
            address: shopInfo.address,
            phone: shopInfo.phone,
            email: shopInfo.email,
            logo: shopInfo.logo
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des infos boutique:', error)
      throw error
    }
  },

  // Obtenir les préférences utilisateur
  async getUserPreferences() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return null

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116' || error.status === 406) {
          // Pas de préférences trouvées, retourner null
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error)
      throw error
    }
  },

  // Sauvegarder les préférences utilisateur
  async setUserPreferences(preferences) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // Vérifier si les préférences existent déjà
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from('user_preferences')
          .update({
            language: preferences.language || 'fr',
            currency: preferences.currency || 'FCFA',
            dark_mode: preferences.darkMode || false,
            notifications: preferences.notifications !== false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Créer
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            language: preferences.language || 'fr',
            currency: preferences.currency || 'FCFA',
            dark_mode: preferences.darkMode || false,
            notifications: preferences.notifications !== false
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      throw error
    }
  },

  // Obtenir le code secret
  async getSecretCode() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return ''

      const { data, error } = await supabase
        .from('user_secret_code')
        .select('secret_code')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116' || error.status === 406) {
          // Pas de code secret trouvé
          return ''
        }
        throw error
      }

      return data?.secret_code || ''
    } catch (error) {
      console.error('Erreur lors de la récupération du code secret:', error)
      return ''
    }
  },

  // Sauvegarder le code secret
  async setSecretCode(secretCode) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // Vérifier si le code secret existe déjà
      const { data: existing } = await supabase
        .from('user_secret_code')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Mettre à jour
        const { data, error } = await supabase
          .from('user_secret_code')
          .update({
            secret_code: secretCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Créer
        const { data, error } = await supabase
          .from('user_secret_code')
          .insert({
            user_id: userId,
            secret_code: secretCode
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du code secret:', error)
      throw error
    }
  },

  // Supprimer toutes les données de l'utilisateur connecté
  async clearAllUserData() {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('Utilisateur non connecté')

    const tables = [
      'products',
      'sales',
      'expenses',
      'customers',
      'shop_info',
      'user_preferences',
      'user_secret_code'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error) throw error
    }

    return true
  },

  // Supprimer complètement un utilisateur (nécessite les permissions admin)
  async deleteUser(userId = null) {
    try {
      const targetUserId = userId || await getCurrentUserId()
      if (!targetUserId) throw new Error('Utilisateur non connecté')

      // Méthode 1: Essayer avec la fonction RPC (recommandée)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_user_and_data', {
        user_to_delete_id: targetUserId
      })

      if (!rpcError) {
        return { success: true, message: rpcResult }
      }

      // Méthode 2: Si RPC échoue, essayer avec admin delete (service role)
      console.log('RPC failed, trying admin delete...')
      
      // D'abord supprimer les données manuellement
      await this.clearAllUserData()
      
      // Ensuite déconnecter l'utilisateur
      await supabase.auth.signOut()
      
      return { success: true, message: 'User data cleared and logged out. Admin deletion requires service role key.' }
      
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error)
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }
}

export default null
