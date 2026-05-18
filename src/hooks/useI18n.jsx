import { useState, useEffect, useContext, createContext, useCallback } from 'react'
import { translations, currencies } from '../utils/i18n'
import { appStorage } from '../utils/storage'
import { supabase } from '../supabase/config.js'
import { useUserPreferencesRealtime } from './useRealtime.jsx'

const I18nContext = createContext()

const PREFERENCES_KEY = 'noppale_preferences'

const loadFromLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

const saveToLocalStorage = (prefs) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const existing = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}')
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...existing, ...prefs }))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des préférences:', error)
  }
}

const applyDocumentPreferences = (language, darkMode) => {
  if (typeof document === 'undefined') return
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = language
  if (darkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
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
      applyPreferences: () => {},
      currencies: [],
      availableLanguages: []
    }
  }
  return context
}

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr')
  const [currency, setCurrency] = useState('FCFA')
  const [preferencesReady, setPreferencesReady] = useState(false)

  const applyPreferences = useCallback((prefs = {}) => {
    const lang = prefs.language || 'fr'
    const curr = prefs.currency || 'FCFA'
    const dark = prefs.darkMode ?? prefs.dark_mode ?? false

    setLanguage(lang)
    setCurrency(curr)
    applyDocumentPreferences(lang, dark)
    saveToLocalStorage({ language: lang, currency: curr, darkMode: dark })
  }, [])

  const syncFromSupabase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const local = loadFromLocalStorage()
        if (local) applyPreferences(local)
        return
      }

      const saved = await appStorage.getUserPreferences()
      if (saved) {
        applyPreferences({
          language: saved.language,
          currency: saved.currency,
          darkMode: saved.dark_mode
        })
      } else {
        const local = loadFromLocalStorage()
        if (local) applyPreferences(local)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences Supabase:', error)
      const local = loadFromLocalStorage()
      if (local) applyPreferences(local)
    } finally {
      setPreferencesReady(true)
    }
  }, [applyPreferences])

  useEffect(() => {
    syncFromSupabase()
  }, [syncFromSupabase])

  useUserPreferencesRealtime(() => {
    syncFromSupabase()
  })

  const t = (key) => translations[language]?.[key] || key

  const formatCurrency = (amount, targetCurrency = currency) => {
    if (!amount && amount !== 0) return '0'

    const currencyInfo = currencies.find(c => c.code === targetCurrency)
    if (!currencyInfo) return amount.toString()

    const amountValue = parseFloat(amount) || 0
    const formatter = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })

    return `${formatter.format(amountValue)} ${currencyInfo.symbol}`
  }

  const getCurrentCurrency = () => currencies.find(c => c.code === currency) || currencies[0]

  const getCurrencyName = (currencyCode) => {
    const curr = currencies.find(c => c.code === currencyCode)
    return curr?.name[language] || currencyCode
  }

  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage)
    saveToLocalStorage({ language: newLanguage })
    applyDocumentPreferences(newLanguage, document.documentElement.classList.contains('dark'))
  }

  const updateCurrency = (newCurrency) => {
    setCurrency(newCurrency)
    saveToLocalStorage({ currency: newCurrency })
  }

  const updateDarkMode = (isDark) => {
    saveToLocalStorage({ darkMode: isDark })
    applyDocumentPreferences(language, isDark)
  }

  const value = {
    language,
    currency,
    preferencesReady,
    t,
    formatCurrency,
    getCurrentCurrency,
    getCurrencyName,
    updateLanguage,
    updateCurrency,
    updateDarkMode,
    applyPreferences,
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
