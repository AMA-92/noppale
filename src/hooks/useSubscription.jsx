import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase/config.js'

export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadSubscription = async () => {
      if (!userId) {
        setSubscription(null)
        setLoading(false)
        setError(null)
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

        if (isMounted) {
          setSubscription(data)
        }
      } catch (loadError) {
        if (isMounted) {
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
