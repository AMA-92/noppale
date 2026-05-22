import React from 'react'
import { Navigate } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'
import { useSubscription } from '../hooks/useSubscription.jsx'

function SubscriptionGate({ user, children }) {
  const subscriptionInfo = useSubscription(user?.id)

  if (subscriptionInfo.loading) {
    return <LoadingScreen />
  }

  if (subscriptionInfo.isSuspended) {
    return <Navigate to="/subscription-blocked" replace state={{ reason: 'suspended' }} />
  }

  if (subscriptionInfo.isExpired) {
    return <Navigate to="/subscription-blocked" replace state={{ reason: 'expired' }} />
  }

  return children
}

export default React.memo(SubscriptionGate)
