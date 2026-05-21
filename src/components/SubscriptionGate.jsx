import React, { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../supabase/config'
import { formatExpiryDate, getFormattedStatus } from '../utils/checkAccess'
import { Lock, Calendar, AlertTriangle, User, LogOut } from 'lucide-react'

/**
 * Composant qui protège l'accès aux fonctionnalités selon l'abonnement
 */
const SubscriptionGate = ({ children, featureName = "cette fonctionnalité", userId }) => {
  const [supabaseUser, setSupabaseUser] = useState(null)
  
  // Récupérer l'utilisateur Supabase actuel si userId n'est pas fourni
  useEffect(() => {
    if (!userId) {
      const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setSupabaseUser(user)
        console.log('SubscriptionGate - Utilisateur Supabase:', user?.id)
      }
      getCurrentUser()
    }
  }, [userId])
  
  const actualUserId = userId || supabaseUser?.id
  const { profile, loading, access, error } = useProfile(actualUserId)

  // Pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Vérification de l'abonnement...</p>
        </div>
      </div>
    )
  }

  // Erreur de chargement
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
            <h3 className="text-red-800 font-semibold mb-2">Erreur de vérification</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Accès autorisé
  if (access.allowed) {
    // Afficher un avertissement si en période de grâce
    if (access.status === 'grace_period') {
      return (
        <>
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
              <div className="flex-1">
                <p className="text-orange-700 text-sm font-medium">
                  {access.message}
                </p>
              </div>
            </div>
          </div>
          {children}
        </>
      )
    }

    // Accès normal
    return children
  }

  // Accès refusé - Afficher la page de blocage
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
      <div className="max-w-md w-full mx-4 p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            {/* Icône selon le statut */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              {access.status === 'paused' ? (
                <User className="w-6 h-6 text-red-600" />
              ) : (
                <Lock className="w-6 h-6 text-red-600" />
              )}
            </div>

            {/* Titre */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {access.status === 'paused' ? 'Compte suspendu' : 'Accès suspendu'}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              {access.message}
            </p>

            {/* Informations du profil si disponible */}
            {profile && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Statut:</span>
                    <span className="font-medium">{getFormattedStatus(profile)}</span>
                  </div>
                  {profile.subscription_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fin d'abonnement:</span>
                      <span className="font-medium">{formatExpiryDate(profile.subscription_end)}</span>
                    </div>
                  )}
                  {profile.grace_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fin période de grâce:</span>
                      <span className="font-medium">{formatExpiryDate(profile.grace_period_end)}</span>
                    </div>
                  )}
                  {profile.subscription_note && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Note:</span>
                      <span className="font-medium">{profile.subscription_note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message d'aide */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 text-left">
              <p className="text-sm text-blue-700">
                <strong>Vos données sont conservées.</strong><br/>
                Contactez l'administrateur pour réactiver votre accès.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/settings'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Contacter l'admin
              </button>
              
              <button
                onClick={() => {
                  // Déconnexion
                  window.location.href = '/login'
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionGate
