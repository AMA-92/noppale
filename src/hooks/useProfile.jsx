import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { checkAccess, isExpiringSoon, getDaysUntilExpiry } from '../utils/checkAccess'

/**
 * Hook pour gérer le profil utilisateur et la vérification d'abonnement
 */
export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadProfile(userId)
  }, [userId])

  const loadProfile = async (uid) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (error) {
        console.error('Erreur chargement profil:', error)
        setError(error.message)
        return
      }

      setProfile(data)
    } catch (err) {
      console.error('Erreur inattendue:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const access = checkAccess(profile)
  const expiringSoon = isExpiringSoon(profile)
  const daysUntilExpiry = getDaysUntilExpiry(profile)

  return {
    profile,
    loading,
    error,
    access,
    expiringSoon,
    daysUntilExpiry,
    refetch: () => loadProfile(userId)
  }
}

/**
 * Hook pour écouter les changements de profil en temps réel
 */
export function useProfileRealtime(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Charger le profil initial
    const loadInitialProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      setProfile(data)
      setLoading(false)
    }

    loadInitialProfile()

    // Écouter les changements en temps réel
    const channel = supabase
      .channel(`profile_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Changement profil détecté:', payload)
          if (payload.new) {
            setProfile(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const access = checkAccess(profile)
  const expiringSoon = isExpiringSoon(profile)
  const daysUntilExpiry = getDaysUntilExpiry(profile)

  return {
    profile,
    loading,
    access,
    expiringSoon,
    daysUntilExpiry
  }
}
