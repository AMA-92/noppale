// Système de stockage local pour Noppalé
// Utilise localStorage pour la persistance des données

class LocalStorage {
  constructor() {
    this.prefix = 'noppale_'
  }

  // Récupérer une clé avec préfixe
  getKey(key) {
    return `${this.prefix}${key}`
  }

  // Sauvegarder des données
  set(key, data) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }
      const value = JSON.stringify(data)
      localStorage.setItem(this.getKey(key), value)
      return true
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      return false
    }
  }

  // Récupérer des données
  get(key, defaultValue = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return defaultValue
      }
      const value = localStorage.getItem(this.getKey(key))
      return value ? JSON.parse(value) : defaultValue
    } catch (error) {
      console.error('Erreur lors de la lecture:', error)
      return defaultValue
    }
  }

  // Supprimer des données
  remove(key) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }
      localStorage.removeItem(this.getKey(key))
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      return false
    }
  }

  // Vider toutes les données Noppalé
  clear() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key))
      return true
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
      return false
    }
  }

  // Vérifier si une clé existe
  exists(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    return localStorage.getItem(this.getKey(key)) !== null
  }
}

// Instance unique du stockage
const storage = new LocalStorage()

// Gestion des utilisateurs
export const usersStorage = {
  // Obtenir tous les utilisateurs
  getUsers() {
    return storage.get('users', [])
  },

  // Définir la liste des utilisateurs
  setUsers(users) {
    return storage.set('users', users)
  },

  // Ajouter un utilisateur
  addUser(user) {
    const users = this.getUsers()
    const newUser = {
      id: Date.now().toString(),
      email: user.email,
      password: user.password, // En production, il faudrait hasher ce mot de passe
      name: user.name || user.email.split('@')[0],
      createdAt: new Date().toISOString(),
      ...user
    }
    users.push(newUser)
    storage.set('users', users)
    return newUser
  },

  // Trouver un utilisateur par email
  findUserByEmail(email) {
    const users = this.getUsers()
    return users.find(user => user.email === email)
  },

  // Vérifier les identifiants
  authenticate(email, password) {
    const user = this.findUserByEmail(email)
    if (user && user.password === password) {
      // Retourner l'utilisateur sans le mot de passe
      const { password: _, ...userWithoutPassword } = user
      return userWithoutPassword
    }
    return null
  },

  // Mettre à jour un utilisateur
  updateUser(userId, updates) {
    const users = this.getUsers()
    const index = users.findIndex(user => user.id === userId)
    if (index !== -1) {
      users[index] = { ...users[index], ...updates }
      storage.set('users', users)
      return users[index]
    }
    return null
  }
}

// Gestion de l'authentification
export const authStorage = {
  // Sauvegarder l'utilisateur connecté
  setCurrentUser(user) {
    storage.set('currentUser', user)
  },

  // Obtenir l'utilisateur connecté
  getCurrentUser() {
    return storage.get('currentUser')
  },

  // Déconnexion
  logout() {
    storage.remove('currentUser')
  },

  // Vérifier si un utilisateur est connecté
  isAuthenticated() {
    return this.getCurrentUser() !== null
  }
}

// Gestion des données de l'application
export const appStorage = {
  // Produits
  getProducts() {
    return storage.get('products', [])
  },

  setProducts(products) {
    return storage.set('products', products)
  },

  addProduct(product) {
    const products = this.getProducts()
    const newProduct = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...product
    }
    products.push(newProduct)
    this.setProducts(products)
    return newProduct
  },

  saveProducts(products) {
    return this.setProducts(products)
  },

  // Clients
  getCustomers() {
    return storage.get('customers', [])
  },

  setCustomers(customers) {
    return storage.set('customers', customers)
  },

  addCustomer(customer) {
    const customers = this.getCustomers()
    const newCustomer = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...customer
    }
    customers.push(newCustomer)
    this.setCustomers(customers)
    return newCustomer
  },

  // Ventes
  getSales() {
    return storage.get('sales', [])
  },

  setSales(sales) {
    return storage.set('sales', sales)
  },

  addSale(sale) {
    const sales = this.getSales()
    const newSale = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...sale
    }
    sales.push(newSale)
    this.setSales(sales)
    return newSale
  },

  saveSales(sales) {
    return this.setSales(sales)
  },

  // Dépenses
  getExpenses() {
    return storage.get('expenses', [])
  },

  setExpenses(expenses) {
    return storage.set('expenses', expenses)
  },

  addExpense(expense) {
    const expenses = this.getExpenses()
    const newExpense = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...expense
    }
    expenses.push(newExpense)
    this.setExpenses(expenses)
    return newExpense
  },

  updateExpense(id, updates) {
    const expenses = this.getExpenses()
    const index = expenses.findIndex(e => e.id === id)
    if (index === -1) throw new Error('Dépense non trouvée')
    
    expenses[index] = { ...expenses[index], ...updates }
    this.setExpenses(expenses)
    return expenses[index]
  },

  deleteExpense(id) {
    const expenses = this.getExpenses()
    const filteredExpenses = expenses.filter(e => e.id !== id)
    this.setExpenses(filteredExpenses)
    return true
  },

  // Informations de la boutique
  getShopInfo() {
    return storage.get('shopInfo', {
      name: '',
      address: '',
      phone: '',
      email: '',
      logo: ''
    })
  },

  setShopInfo(shopInfo) {
    return storage.set('shopInfo', shopInfo)
  },

  updateShopInfo(updates) {
    const currentInfo = this.getShopInfo()
    const updatedInfo = { ...currentInfo, ...updates }
    this.setShopInfo(updatedInfo)
    return updatedInfo
  }
}

export default storage
