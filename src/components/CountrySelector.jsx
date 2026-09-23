import React, { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { countries, popularCountries } from '../data/countries'

export default function CountrySelector({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredCountries, setFilteredCountries] = useState(popularCountries)
  const dropdownRef = useRef(null)

  // Trouver le pays sélectionné
  const selectedCountry = countries.find(country => country.code === value) || popularCountries[0]

  useEffect(() => {
    // Filtrer les pays en fonction du terme de recherche
    const filtered = searchTerm 
      ? countries.filter(country => 
          country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.includes(searchTerm) ||
          country.flag.includes(searchTerm)
        )
      : popularCountries // Afficher les pays populaires par défaut
    
    setFilteredCountries(filtered)
  }, [searchTerm])

  useEffect(() => {
    // Fermer le dropdown quand on clique ailleurs
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (country) => {
    onChange(country.code)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton d'affichage */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2.5 border border-slate-200 rounded-l-xl bg-slate-50 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedCountry.flag}</span>
          <span>{selectedCountry.code}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Liste des pays */}
          <div className="overflow-y-auto max-h-60">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">{country.name}</div>
                    <div className="text-slate-500 text-xs">{country.code}</div>
                  </div>
                  {value === country.code && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                Aucun pays trouvé pour "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
