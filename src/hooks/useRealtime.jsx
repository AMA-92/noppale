import { useEffect, useRef } from 'react'
import { supabase } from '../supabase/config.js'

/**
 * Hook pour écouter les changements en temps réel sur une table Supabase
 * @param {string} tableName - Nom de la table à écouter
 * @param {Function} onUpdate - Callback appelé quand des données sont mises à jour
 */
export function useRealtimeSubscription(tableName, onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    let channel
    let cancelled = false

    const setupSubscription = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (cancelled || error || !user?.id) return

        const filter = `user_id=eq.${user.id}`
        // Use unique channel name with random suffix to avoid conflicts
        const channelSuffix = Math.random().toString(36).substring(2, 9)
        const channelName = `realtime:${tableName}:${user.id}:${channelSuffix}`

        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: tableName,
              filter
            },
            (payload) => {
              onUpdateRef.current?.(payload)
            }
          )

        await channel.subscribe()
      } catch (err) {
        console.error(`Error setting up realtime subscription for ${tableName}:`, err)
      }
    }

    setupSubscription()

    return () => {
      cancelled = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tableName])
}

export function useProductsRealtime(onUpdate) {
  return useRealtimeSubscription('products', onUpdate)
}

export function useSalesRealtime(onUpdate) {
  return useRealtimeSubscription('sales', onUpdate)
}

export function useExpensesRealtime(onUpdate) {
  return useRealtimeSubscription('expenses', onUpdate)
}

export function useCustomersRealtime(onUpdate) {
  return useRealtimeSubscription('customers', onUpdate)
}

export function useShopInfoRealtime(onUpdate) {
  return useRealtimeSubscription('shop_info', onUpdate)
}

export function useUserPreferencesRealtime(onUpdate) {
  return useRealtimeSubscription('user_preferences', onUpdate)
}

export function useSecretCodeRealtime(onUpdate) {
  return useRealtimeSubscription('user_secret_code', onUpdate)
}
