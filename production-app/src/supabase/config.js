import { createClient } from '@supabase/supabase-js'

// Configuration Supabase avec valeurs par défaut correctes pour le projet Noppalé
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sewgwcxaenssloobnfjk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validation de la configuration
if (!supabaseUrl || supabaseUrl.includes('votre-projet')) {
  console.error('❌ Configuration Supabase invalide: URL incorrecte')
  console.error('Veuillez configurer VITE_SUPABASE_URL dans les variables d\'environnement')
}

if (!supabaseAnonKey || supabaseAnonKey.includes('votre-clé')) {
  console.error('❌ Configuration Supabase invalide: Clé anonyme manquante')
  console.error('Veuillez configurer VITE_SUPABASE_ANON_KEY dans les variables d\'environnement')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tables de la base de données
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  SALES: 'sales',
  EXPENSES: 'expenses',
  CUSTOMERS: 'customers',
  SHOP_INFO: 'shop_info',
  }

// Fonctions d'authentification
export const auth = {
  // Inscription
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  },

  // Connexion
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Déconnexion
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtenir l'utilisateur actuel
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Écouter les changements d'authentification
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Fonctions de base de données
export const db = {
  // Générique
  select: async (table, options = {}) => {
    let query = supabase.from(table).select('*')
    
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending })
    }
    
    const { data, error } = await query
    return { data, error }
  },

  insert: async (table, data) => {
    const { data: result, error } = await supabase.from(table).insert(data).select()
    return { data: result, error }
  },

  update: async (table, id, data) => {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select()
    return { data: result, error }
  },

  delete: async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    return { error }
  }
}
