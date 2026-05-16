import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  DollarSign, ShoppingCart, Package, Users, TrendingUp,
  ArrowRight, ChevronDown, Plus, X, RefreshCw, 
  ArrowUpRight, ArrowDownRight, BarChart3, Trophy
} from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { appStorage } from '../utils/storage'
import { formatDate, formatCurrency } from '../utils/helpers'

// Fonctions pour calculer les périodes
const getToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const getWeekStart = () => {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)
  return weekAgo
}

const getMonthStart = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

const getQuarterStart = () => {
  const today = new Date()
  const quarter = Math.floor(today.getMonth() / 3)
  return new Date(today.getFullYear(), quarter * 3, 1)
}

const getYearStart = () => {
  const today = new Date()
  return new Date(today.getFullYear(), 0, 1)
}

const filterByPeriod = (items, dateField, period) => {
  const now = new Date()
  let startDate

  switch (period) {
    case 'day':
      startDate = getToday()
      break
    case 'week':
      startDate = getWeekStart()
      break
    case 'month':
      startDate = getMonthStart()
      break
    case 'quarter':
      startDate = getQuarterStart()
      break
    case 'year':
      startDate = getYearStart()
      break
    default:
      return items
  }

  return items.filter(item => {
    const itemDate = new Date(item[dateField])
    return itemDate >= startDate && itemDate <= now
  })
}

export default function Dashboard() {
  const { formatCurrency } = useI18n()
  const [salesPeriod, setSalesPeriod] = useState('all')
  const [expensesPeriod, setExpensesPeriod] = useState('all')
  const [customersPeriod, setCustomersPeriod] = useState('all')
  const [showOutOfStockList, setShowOutOfStockList] = useState(false)
  const [salesExpensesMode, setSalesExpensesMode] = useState('sales') // 'sales' ou 'expenses'
  const [topProducts, setTopProducts] = useState([
    { name: 'Produit test 1', quantity: 100, revenue: 50000, rank: 1, percentage: '45.5' },
    { name: 'Produit test 2', quantity: 80, revenue: 40000, rank: 2, percentage: '36.4' },
    { name: 'Produit test 3', quantity: 30, revenue: 15000, rank: 3, percentage: '18.1' }
  ])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    totalProducts: 0,
    totalCustomers: 0,
    uniqueCustomers: 0,
    totalStockValue: 0,
    totalStock: 0,
    outOfStockCount: 0,
    outOfStockProducts: [],
    recentSales: [],
    recentExpenses: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [salesPeriod, expensesPeriod, customersPeriod, salesExpensesMode])

  const loadStats = () => {
    try {
      console.log('Début du chargement des stats...')
      
      const sales = appStorage.getSales() || []
      const expenses = appStorage.getExpenses() || []
      const products = appStorage.getProducts() || []
      const customers = appStorage.getCustomers() || []

      console.log('Données brutes:', { sales: sales.length, expenses: expenses.length, products: products.length, customers: customers.length })

      // Filtrer les ventes selon la période pour le calcul des ventes
      const filteredSales = salesPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', salesPeriod)
      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0)

      // Filtrer les dépenses selon la période
      const filteredExpenses = expensesPeriod === 'all' ? expenses : filterByPeriod(expenses, 'createdAt', expensesPeriod)
      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Filtrer les ventes selon la période pour le calcul des clients uniques
      const filteredSalesForCustomers = customersPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', customersPeriod)
      
      // Calculer les clients uniques (clients qui ont acheté au moins une fois dans la période)
      // Utiliser le nom du client pour dédoublonner, avec fallback sur customerId
      let customerNames = []
      try {
        customerNames = [...new Set(filteredSalesForCustomers.map(sale => {
          // Priorité au nom du client, sinon utiliser l'ID
          return sale.customerName || sale.customerId || 'Anonyme'
        }).filter(name => name && name !== 'Anonyme'))]
      } catch (error) {
        console.error('Erreur dans le calcul des clients:', error)
        customerNames = []
      }
      
      const uniqueCustomers = customerNames.length
      
      // Debug: afficher dans la console
      console.log('Ventes pour clients:', filteredSalesForCustomers)
      console.log('Noms clients uniques:', customerNames)
      console.log('Clients uniques (total):', uniqueCustomers)

      // Calculer la valeur du stock total
      const totalStockValue = products.reduce((sum, product) => {
        try {
          const stock = parseInt(product.stock) || 0
          const price = parseFloat(product.sellingPrice) || 0
          return sum + (stock * price)
        } catch (error) {
          console.error('Erreur calcul stock pour produit:', product, error)
          return sum
        }
      }, 0)
      const totalStock = products.reduce((sum, product) => sum + (parseInt(product.stock) || 0), 0)
      
      // Calculer les produits en rupture de stock
      const outOfStockProducts = products.filter(product => {
        const stock = parseInt(product.stock) || 0
        const minStock = parseInt(product.minStock) || 0
        
        // Est considéré en rupture si:
        // 1. Stock est égal à 0
        // 2. Stock est inférieur ou égal au stock minimum ET minStock > 0
        return stock === 0 || (minStock > 0 && stock <= minStock)
      })
      const outOfStockCount = outOfStockProducts.length
      
      // Debug: afficher dans la console pour les produits
      console.log('Produits:', products.map(p => ({
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        isOutOfStock: (parseInt(p.stock) || 0) === 0 || ((parseInt(p.minStock) || 0) > 0 && (parseInt(p.stock) || 0) <= (parseInt(p.minStock) || 0))
      })))
      console.log('Produits en rupture:', outOfStockProducts.length)

      const recentSales = sales
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)

      const recentExpenses = expenses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)

      // Calculer le top 3 des produits les plus vendus
      const productSales = {}
      sales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const productName = item.productName || 'Produit inconnu'
            if (!productSales[productName]) {
              productSales[productName] = {
                name: productName,
                quantity: 0,
                revenue: 0
              }
            }
            productSales[productName].quantity += parseInt(item.quantity || 0)
            productSales[productName].revenue += parseFloat(item.totalPrice || 0)
          })
        }
      })

      // Trier et prendre le top 3
      const top3Products = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3)
        .map((product, index) => ({
          ...product,
          rank: index + 1,
          percentage: ((product.quantity / Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0)) * 100).toFixed(1)
        }))

      setTopProducts(top3Products)

      setStats({
        totalSales,
        totalExpenses,
        totalProducts: products.length,
        totalCustomers: customers.length,
        uniqueCustomers,
        totalStockValue,
        totalStock,
        outOfStockCount,
        outOfStockProducts,
        recentSales,
        recentExpenses
      })
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.totalSales || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12%',
      changePositive: true,
      hasFilter: false
    },
    {
      title: salesExpensesMode === 'sales' ? 'Ventes' : 'Dépenses',
      value: salesExpensesMode === 'sales' 
        ? formatCurrency(stats.totalSales || 0)
        : formatCurrency(stats.totalExpenses || 0),
      icon: salesExpensesMode === 'sales' ? DollarSign : ShoppingCart,
      color: salesExpensesMode === 'sales' ? 'text-green-600' : 'text-red-600',
      bgColor: salesExpensesMode === 'sales' ? 'bg-green-50' : 'bg-red-50',
      change: salesExpensesMode === 'sales' ? '+12%' : '+8%',
      changePositive: salesExpensesMode === 'sales',
      hasFilter: true,
      filter: salesExpensesMode === 'sales' ? salesPeriod : expensesPeriod,
      setFilter: salesExpensesMode === 'sales' ? setSalesPeriod : setExpensesPeriod,
      hasModeToggle: true,
      mode: salesExpensesMode,
      setMode: setSalesExpensesMode
    },
    {
      title: 'Produits',
      value: formatCurrency(stats.totalStockValue || 0),
      subtitle: `${stats.totalStock} produits`,
      outOfStockCount: stats.outOfStockCount,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+3',
      changePositive: true,
      hasFilter: false
    },
    {
      title: 'Clients',
      value: stats.uniqueCustomers.toString(),
      subtitle: stats.totalCustomers > 0 ? `${stats.totalCustomers} au total` : null,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+5',
      changePositive: true,
      hasFilter: true,
      filter: customersPeriod,
      setFilter: setCustomersPeriod
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500">Vue d'ensemble de votre activité commerciale</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <h1 className="text-4xl text-red-600 font-bold col-span-full">TEST - MODIFICATION VISIBLE?</h1>
        {statCards.map((stat, index) => (
          <div key={index} className={`card p-6 ${stat.outOfStockCount !== undefined ? 'relative' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-2">
                {/* Bouton de bascule pour Ventes/Dépenses */}
                {stat.hasModeToggle && (
                  <button
                    onClick={() => stat.setMode(stat.mode === 'sales' ? 'expenses' : 'sales')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title={`Basculer vers ${stat.mode === 'sales' ? 'Dépenses' : 'Ventes'}`}
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                  </button>
                )}
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.changePositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changePositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {stat.change}
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            <p className="text-sm text-slate-500">{stat.title}</p>
            {stat.subtitle && <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>}
            
            {/* Indicateur de rupture de stock pour les produits */}
            {stat.outOfStockCount !== undefined && (
              <div>
                <button
                  onClick={() => setShowOutOfStockList(!showOutOfStockList)}
                  className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                >
                  ⚠️ {stat.outOfStockCount} en rupture
                </button>
                
                {/* Liste déroulante des produits en rupture */}
                {showOutOfStockList && stat.outOfStockCount > 0 && (
                  <div className="absolute z-10 mt-1 w-64 bg-white border border-red-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-red-700 mb-2 px-2">
                        Produits à approvisionner ({stat.outOfStockCount}) :
                      </div>
                      {stats.outOfStockProducts.map((product) => {
                        const stock = parseInt(product.stock) || 0
                        const minStock = parseInt(product.minStock) || 0
                        return (
                          <div key={product.id} className="px-2 py-1 hover:bg-red-50 rounded cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-xs font-medium text-slate-800">{product.name}</div>
                                <div className={`text-xs ${stock === 0 ? 'text-red-700 font-bold' : 'text-orange-600'}`}>
                                  Stock: {stock} {product.unit || 'unités'}
                                  {minStock > 0 && ` (Min: ${minStock})`}
                                </div>
                              </div>
                              <Link
                                to="/products"
                                onClick={() => setShowOutOfStockList(false)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                Modifier
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Filtre de période pour ventes et dépenses */}
            {stat.hasFilter && (
              <div className="mt-3 flex gap-1">
                <button
                  onClick={() => stat.setFilter('all')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    stat.filter === 'all' 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => stat.setFilter('day')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    stat.filter === 'day' 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => stat.setFilter('week')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    stat.filter === 'week' 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => stat.setFilter('month')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    stat.filter === 'month' 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mois
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Test Simple Histogram */}
      <div className="card p-6 bg-red-100 border-2 border-red-500">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">TEST HISTOGRAMME</h3>
        <div className="space-y-2">
          <div className="p-4 bg-yellow-200 rounded">Produit 1: 100 unités</div>
          <div className="p-4 bg-blue-200 rounded">Produit 2: 80 unités</div>
          <div className="p-4 bg-green-200 rounded">Produit 3: 30 unités</div>
        </div>
        <p className="text-sm text-red-600 mt-4">Si vous voyez ceci, l'histogramme fonctionne!</p>
      </div>

      {/* Top 3 Products Histogram */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Top 3 Produits</h3>
              <p className="text-sm text-slate-500">Les produits les plus vendus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BarChart3 size={16} />
            <span>Quantités vendues</span>
          </div>
        </div>

        {topProducts.length > 0 ? (
          <div className="space-y-4">
            {topProducts.map((product, index) => {
              const maxQuantity = Math.max(...topProducts.map(p => p.quantity))
              const barWidth = maxQuantity > 0 ? (product.quantity / maxQuantity) * 100 : 0
              const colors = [
                'from-yellow-400 to-orange-500',
                'from-blue-400 to-indigo-500', 
                'from-green-400 to-emerald-500'
              ]
              
              return (
                <div 
                  key={product.name}
                  className="group relative"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.transition = 'transform 0.2s ease'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {product.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h4>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{product.quantity} unités</p>
                          <p className="text-xs text-slate-500">{formatCurrency(product.revenue)}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${colors[index]} rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${barWidth}%` }}
                          >
                            {barWidth > 15 && (
                              <span className="text-white text-xs font-semibold drop-shadow">
                                {product.percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                        {barWidth <= 15 && (
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2">
                            <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded shadow">
                              {product.percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Tooltip au survol */}
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl whitespace-nowrap">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm">Quantité: {product.quantity}</p>
                      <p className="text-sm">Revenu: {formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-slate-300 mt-1">{product.percentage}% des ventes totales</p>
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Légende */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Total des ventes analysées</span>
                <span className="font-semibold text-slate-700">
                  {topProducts.reduce((sum, p) => sum + p.quantity, 0)} unités
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500">Aucune vente enregistrée</p>
            <p className="text-sm text-slate-400 mt-1">Les données apparaîtront ici après vos premières ventes</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Ventes récentes</h3>
          <div className="space-y-3">
            {stats.recentSales && stats.recentSales.length > 0 ? (
              stats.recentSales.map((sale, index) => (
                <div key={sale.id || index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{sale.customerName}</p>
                    <p className="text-sm text-slate-500">{formatDate(new Date(sale.createdAt))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(sale.total)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">Aucune vente récente</p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Dépenses récentes</h3>
          <div className="space-y-3">
            {stats.recentExpenses && stats.recentExpenses.length > 0 ? (
              stats.recentExpenses.map((expense, index) => (
                <div key={expense.id || index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{expense.category}</p>
                    <p className="text-sm text-slate-500">{formatDate(new Date(expense.createdAt))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">Aucune dépense récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
