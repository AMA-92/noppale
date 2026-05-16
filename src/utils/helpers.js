// Formatage FCFA (gardé pour compatibilité)
export const formatCFA = (amount) => {
  if (amount === null || amount === undefined) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

// Formatage de devise avec devise personnalisée
export const formatCurrency = (amount, currency = 'FCFA', language = 'fr') => {
  if (!amount && amount !== 0) return '0'
  
  const currencySymbols = {
    'FCFA': 'FCFA',
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'RUB': '₽',
    'MXN': '$',
    'BRL': 'R$',
    'ZAR': 'R',
    'KRW': '₩',
    'SGD': 'S$',
    'HKD': 'HK$',
    'TRY': '₺',
    'SAR': '﷼',
    'AED': 'د.إ',
    'EGP': 'E£',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
    'NGN': '₦',
    'GHS': 'GH₵',
    'KES': 'KSh',
    'UGX': 'USh',
    'TZS': 'TSh',
    'MAD': 'د.م',
    'TND': 'د.ت',
    'MRU': 'UM',
    'DZD': 'د.ج',
    'LYD': 'د.ل'
  }
  
  const symbol = currencySymbols[currency] || currency
  const locale = language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US'
  
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  
  return `${formatter.format(amount)} ${symbol}`
}

// Formatage date
export const formatDate = (date) => {
  if (!date) return '-'
  const d = date.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  const d = date.toDate ? date.toDate() : new Date(date)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

// Méthodes de paiement
export const PAYMENT_METHODS = [
  { value: 'especes', label: 'Espèces', color: 'payment-especes', icon: '💵' },
  { value: 'mobile_money', label: 'Mobile Money', color: 'payment-mobile', icon: '📱' },
  { value: 'carte_bancaire', label: 'Carte Bancaire', color: 'payment-carte', icon: '�' },
  { value: 'credit', label: 'À Crédit', color: 'payment-credit', icon: '📋' },
]

export const getPaymentMethod = (value) => {
  // Gestion des anciennes valeurs pour compatibilité
  const legacyMapping = {
    'wave': 'mobile_money',
    'orange_money': 'mobile_money', 
    'dette': 'credit',
    'orange': 'mobile_money'
  }
  
  const normalizedValue = legacyMapping[value] || value
  
  return PAYMENT_METHODS.find(m => m.value === normalizedValue) || { 
    label: value || 'Inconnu', 
    color: 'badge-gray', 
    icon: '💳' 
  }
}

// Catégories de produits
export const PRODUCT_CATEGORIES = [
  'Alimentation', 'Boissons', 'Hygiène', 'Cosmétiques', 
  'Textile', 'Électronique', 'Papeterie', 'Autres'
]

// Couleurs pour les graphiques
export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]

// Générer une couleur aléatoire pour les avatars
export const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return colors[idx]
}

// Initiales pour avatar
export const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Tronquer le texte
export const truncate = (text, maxLen = 30) => {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// Générer ID unique
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Calcul du bénéfice
export const calcProfit = (salePrice, buyPrice, quantity = 1) => {
  return (salePrice - buyPrice) * quantity
}
