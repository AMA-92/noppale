import React from 'react'
import { Mail, Phone, MessageCircle } from 'lucide-react'

export default function Contact() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Contacter nous</h1>
        <p className="text-slate-500">Besoin d'aide ? Contactez notre équipe de support</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Email</h3>
              <p className="text-sm text-slate-500">Réponse sous 24h</p>
            </div>
          </div>
          <a 
            href="mailto:medconnect092@gmail.com" 
            className="text-primary-600 hover:underline font-medium"
          >
            medconnect092@gmail.com
          </a>
        </div>

        {/* Téléphone */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Phone size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Téléphone</h3>
              <p className="text-sm text-slate-500">Du lundi au samedi, 8h-18h</p>
            </div>
          </div>
          <a 
            href="tel:+221778762082" 
            className="text-primary-600 hover:underline font-medium"
          >
            +221 77 876 20 82
          </a>
        </div>

        {/* WhatsApp (optionnel) */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">WhatsApp</h3>
              <p className="text-sm text-slate-500">Réponse rapide</p>
            </div>
          </div>
          <a 
            href="https://wa.me/221778762082" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline font-medium"
          >
            +221 77 876 20 82
          </a>
        </div>
      </div>

      {/* Message d'information */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageCircle size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">Support technique</h3>
            <p className="text-sm text-slate-600">
              Notre équipe est disponible pour vous aider avec toute question ou problème lié à l'utilisation de Noppalé. 
              N'hésitez pas à nous contacter par email, téléphone ou WhatsApp pour une assistance rapide.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
