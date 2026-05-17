import { useEffect, useState } from 'react'
import { supabase } from '../supabase/config.js'

/**
 * Hook pour écouter les changements en temps réel sur une table Supabase
 * @param {string} tableName - Nom de la table à écouter
 * @param {Function} onUpdate - Callback appelé quand des données sont mises à jour
 * @param {string} filter - Filtre SQL pour les abonnements (ex: 'user_id=eq.123')
 */
export function useRealtimeSubscription(tableName, onUpdate, filter = '') {
  useEffect(() => {
    let channel
    let subscription

    const setupSubscription = async () => {
      try {
        // Nettoyer l'ancien channel s'il existe
        if (channel) {
          supabase.removeChannel(channel)
        }

        // Créer un abonnement aux changements
        channel = supabase.channel(`realtime:${tableName}`)

        if (filter) {
          channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: filter
          }, (payload) => {
            console.log(`Realtime change on ${tableName}:`, payload)
            if (onUpdate) onUpdate(payload)
          })
        } else {
          channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: tableName
          }, (payload) => {
            console.log(`Realtime change on ${tableName}:`, payload)
            if (onUpdate) onUpdate(payload)
          })
        }

        subscription = await channel.subscribe((status) => {
          console.log(`Subscription status for ${tableName}:`, status)
        })
      } catch (error) {
        console.error(`Error setting up realtime subscription for ${tableName}:`, error)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tableName, filter, onUpdate])
}

/**
 * Hook pour écouter les changements en temps réel sur les produits
 */
export function useProductsRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('products', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur les ventes
 */
export function useSalesRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('sales', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur les dépenses
 */
export function useExpensesRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('expenses', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur les clients
 */
export function useCustomersRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('customers', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur les informations de la boutique
 */
export function useShopInfoRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('shop_info', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur les préférences utilisateur
 */
export function useUserPreferencesRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('user_preferences', onUpdate, filter)
}

/**
 * Hook pour écouter les changements en temps réel sur le code secret
 */
export function useSecretCodeRealtime(onUpdate) {
  const userId = supabase.auth.getUser().data?.user?.id
  const filter = userId ? `user_id=eq.${userId}` : ''
  return useRealtimeSubscription('user_secret_code', onUpdate, filter)
}
