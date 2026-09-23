import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="w-28 h-28 flex items-center justify-center overflow-hidden">
          <img src="/logo.jpeg" alt="Noppalé" className="w-28 h-28 object-contain" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Noppalé</h1>
          <p className="text-slate-500 text-sm">Gestion Commerciale</p>
        </div>
        
        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className="w-2.5 h-2.5 bg-primary-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        
        <p className="text-slate-400 text-xs">Chargement en cours...</p>
      </div>
    </div>
  )
}
