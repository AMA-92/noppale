/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < 8) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  
  return hasUpperCase && hasLowerCase && hasNumber
}

/**
 * Validate numeric input
 */
export function isValidNumber(value, min = null, max = null) {
  const num = parseFloat(value)
  if (isNaN(num)) return false
  if (min !== null && num < min) return false
  if (max !== null && num > max) return false
  return true
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value) {
  return isValidNumber(value, 0)
}

/**
 * Sanitize and validate product data
 */
export function validateProductData(product) {
  const errors = []
  
  if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
    errors.push('Le nom du produit est requis')
  }
  
  if (product.name && product.name.length > 200) {
    errors.push('Le nom du produit ne doit pas dépasser 200 caractères')
  }
  
  if (product.category && product.category.length > 100) {
    errors.push('La catégorie ne doit pas dépasser 100 caractères')
  }
  
  if (product.buyingPrice !== undefined && !isPositiveNumber(product.buyingPrice)) {
    errors.push('Le prix d\'achat doit être un nombre positif')
  }
  
  if (product.sellingPrice !== undefined && !isPositiveNumber(product.sellingPrice)) {
    errors.push('Le prix de vente doit être un nombre positif')
  }
  
  if (product.stock !== undefined && !isValidNumber(product.stock, 0)) {
    errors.push('Le stock doit être un nombre positif')
  }
  
  if (product.minStock !== undefined && !isValidNumber(product.minStock, 0)) {
    errors.push('Le stock minimum doit être un nombre positif')
  }
  
  if (product.barcode && product.barcode.length > 50) {
    errors.push('Le code-barres ne doit pas dépasser 50 caractères')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize and validate sale data
 */
export function validateSaleData(sale) {
  const errors = []
  
  if (!sale.items || !Array.isArray(sale.items) || sale.items.length === 0) {
    errors.push('La vente doit contenir au moins un article')
  }
  
  if (sale.items) {
    sale.items.forEach((item, index) => {
      if (!item.productName || item.productName.trim().length === 0) {
        errors.push(`L'article ${index + 1} doit avoir un nom`)
      }
      
      if (!isPositiveNumber(item.quantity)) {
        errors.push(`La quantité de l'article ${index + 1} doit être positive`)
      }
      
      if (!isPositiveNumber(item.price)) {
        errors.push(`Le prix de l'article ${index + 1} doit être positif`)
      }
    })
  }
  
  if (sale.paymentMethod && !['especes', 'mobile', 'carte', 'credit'].includes(sale.paymentMethod)) {
    errors.push('Méthode de paiement invalide')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize and validate expense data
 */
export function validateExpenseData(expense) {
  const errors = []
  
  if (!expense.description || typeof expense.description !== 'string' || expense.description.trim().length === 0) {
    errors.push('La description est requise')
  }
  
  if (expense.description && expense.description.length > 500) {
    errors.push('La description ne doit pas dépasser 500 caractères')
  }
  
  if (!isPositiveNumber(expense.amount)) {
    errors.push('Le montant doit être un nombre positif')
  }
  
  if (expense.category && expense.category.length > 100) {
    errors.push('La catégorie ne doit pas dépasser 100 caractères')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize and validate customer data
 */
export function validateCustomerData(customer) {
  const errors = []
  
  if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
    errors.push('Le nom du client est requis')
  }
  
  if (customer.name && customer.name.length > 200) {
    errors.push('Le nom ne doit pas dépasser 200 caractères')
  }
  
  if (customer.phone && customer.phone.length > 20) {
    errors.push('Le numéro de téléphone ne doit pas dépasser 20 caractères')
  }
  
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('L\'email est invalide')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Truncate string to prevent overflow attacks
 */
export function truncateString(str, maxLength) {
  if (typeof str !== 'string') return str
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength)
}

/**
 * Remove potentially dangerous HTML tags
 */
export function stripHtmlTags(input) {
  if (typeof input !== 'string') return input
  return input.replace(/<[^>]*>/g, '')
}
