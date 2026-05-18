import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase/config.js'

/**
 * Hook pour écouter les changements en temps réel sur une table Supabase
 */
export function useRealtimeSubscription(tableName, onUpdate, filter = '', enabled = true) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!tableName || !enabled) return undefined

    let channel

    const setupSubscription = async () => {
      try {
        const channelId = `realtime:${tableName}:${filter || 'all'}`
        channel = supabase.channel(channelId)

        const config = {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter ? { filter } : {})
        }

        channel.on('postgres_changes', config, (payload) => {
          onUpdateRef.current?.(payload)
        })

        await channel.subscribe()
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
  }, [tableName, filter, enabled])
}

/**
 * Résout le filtre user_id de manière asynchrone puis s'abonne aux changements
 */
function useUserRealtime(tableName, onUpdate) {
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    let cancelled = false

    const resolveUserFilter = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (cancelled) return
        if (error) {
          console.error('Erreur auth pour realtime:', error)
          setFilter('')
          return
        }
        const userId = data?.user?.id
        setFilter(userId ? `user_id=eq.${userId}` : '')
      } catch (error) {
        if (!cancelled) {
          console.error('Erreur lors de la résolution du filtre realtime:', error)
          setFilter('')
        }
      }
    }

    resolveUserFilter()

    return () => {
      cancelled = true
    }
  }, [])

  useRealtimeSubscription(tableName, onUpdate, filter ?? '', filter !== null)
}

export function useProductsRealtime(onUpdate) {
  return useUserRealtime('products', onUpdate)
}

export function useSalesRealtime(onUpdate) {
  return useUserRealtime('sales', onUpdate)
}

export function useExpensesRealtime(onUpdate) {
  return useUserRealtime('expenses', onUpdate)
}

export function useCustomersRealtime(onUpdate) {
  return useUserRealtime('customers', onUpdate)
}

export function useShopInfoRealtime(onUpdate) {
  return useUserRealtime('shop_info', onUpdate)
}

export function useUserPreferencesRealtime(onUpdate) {
  return useUserRealtime('user_preferences', onUpdate)
}

export function useSecretCodeRealtime(onUpdate) {
  return useUserRealtime('user_secret_code', onUpdate)
}
