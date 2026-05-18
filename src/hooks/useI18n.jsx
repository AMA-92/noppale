import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react'
import { translations, currencies } from '../utils/i18n'
import { appStorage } from '../utils/storage'
import { useUserPreferencesRealtime } from './useRealtime.jsx'

const I18nContext = createContext()

const readLocalPreferences = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const saved = localStorage.getItem('noppale_preferences')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

const writeLocalPreferences = (partial) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const current = JSON.parse(localStorage.getItem('noppale_preferences') || '{}')
    localStorage.setItem('noppale_preferences', JSON.stringify({ ...current, ...partial }))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde locale des préférences:', error)
  }
}

const applyDocumentPreferences = (lang, isDark) => {
  if (typeof document === 'undefined') return
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  if (isDark) {
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
      applyRemotePreferences: () => {},
      currencies: [],
      availableLanguages: []
    }
  }
  return context
}

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr')
  const [currency, setCurrency] = useState('FCFA')
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const skipNextPersist = useRef(false)

  const applyPreferences = useCallback((prefs, { persistLocal = true } = {}) => {
    if (!prefs) return

    const lang = prefs.language || 'fr'
    const cur = prefs.currency || 'FCFA'
    const isDark = prefs.dark_mode ?? prefs.darkMode ?? false

    setLanguage(lang)
    setCurrency(cur)
    applyDocumentPreferences(lang, isDark)

    if (persistLocal) {
      writeLocalPreferences({ language: lang, currency: cur, darkMode: isDark })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPreferences = async () => {
      try {
        const remote = await appStorage.getUserPreferences()
        if (cancelled) return

        if (remote) {
          applyPreferences(remote)
          setPreferencesLoaded(true)
          return
        }
      } catch (error) {
        console.error('Erreur chargement préférences Supabase:', error)
      }

      const local = readLocalPreferences()
      if (local && !cancelled) {
        applyPreferences({
          language: local.language,
          currency: local.currency,
          dark_mode: local.darkMode
        })
      }

      if (!cancelled) setPreferencesLoaded(true)
    }

    loadPreferences()

    return () => {
      cancelled = true
    }
  }, [applyPreferences])

  useUserPreferencesRealtime((payload) => {
    const record = payload?.new || payload?.old
    if (record) {
      skipNextPersist.current = true
      applyPreferences(record)
    }
  })

  const persistToSupabase = useCallback(async (partial) => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    try {
      const current = await appStorage.getUserPreferences()
      await appStorage.setUserPreferences({
        language: partial.language ?? current?.language ?? language,
        currency: partial.currency ?? current?.currency ?? currency,
        darkMode: partial.darkMode ?? current?.dark_mode ?? false,
        notifications: current?.notifications !== false
      })
    } catch (error) {
      console.error('Erreur synchronisation préférences Supabase:', error)
    }
  }, [language, currency])

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
    const info = currencies.find(c => c.code === currencyCode)
    return info?.name[language] || currencyCode
  }

  const updateLanguage = useCallback((newLanguage, { persist = true } = {}) => {
    setLanguage(newLanguage)
    writeLocalPreferences({ language: newLanguage })
    applyDocumentPreferences(newLanguage, document.documentElement.classList.contains('dark'))
    if (persist) persistToSupabase({ language: newLanguage })
  }, [persistToSupabase])

  const updateCurrency = useCallback((newCurrency, { persist = true } = {}) => {
    setCurrency(newCurrency)
    writeLocalPreferences({ currency: newCurrency })
    if (persist) persistToSupabase({ currency: newCurrency })
  }, [persistToSupabase])

  const updateDarkMode = useCallback((isDark, { persist = true } = {}) => {
    writeLocalPreferences({ darkMode: isDark })
    applyDocumentPreferences(language, isDark)
    if (persist) persistToSupabase({ darkMode: isDark })
  }, [language, persistToSupabase])

  const applyRemotePreferences = useCallback((prefs) => {
    skipNextPersist.current = true
    applyPreferences(prefs)
  }, [applyPreferences])

  const value = {
    language,
    currency,
    preferencesLoaded,
    t,
    formatCurrency,
    getCurrentCurrency,
    getCurrencyName,
    updateLanguage,
    updateCurrency,
    updateDarkMode,
    applyRemotePreferences,
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
