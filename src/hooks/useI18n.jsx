import { useState, useEffect, useContext, createContext } from 'react'
import { translations, currencies, exchangeRates } from '../utils/i18n'

// Contexte pour les traductions
const I18nContext = createContext()

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    // Fallback si le contexte n'est pas disponible
    return {
      language: 'fr',
      currency: 'FCFA',
      t: (key) => key,
      formatCurrency: (amount, targetCurrency = 'FCFA') => {
        if (!amount && amount !== 0) return '0 FCFA'
        const amountValue = parseFloat(amount) || 0
        const formattedNumber = new Intl.NumberFormat('fr-FR').format(amountValue)
        return `${formattedNumber} FCFA`
      },
      getCurrentCurrency: () => ({ code: 'FCFA', symbol: 'FCFA' }),
      getCurrencyName: (code) => code,
      updateLanguage: () => {},
      updateCurrency: () => {},
      updateDarkMode: () => {},
      currencies: [],
      availableLanguages: []
    }
  }
  return context
}

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr')
  const [currency, setCurrency] = useState('FCFA')

  // Charger les préférences depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedPreferences = localStorage.getItem('noppale_preferences')
        if (savedPreferences) {
          const preferences = JSON.parse(savedPreferences)
          setLanguage(preferences.language || 'fr')
          setCurrency(preferences.currency || 'FCFA')
          
          // Appliquer le mode sombre au chargement
          if (preferences.darkMode) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error)
      }
    }
  }, [])

  // Fonction de traduction
  const t = (key) => {
    return translations[language]?.[key] || key
  }

  // Fonction de formatage de devise
  const formatCurrency = (amount, targetCurrency = currency) => {
    if (!amount && amount !== 0) return '0'
    
    const currencyInfo = currencies.find(c => c.code === targetCurrency)
    if (!currencyInfo) return amount.toString()
    
    // Ne pas convertir - juste changer le symbole
    const amountValue = parseFloat(amount) || 0
    
    // Garder les chiffres en français quelle que soit la langue
    const formatter = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
    
    const formattedNumber = formatter.format(amountValue)
    
    // Ajouter le symbole de la devise cible (sans conversion)
    return `${formattedNumber} ${currencyInfo.symbol}`
  }

  // Fonction pour obtenir les informations de la devise actuelle
  const getCurrentCurrency = () => {
    return currencies.find(c => c.code === currency) || currencies[0]
  }

  // Fonction pour obtenir le nom de la devise dans la langue actuelle
  const getCurrencyName = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency?.name[language] || currencyCode
  }

  // Mettre à jour la langue
  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedPreferences = JSON.parse(localStorage.getItem('noppale_preferences') || '{}')
        localStorage.setItem('noppale_preferences', JSON.stringify({
          ...savedPreferences,
          language: newLanguage
        }))
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la langue:', error)
      }
    }
    
    // Mettre à jour la direction du document pour l'arabe
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = newLanguage
    }
  }

  // Mettre à jour la devise
  const updateCurrency = (newCurrency) => {
    setCurrency(newCurrency)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedPreferences = JSON.parse(localStorage.getItem('noppale_preferences') || '{}')
        localStorage.setItem('noppale_preferences', JSON.stringify({
          ...savedPreferences,
          currency: newCurrency
        }))
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la devise:', error)
      }
    }
  }

  // Appliquer le mode sombre
  const updateDarkMode = (isDark) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedPreferences = JSON.parse(localStorage.getItem('noppale_preferences') || '{}')
        localStorage.setItem('noppale_preferences', JSON.stringify({
          ...savedPreferences,
          darkMode: isDark
        }))
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du mode sombre:', error)
      }
    }
    
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const value = {
    language,
    currency,
    t,
    formatCurrency,
    getCurrentCurrency,
    getCurrencyName,
    updateLanguage,
    updateCurrency,
    updateDarkMode,
    currencies,
    availableLanguages: [
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' }
    ]
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}
