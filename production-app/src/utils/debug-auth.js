// Script de diagnostic pour l'authentification Supabase
// À utiliser dans la console du navigateur pour diagnostiquer les problèmes

export const debugAuth = async () => {
  console.log('🔍 Diagnostic Authentification Supabase')
  console.log('=========================================')
  
  // 1. Vérifier les variables d'environnement
  console.log('📋 Variables d\'environnement:')
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurée' : '❌ Manquante')
  console.log('VITE_DEFAULT_CURRENCY:', import.meta.env.VITE_DEFAULT_CURRENCY)
  console.log('VITE_ASSISTANT_FUNCTION_URL:', import.meta.env.VITE_ASSISTANT_FUNCTION_URL)
  
  // 2. Vérifier la configuration Supabase
  const { supabase } = await import('../supabase/config.js')
  console.log('🔧 Configuration Supabase:')
  console.log('URL Supabase:', supabase.auth.baseURL)
  console.log('Clé anonyme configurée:', !!supabase.auth.headers['apikey'])
  
  // 3. Tester la connexion Supabase
  try {
    console.log('🌐 Test de connexion Supabase...')
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ Erreur de connexion:', error)
    } else {
      console.log('✅ Connexion Supabase réussie')
      console.log('Session active:', !!data.session)
    }
  } catch (error) {
    console.error('❌ Erreur critique:', error)
  }
  
  // 4. Vérifier l'état de l'authentification
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Utilisateur connecté:', user ? user.email : 'Non connecté')
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error)
  }
  
  // 5. Tester localStorage
  console.log('💾 État localStorage:')
  console.log('Cached user:', localStorage.getItem('cached_user') ? 'Présent' : 'Absent')
  console.log('Remembered credentials:', localStorage.getItem('noppale_remembered_credentials') ? 'Présent' : 'Absent')
  
  console.log('=========================================')
  console.log('📝 Instructions:')
  console.log('1. Copiez ce résultat et envoyez-le au support')
  console.log('2. Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont configurés')
  console.log('3. Assurez-vous que l\'application a été redéployée après configuration')
}

// Fonction pour tester la connexion avec des identifiants
export const testLogin = async (email, password) => {
  console.log('🧪 Test de connexion avec:', email)
  try {
    const { supabase } = await import('../supabase/config.js')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message)
      console.error('Code d\'erreur:', error.status)
      return { success: false, error: error.message }
    } else {
      console.log('✅ Connexion réussie!')
      console.log('Utilisateur:', data.user?.email)
      return { success: true, user: data.user }
    }
  } catch (error) {
    console.error('❌ Erreur critique:', error)
    return { success: false, error: error.message }
  }
}

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth
  window.testLogin = testLogin
  console.log('🔧 Fonctions de diagnostic disponibles:')
  console.log('- debugAuth() : Diagnostic complet')
  console.log('- testLogin(email, password) : Test de connexion')
}