// Gestionnaire de profil utilisateur - Met à jour automatiquement les informations
import { supabase } from '../supabase/config'

export class ProfileManager {
  // Mettre à jour le profil utilisateur
  static async updateProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error }
    }
  }

  // Obtenir le profil complet d'un utilisateur
  static async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('admin_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting profile:', error)
      return { success: false, error }
    }
  }

  // Mettre à jour les informations de base (nom, téléphone, etc.)
  static async updateBasicInfo(userId, { fullName, phone, businessName, businessType, location }) {
    return this.updateProfile(userId, {
      full_name: fullName,
      phone,
      business_name: businessName,
      business_type: businessType,
      location
    })
  }

  // Synchroniser le profil après inscription
  static async syncProfileAfterSignup(userId, email, phone = null) {
    try {
      // Obtenir les métadonnées de l'utilisateur
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError

      const metadata = userData?.user?.user_metadata || {}
      
      // Créer/mettre à jour le profil avec les informations disponibles
      const profileData = {
        email,
        phone: phone || metadata.phone,
        full_name: metadata.name || metadata.full_name
      }

      return this.updateProfile(userId, profileData)
    } catch (error) {
      console.error('Error syncing profile:', error)
      return { success: false, error }
    }
  }

  // Mettre à jour manuellement les statistiques
  static async updateStats(userId) {
    try {
      const { data, error } = await supabase.rpc('update_user_profile_stats', {
        user_uuid: userId
      })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating stats:', error)
      return { success: false, error }
    }
  }

  // Obtenir tous les profils (pour admin)
  static async getAllProfiles() {
    try {
      const { data, error } = await supabase
        .from('admin_user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting all profiles:', error)
      return { success: false, error }
    }
  }

  // Activer/désactiver un profil
  static async toggleProfileStatus(userId, isActive) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error toggling profile status:', error)
      return { success: false, error }
    }
  }

  // Supprimer un profil et toutes ses données
  static async deleteProfile(userId) {
    try {
      // Cette fonction devrait appeler la fonction admin_delete_user
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
        admin_email: 'admin@noppale.app' // À configurer
      })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error deleting profile:', error)
      return { success: false, error }
    }
  }
}
