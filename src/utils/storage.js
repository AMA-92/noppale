// Système de stockage Supabase pour Noppalé
// Utilise Supabase pour la persistance des données avec synchronisation en temps réel

import { supabase } from '../supabase/config.js'

// Obtenir l'ID de l'utilisateur connecté
const getCurrentUserId = async () => {
  try {
    // Skip auth in local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'local-dev-user-id'
    }

    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Erreur getCurrentUserId:', error)
      return null
    }
    return data?.user?.id || null
  } catch (error) {
    console.error('Erreur getCurrentUserId:', error)
    return null
  }
}

// Gestion des utilisateurs avec Supabase Auth
export const usersStorage = {
  // Inscription d'un utilisateur
  async signUp(email, password, name) {
    try {
      console.log('🔐 Tentative d\'inscription:', { email, name })
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailConfirmTo: false // Désactiver la confirmation par email
        }
      })
      console.log('📝 Réponse Supabase:', { data, error })
      if (error) throw error
      console.log('✅ Utilisateur créé:', data.user)
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
      return true
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      throw error
    }
  },

  // Obtenir l'utilisateur actuel
  getCurrentUser() {
    const { data } = supabase.auth.getUser()
    return data.user
  },

  // Mettre à jour le profil utilisateur
  async updateUser(updates) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      throw error
    }
  }
}

// Gestion de l'authentification
export const authStorage = {
  // Sauvegarder l'utilisateur connecté (géré par Supabase)
  setCurrentUser(user) {
    // Supabase gère automatiquement la session
    console.log('Session gérée par Supabase')
  },

  // Obtenir l'utilisateur connecté
  async getCurrentUser() {
    try {
      // Skip auth in local development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return { id: 'local-dev-user', email: 'local@dev.com' }
      }

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
      return data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error)
      return []
    }
  },

  async setProducts(products) {
    // Supabase gère les produits individuellement, pas en lot
    console.log('Utilisez addProduct/updateProduct pour Supabase')
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
          buying_price: product.buyingPrice || 0,
          selling_price: product.sellingPrice || 0,
          stock: product.stock || 0,
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

      const { data, error } = await supabase
        .from('products')
        .update({
          name: updates.name,
          category: updates.category,
          buying_price: updates.buyingPrice,
          selling_price: updates.sellingPrice,
          stock: updates.stock,
          min_stock: updates.minStock,
          barcode: updates.barcode,
          image: updates.image || '',
          updated_at: new Date().toISOString()
        })
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
        .select(`
          *,
          sale_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error)
      return []
    }
  },

  async addSale(sale) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // Créer la vente
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

      // Ajouter les items de la vente
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

      // Mettre à jour le stock des produits
      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (item.productId) {
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.productId)
              .single()

            if (product) {
              const newStock = Math.max(0, product.stock - item.quantity)
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

  // Dépenses
  async getExpenses() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      // Return mock data in local development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔓 Mode développement local: données mock pour expenses')
        return [
          {
            id: '1',
            user_id: userId,
            category: 'Transport',
            description: 'Essence voiture',
            amount: 5000,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            user_id: userId,
            category: 'Nourriture',
            description: 'Courses alimentaires',
            amount: 15000,
            date: new Date(Date.now() - 86400000).toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      console.log('Storage: Expenses data retrieved', data)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Erreur lors de la récupération des dépenses:', error)
      return []
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
          category: expense.category,
          description: expense.description || '',
          amount: expense.amount,
          date: expense.date || new Date().toISOString()
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
          amount: updates.amount,
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
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
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
        .single()

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
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
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
        .single()

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
      if (!userId) return '1234'

      const { data, error } = await supabase
        .from('user_secret_code')
        .select('secret_code')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Pas de code secret trouvé, retourner le code par défaut
          return '1234'
        }
        throw error
      }

      return data.secret_code
    } catch (error) {
      console.error('Erreur lors de la récupération du code secret:', error)
      return '1234'
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
        .single()

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
  }
}

export default null
