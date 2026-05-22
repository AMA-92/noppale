import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../supabase/config.js'

// Cache pour les subscriptions (évite les recharges répétées)
const subscriptionCache = new Map()
const CACHE_TTL = 30000 // 30 secondes

export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState(null)
  const cacheTimeRef = useRef(0)
  const userIdRef = useRef(userId)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const loadSubscription = async () => {
      if (!userId) {
        setSubscription(null)
        setLoading(false)
        setError(null)
        return
      }

      // Vérifier le cache en mémoire
      const now = Date.now()
      if (subscriptionCache.has(userId) && (now - cacheTimeRef.current) < CACHE_TTL) {
        const cached = subscriptionCache.get(userId)
        if (isMounted) {
          setSubscription(cached)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (subscriptionError) throw subscriptionError

        if (isMounted && userIdRef.current === userId) {
          setSubscription(data)
          subscriptionCache.set(userId, data)
          cacheTimeRef.current = Date.now()
        }
      } catch (loadError) {
        if (isMounted && userIdRef.current === userId) {
          setSubscription(null)
          setError(loadError)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSubscription()

    return () => {
      isMounted = false
    }
  }, [userId])

  const status = useMemo(() => {
    if (!subscription) {
      return {
        isAdmin: false,
        isActive: false,
        isSuspended: false,
        isExpired: false,
        isExpiringSoon: false,
        isTrial: false,
        daysRemaining: 0
      }
    }

    const now = new Date()
    const endDate = new Date(subscription.subscription_end)
    const diffMs = endDate.getTime() - now.getTime()
    const daysRemaining = Math.max(Math.ceil(diffMs / 86400000), 0)
    const isAdmin = subscription.is_admin === true
    const isSuspended = subscription.account_status === 'suspended'
    const isExpired = !isAdmin && !isSuspended && diffMs < 0

    return {
      isAdmin,
      isActive: isAdmin || (!isSuspended && !isExpired),
      isSuspended,
      isExpired,
      isExpiringSoon: !isAdmin && !isSuspended && !isExpired && daysRemaining <= 5,
      isTrial: subscription.subscription_type === 'trial',
      daysRemaining
    }
  }, [subscription])

  return {
    subscription,
    loading,
    error,
    ...status
  }
}
