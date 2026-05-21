import React, { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../supabase/config'
import { formatExpiryDate, getFormattedStatus } from '../utils/checkAccess'
import { Lock, Calendar, AlertTriangle, User, LogOut, Mail, Phone } from 'lucide-react'

/**
 * Page affichée quand l'accès est bloqué
 */
export default function SubscriptionBlocked() {
  const [user, setUser] = useState(null)

  // Récupérer l'utilisateur Supabase actuel
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      console.log('SubscriptionBlocked - Utilisateur:', user?.id)
    }
    getCurrentUser()
  }, [])

  const { profile, loading, access, error } = useProfile(user?.id)

  // Pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              {access?.status === 'paused' ? (
                <User className="w-8 h-8 text-white" />
              ) : (
                <Lock className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {access?.status === 'paused' ? 'Compte Suspendu' : 'Accès Suspendu'}
            </h1>
            <p className="text-red-100">
              Votre accès à l'application est temporairement limité
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Message d'erreur */}
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-800 font-medium mb-1">
                    {access?.status === 'paused' ? 'Compte suspendu' : 'Abonnement expiré'}
                  </h3>
                  <p className="text-red-700 text-sm">
                    {access?.message || 'Votre accès a été suspendu. Veuillez contacter l\'administrateur.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations du profil */}
            {profile && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Informations du compte</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nom:</span>
                    <span className="font-medium">{profile.full_name || 'Non défini'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Statut:</span>
                    <span className="font-medium">{getFormattedStatus(profile)}</span>
                  </div>
                  {profile.subscription_end && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fin d'abonnement:</span>
                      <span className="font-medium">{formatExpiryDate(profile.subscription_end)}</span>
                    </div>
                  )}
                  {profile.grace_period_end && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Période de grâce:</span>
                      <span className="font-medium">{formatExpiryDate(profile.grace_period_end)}</span>
                    </div>
                  )}
                  {profile.subscription_note && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Note:</span>
                      <span className="font-medium">{profile.subscription_note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message rassurant */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 text-blue-400">📦</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-blue-800 font-medium mb-1">Vos données sont safe</h3>
                  <p className="text-blue-700 text-sm">
                    Toutes vos données sont conservées en sécurité. Contactez l'administrateur pour réactiver votre accès.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = 'mailto:admin@noppale.com'}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contacter l'administrateur
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.location.href = '/contact'}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Contacter
                </button>
                
                <button
                  onClick={async () => {
                    // Déconnexion Supabase
                    await supabase.auth.signOut()
                    window.location.href = '/login'
                  }}
                  className="bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </button>
              </div>
            </div>

            {/* Contact additionnel */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-500 text-sm mb-2">Autres moyens de contact</p>
              <div className="flex justify-center space-x-4">
                <a href="tel:+221123456789" className="text-blue-600 hover:text-blue-800 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  +221 123 456 789
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            © 2024 Noppale - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  )
}
