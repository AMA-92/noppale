import React from 'react'
import { AlertTriangle, Clock, LogOut, Mail, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authStorage } from '../utils/storage'
import toast from 'react-hot-toast'

export default function SubscriptionBlocked({ reason = 'expired' }) {
  const navigate = useNavigate()
  const isSuspended = reason === 'suspended'

  const handleLogout = async () => {
    try {
      await authStorage.logout()
      toast.success('Déconnexion réussie')
      navigate('/login')
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`${isSuspended ? 'bg-red-600' : 'bg-amber-500'} px-6 py-8 text-white text-center`}>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {isSuspended ? <ShieldAlert size={40} /> : <Clock size={40} />}
          </div>
          <h1 className="text-2xl font-black mb-2">
            {isSuspended ? 'Compte suspendu' : 'Période d’essai expirée'}
          </h1>
          <p className="text-white/90 text-sm">
            {isSuspended
              ? 'Votre accès à Noppalé est actuellement suspendu.'
              : 'Votre période d’essai de 10 jours est terminée.'
            }
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className={`${isSuspended ? 'text-red-500' : 'text-amber-500'} flex-shrink-0 mt-0.5`} size={22} />
              <div>
                <h2 className="font-bold text-slate-800 mb-1">
                  {isSuspended ? 'Accès désactivé' : 'Abonnement requis'}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {isSuspended
                    ? 'Veuillez contacter l’administrateur pour vérifier la situation de votre compte.'
                    : 'Pour continuer à utiliser l’application, contactez l’administrateur afin de prolonger ou activer votre abonnement.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Mail size={18} />
              Contacter l’admin
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
