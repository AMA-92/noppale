import { createClient } from '@supabase/supabase-js'

// Configuration Supabase du projet Noppalé
const supabaseUrl = 'https://sewgwcxaenssloobnfjk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNld2d3Y3hhZW5zc2xvb2JuZmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTYzMDQsImV4cCI6MjA5NDUzMjMwNH0.6Pp6xgkx_f83u5_cP7tT25Pt7kSBEUTP6yn_4hF7UsU'

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
