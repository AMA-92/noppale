import { createContext, useContext } from 'react'

export const SubscriptionContext = createContext(null)

export function useSubscriptionContext() {
  return useContext(SubscriptionContext)
}
