// Système de stockage Supabase pour Noppalé
// Utilise Supabase pour la persistance des données avec synchronisation en temps réel

import { supabase } from '../supabase/config.js'

// Cache pour l'ID utilisateur (évite les appels multiples)
let cachedUserId = null
let userIdPromise = null
let productsCache = null
let salesCache = null
let expensesCache = null

export const appCache = {
  getProducts() {
    return productsCache || []
  },
  setProducts(products) {
    productsCache = Array.isArray(products) ? products : []
  },
  getSales() {
    return salesCache || []
  },
  setSales(sales) {
    salesCache = Array.isArray(sales) ? sales : []
  },
  getExpenses() {
    return expensesCache || []
  },
  setExpenses(expenses) {
    expensesCache = Array.isArray(expenses) ? expenses : []
  }
}

// Obtenir l'ID de l'utilisateur connecté avec cache
const getCurrentUserId = async () => {
  // Si déjà en cache, retourner directement
  if (cachedUserId) return cachedUserId
  
  // Si une requête est en cours, retourner la promesse existante
  if (userIdPromise) return userIdPromise
  
  // Créer la promesse et la mettre en cache
  userIdPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erreur getCurrentUserId:', error)
        cachedUserId = null
        return null
      }
      cachedUserId = data?.session?.user?.id || null
      return cachedUserId
    } catch (error) {
      console.error('Erreur getCurrentUserId:', error)
      cachedUserId = null
      return null
    } finally {
      // Libérer la promesse après 30 secondes (au lieu de 2s) pour éviter les refetch
      setTimeout(() => {
        userIdPromise = null
      }, 30000)
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
            full_name: name,
            phone: phone || null
          },
          emailConfirmTo: false // Désactiver la confirmation par email
        }
      })
      if (error) throw error

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
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erreur getCurrentUser:', error)
        return null
      }
      return data?.session?.user || null
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
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erreur isAuthenticated:', error)
        return false
      }
      return data?.session?.user !== null
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
          min_stock: parseInt(product.minStock, 10) || 0,
          barcode: product.barcode || '',
          description: product.description || '',
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
        stock: parseInt(updates.stock, 10) || 0,
        min_stock: parseInt(updates.minStock, 10) || 0,
        barcode: updates.barcode,
        description: updates.description || '',
        image: updates.image || '',
        updated_at: new Date().toISOString()
      }
      if (updates.buyingPrice !== undefined && updates.buyingPrice !== '') {
        productUpdate.buying_price = parseFloat(updates.buyingPrice) || 0
      }
      if (updates.sellingPrice !== undefined && updates.sellingPrice !== '') {
        productUpdate.selling_price = parseFloat(updates.sellingPrice) || 0
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
        .select(`
          *,
          sale_items(*),
          sale_payments(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error

      return (data || []).map((sale) => {
        // Calculer le montant payé à partir des paiements ou utiliser les champs de la base
        const paidFromPayments = (sale.sale_payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        const paidAmount = paidFromPayments > 0 ? paidFromPayments : (parseFloat(sale.paid_amount) || 0)
        const remainingAmount = (parseFloat(sale.total) || 0) - paidAmount

        return {
          id: sale.id,
          user_id: sale.user_id,
          customerId: sale.customer_id,
          customerName: sale.customer_name || '',
          customer_name: sale.customer_name || '',
          total: parseFloat(sale.total) || 0,
          paidAmount: paidAmount,
          paid_amount: paidAmount,
          remainingAmount: remainingAmount,
          remaining_amount: remainingAmount,
          paymentStatus: sale.payment_status || 'pending',
          payment_status: sale.payment_status || 'pending',
          paymentMethod: sale.payment_method,
          payment_method: sale.payment_method,
          creditStatus: sale.credit_status || 'pending',
          credit_status: sale.credit_status || 'pending',
          dueDate: sale.due_date,
          due_date: sale.due_date,
          notes: sale.notes,
          createdAt: sale.created_at,
          created_at: sale.created_at,
          items: (sale.sale_items || []).map((item) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price
          })),
          payments: (sale.sale_payments || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            paymentMethod: p.payment_method,
            paymentDate: p.payment_date,
            notes: p.notes
          }))
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error)
      return []
    }
  },

  async addSale(sale) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // Déterminer les montants payé et restant
      const isCredit = sale.paymentMethod === 'credit'
      const initialPayment = isCredit ? (parseFloat(sale.initialPayment) || 0) : (parseFloat(sale.total) || 0)
      const paidAmount = isCredit ? initialPayment : (parseFloat(sale.total) || 0)
      const remainingAmount = isCredit ? ((parseFloat(sale.total) || 0) - paidAmount) : 0

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: userId,
          customer_id: sale.customerId || null,
          customer_name: sale.customerName || '',
          total: sale.total,
          payment_method: sale.paymentMethod || 'cash',
          notes: sale.notes || '',
          due_date: sale.dueDate || null,
          payment_status: isCredit ? (paidAmount > 0 ? 'partial' : 'pending') : 'paid',
          paid_amount: paidAmount
          // remaining_amount est une colonne générée, elle se calcule automatiquement
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
        // Mettre à jour les stocks EN PARALLÈLE avec Promise.all au lieu de séquentiellement
        await Promise.all(sale.items.map(async (item) => {
          if (!item.productId) return

          try {
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.productId)
              .eq('user_id', userId)
              .single()

            if (product) {
              const currentStock = parseInt(product.stock, 10) || 0
              const qty = parseInt(item.quantity, 10) || 0
              const newStock = Math.max(0, currentStock - qty)
              await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.productId)
                .eq('user_id', userId)
            }
          } catch (err) {
            console.error(`Erreur mise à jour stock ${item.productId}:`, err)
          }
        }))
      }

      return saleData
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vente:', error)
      throw error
    }
  },

  async updateSale(id, sale) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data: existingSale, error: existingError } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (existingError) throw existingError

      // Restaurer les stocks EN PARALLÈLE (stock = stock + ancienne quantité)
      await Promise.all(
        (existingSale.sale_items || []).map(async (item) => {
          if (!item.product_id) return
          try {
            const qty = parseInt(item.quantity, 10) || 0
            if (qty <= 0) return

            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .eq('user_id', userId)
              .single()

            if (!product) return

            const currentStock = parseInt(product.stock, 10) || 0
            const restoredStock = currentStock + qty

            const { error: updErr } = await supabase
              .from('products')
              .update({ stock: restoredStock })
              .eq('id', item.product_id)
              .eq('user_id', userId)

            if (updErr) throw updErr
          } catch (err) {
            console.error(`Erreur restauration stock ${item.product_id}:`, err)
          }
        })
      )


      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .update({
          customer_name: sale.customerName || '',
          total: sale.total,
          payment_method: sale.paymentMethod || 'cash',
          notes: sale.notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (saleError) throw saleError

      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id)

      if (deleteItemsError) throw deleteItemsError

      if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
        const saleItems = sale.items.map(item => ({
          sale_id: id,
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

        // Mettre à jour les stocks EN PARALLÈLE via une séquence cohérente:
        // 1) on restaure l'ancien stock (fait plus haut)
        // 2) on déduit le stock des nouvelles quantités (ici)
        await Promise.all(
          sale.items.map(async (item) => {
            if (!item.productId) return
            try {
              const qty = parseInt(item.quantity, 10) || 0
              if (qty <= 0) return

              const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.productId)
                .eq('user_id', userId)
                .single()

              if (!product) return

              const currentStock = parseInt(product.stock, 10) || 0
              const newStock = Math.max(0, currentStock - qty)

              const { error: updErr } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.productId)
                .eq('user_id', userId)

              if (updErr) throw updErr
            } catch (err) {
              console.error(`Erreur mise à jour stock ${item.productId}:`, err)
            }
          })
        )
      }

      return saleData
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la vente:', error)
      throw error
    }
  },

  async deleteSale(id) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      // 1) Récupérer les items de la vente pour restaurer le stock
      const { data: saleWithItems, error: saleFetchErr } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (saleFetchErr) throw saleFetchErr

      // 2) Restaurer le stock (stock = stock + quantité)
      await Promise.all(
        (saleWithItems?.sale_items || []).map(async (item) => {
          if (!item?.product_id) return
          const qty = parseInt(item.quantity, 10) || 0
          if (qty <= 0) return

          try {
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .eq('user_id', userId)
              .single()

            if (!product) return

            const currentStock = parseInt(product.stock, 10) || 0
            const restoredStock = currentStock + qty

            const { error: updErr } = await supabase
              .from('products')
              .update({ stock: restoredStock })
              .eq('id', item.product_id)
              .eq('user_id', userId)

            if (updErr) throw updErr
          } catch (err) {
            console.error(`Erreur restauration stock (deleteSale) ${item.product_id}:`, err)
          }
        })
      )

      // 3) Supprimer la vente
      const { error: deleteErr } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteErr) throw deleteErr

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

  // === PAIEMENTS ÉCHELONNÉS / AVANCES ===

  async addSalePayment(saleId, payment) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('sale_payments')
        .insert({
          sale_id: saleId,
          amount: parseFloat(payment.amount) || 0,
          payment_method: payment.paymentMethod || 'especes',
          payment_date: payment.paymentDate || new Date().toISOString(),
          notes: payment.notes || '',
          received_by: userId
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de l\'ajout du paiement:', error)
      throw error
    }
  },

  async getSalePayments(saleId) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('sale_payments')
        .select('*')
        .eq('sale_id', saleId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return (data || []).map(p => ({
        id: p.id,
        saleId: p.sale_id,
        amount: p.amount,
        paymentMethod: p.payment_method,
        paymentDate: p.payment_date,
        notes: p.notes,
        createdAt: p.created_at
      }))
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error)
      return []
    }
  },

  async deleteSalePayment(paymentId) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { error } = await supabase
        .from('sale_payments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du paiement:', error)
      throw error
    }
  },

  async getPendingCredits() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(*),
          sale_payments(*)
        `)
        .eq('user_id', userId)
        .eq('payment_method', 'credit')
        .in('payment_status', ['pending', 'partial', 'overdue'])
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((sale) => {
        const paidAmount = (sale.sale_payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        const remainingAmount = (parseFloat(sale.total) || 0) - paidAmount

        return {
          id: sale.id,
          customerName: sale.customer_name || '',
          customer_name: sale.customer_name || '',
          total: parseFloat(sale.total) || 0,
          paidAmount: paidAmount,
          paid_amount: paidAmount,
          remainingAmount: remainingAmount,
          remaining_amount: remainingAmount,
          paymentStatus: sale.payment_status || 'pending',
          payment_status: sale.payment_status || 'pending',
          dueDate: sale.due_date,
          due_date: sale.due_date,
          createdAt: sale.created_at,
          created_at: sale.created_at,
          items: (sale.sale_items || []).map((item) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price
          })),
          payments: (sale.sale_payments || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            paymentMethod: p.payment_method,
            paymentDate: p.payment_date,
            notes: p.notes
          }))
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des crédits en attente:', error)
      return []
    }
  },

  async updateSaleDueDate(saleId, dueDate) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Utilisateur non connecté')

      const { data, error } = await supabase
        .from('sales')
        .update({
          due_date: dueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la date d\'échéance:', error)
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
          date: expense.date || new Date().toISOString().split('T')[0],
          notes: expense.notes || ''
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
          date: updates.date,
          notes: updates.notes || '',
          updated_at: new Date().toISOString()
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
  },

  // === FONCTIONS UTILITAIRES DE CALCUL ===

  /**
   * Calcule le chiffre d'affaires réel basé sur les paiements effectués
   * Pour les ventes à crédit : compte seulement le montant payé (paid_amount)
   * Pour les ventes normales : compte le montant total
   * 
   * @param {Array} sales - Tableau des ventes
   * @returns {number} - Le chiffre d'affaires réel
   */
  calculateRealRevenue(sales) {
    if (!Array.isArray(sales)) return 0
    
    return sales.reduce((sum, sale) => {
      const paidAmount = parseFloat(sale.paidAmount || sale.paid_amount || 0)
      const totalAmount = parseFloat(sale.total || 0)
      
      // Si c'est une vente à crédit (paymentMethod = 'credit'), utiliser paidAmount
      // Sinon utiliser le total (vente payée immédiatement)
      if (sale.paymentMethod === 'credit' || sale.payment_method === 'credit') {
        return sum + (isNaN(paidAmount) ? 0 : paidAmount)
      } else {
        return sum + (isNaN(totalAmount) ? 0 : totalAmount)
      }
    }, 0)
  },

  /**
   * Calcule la dette totale (montants restants à payer)
   * Ne compte que les ventes à crédit non entièrement payées
   * 
   * @param {Array} sales - Tableau des ventes
   * @returns {number} - La dette totale
   */
  calculateTotalDebt(sales) {
    if (!Array.isArray(sales)) return 0
    
    return sales
      .filter(sale => (sale.paymentMethod === 'credit' || sale.payment_method === 'credit') &&
                      (sale.paymentStatus !== 'paid' && sale.payment_status !== 'paid'))
      .reduce((sum, sale) => {
        // Utiliser le montant restant (remaining_amount) ou calculer (total - paid)
        const remainingAmount = sale.remainingAmount || sale.remaining_amount || 
                               (parseFloat(sale.total || 0) - parseFloat(sale.paidAmount || sale.paid_amount || 0))
        return sum + (isNaN(remainingAmount) ? 0 : remainingAmount)
      }, 0)
  },

  /**
   * Filtre les ventes par période et calcule les statistiques
   * 
   * @param {Array} sales - Tableau des ventes
   * @param {string} period - Période ('day', 'week', 'month', 'quarter', 'year', 'all')
   * @returns {Object} - Statistiques { revenue, debt, count }
   */
  getSalesStatsByPeriod(sales, period = 'all') {
    if (!Array.isArray(sales)) return { revenue: 0, debt: 0, count: 0 }
    
    const now = new Date()
    let startDate = null
    
    switch(period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        startDate = new Date(now.setDate(diff))
        startDate.setHours(0, 0, 0, 0)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        // 'all' - pas de filtre
        startDate = null
    }
    
    const filteredSales = startDate 
      ? sales.filter(sale => new Date(sale.createdAt || sale.created_at) >= startDate)
      : sales
    
    return {
      revenue: this.calculateRealRevenue(filteredSales),
      debt: this.calculateTotalDebt(filteredSales),
      count: filteredSales.length
    }
  }
}

export default null
