import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
          <span className="text-3xl font-black text-primary-600">N</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-black text-white tracking-tight">Noppalé</h1>
          <p className="text-primary-200 text-sm">Gestion Commerciale</p>
        </div>
        
        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        
        <p className="text-primary-200 text-xs">Chargement en cours...</p>
      </div>
    </div>
  )
}
