import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown,
  ArrowRight, ChevronDown, Plus, X, RefreshCw, 
  ArrowUpRight, ArrowDownRight, BarChart3, Trophy
} from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { appStorage, appCache } from '../utils/storage'
import { useProductsRealtime, useSalesRealtime, useExpensesRealtime } from '../hooks/useRealtime.jsx'
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

  switch(period) {
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
    const itemDate = new Date(item[dateField] || item.created_at || item.date)
    return itemDate >= startDate && itemDate <= now
  })
}

const getCachedDashboardData = () => {
  return {
    sales: appCache.getSales(),
    expenses: appCache.getExpenses(),
    products: appCache.getProducts(),
    customers: appCache.getCustomers()
  }
}

const buildDashboardSnapshot = (
  { sales = [], expenses = [], products = [], customers = [] },
  { salesPeriod = 'all', expensesPeriod = 'all', customersPeriod = 'all', debtPeriod = 'all' },
  selectedWeek = new Date()
) => {
  const filteredSales = salesPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', salesPeriod)
  const totalSales = filteredSales.reduce((sum, sale) => {
    const paymentMethod = sale.paymentMethod || sale.payment_method
    const paidAmount = parseFloat(sale.paidAmount || sale.paid_amount || 0) || 0
    const totalAmount = parseFloat(sale.total || 0) || 0

    if (paymentMethod === 'credit') {
      return sum + paidAmount
    }
    return sum + totalAmount
  }, 0)

  const filteredExpenses = expensesPeriod === 'all' ? expenses : filterByPeriod(expenses, 'date', expensesPeriod)
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)

  const filteredDebtSales = debtPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', debtPeriod)
  const totalDebt = filteredDebtSales
    .filter(sale => {
      const paymentMethod = sale.paymentMethod || sale.payment_method
      if (paymentMethod !== 'credit') return false
      const remainingAmount = parseFloat(sale.remainingAmount || sale.remaining_amount || (parseFloat(sale.total || 0) - parseFloat(sale.paidAmount || sale.paid_amount || 0))) || 0
      return remainingAmount > 0
    })
    .reduce((sum, sale) => {
      const remainingAmount = parseFloat(sale.remainingAmount || sale.remaining_amount || (parseFloat(sale.total || 0) - parseFloat(sale.paidAmount || sale.paid_amount || 0))) || 0
      return sum + remainingAmount
    }, 0)

  const filteredSalesForCustomers = customersPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', customersPeriod)
  const uniqueCustomers = [...new Set(filteredSalesForCustomers.map(sale => {
    return sale.customer_name || sale.customerName || sale.customerId || 'Anonyme'
  }).filter(name => name && name !== 'Anonyme'))].length

  const totalStockValue = products.reduce((sum, product) => {
    const stock = parseInt(product.stock) || 0
    const price = parseFloat(product.selling_price) || 0
    return sum + (stock * price)
  }, 0)
  const totalStock = products.reduce((sum, product) => sum + (parseInt(product.stock) || 0), 0)

  const outOfStockProducts = products.filter(product => {
    const stock = parseInt(product.stock) || 0
    const minStock = parseInt(product.min_stock) || 0
    return stock === 0 || (minStock > 0 && stock <= minStock)
  })
  const outOfStockCount = outOfStockProducts.length

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
    .slice(0, 5)

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const productSales = {}
  sales.forEach(sale => {
    if (!sale.items || !Array.isArray(sale.items)) return

    sale.items.forEach(item => {
      const productName = item.productName || item.product_name || 'Produit inconnu'
      if (!productSales[productName]) {
        productSales[productName] = {
          name: productName,
          quantity: 0,
          revenue: 0
        }
      }
      productSales[productName].quantity += parseInt(item.quantity || 0)
      productSales[productName].revenue += parseFloat(item.totalPrice || item.total_price || 0) || 0
    })
  })

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3)
    .map((product, index, all) => ({
      ...product,
      rank: index + 1,
      percentage: all.length === 0 ? '0.0' : ((product.quantity / all.reduce((sum, p) => sum + p.quantity, 0)) * 100).toFixed(1)
    }))

  const weekStart = new Date(selectedWeek)
  const dayOfWeek = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const salesEvolution = []

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)

    const daySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at || sale.createdAt)
      if (Number.isNaN(saleDate.getTime())) return false
      return saleDate.getFullYear() === date.getFullYear() &&
        saleDate.getMonth() === date.getMonth() &&
        saleDate.getDate() === date.getDate()
    })

    const dayTotal = daySales.reduce((sum, sale) => sum + (parseFloat(sale.total || 0) || 0), 0)
    salesEvolution.push({
      date,
      dateStr: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      dayName: days[i],
      total: dayTotal,
      count: daySales.length
    })
  }

  return {
    stats: {
      totalSales,
      totalExpenses,
      totalDebt,
      totalProducts: products.length,
      totalCustomers: customers.length,
      uniqueCustomers,
      totalStockValue,
      totalStock,
      outOfStockCount,
      outOfStockProducts,
      recentSales,
      recentExpenses
    },
    topProducts,
    salesEvolution
  }
}

export default function Dashboard() {
  const { formatCurrency, currency, language, t } = useI18n()
  const [salesPeriod, setSalesPeriod] = useState('all')
  const [expensesPeriod, setExpensesPeriod] = useState('all')
  const [customersPeriod, setCustomersPeriod] = useState('all')
  const [debtPeriod, setDebtPeriod] = useState('all')
  const [salesExpensesMode, setSalesExpensesMode] = useState('sales')
  const [customersDebtMode, setCustomersDebtMode] = useState('customers')
  const [showOutOfStockDropdown, setShowOutOfStockDropdown] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const cachedData = getCachedDashboardData()
  const initialSnapshot = buildDashboardSnapshot(cachedData, {
    salesPeriod,
    expensesPeriod,
    customersPeriod,
    debtPeriod
  }, selectedWeek)

  const [sales, setSales] = useState(cachedData.sales)
  const [expenses, setExpenses] = useState(cachedData.expenses)
  const [products, setProducts] = useState(cachedData.products)
  const [customers, setCustomers] = useState(cachedData.customers)
  const [topProducts, setTopProducts] = useState(initialSnapshot.topProducts)
  const [salesEvolution, setSalesEvolution] = useState(initialSnapshot.salesEvolution)
  const [stats, setStats] = useState(initialSnapshot.stats)
  const [loading, setLoading] = useState(() => {
    return !(cachedData.sales.length || cachedData.expenses.length || cachedData.products.length || cachedData.customers.length)
  })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadStats()
  }, [salesPeriod, expensesPeriod, customersPeriod, debtPeriod, salesExpensesMode, customersDebtMode, currency, language, selectedWeek])

  // Écouter les changements en temps réel sur les produits, ventes et dépenses
  useProductsRealtime(() => loadStats())
  useSalesRealtime(() => loadStats())
  useExpensesRealtime(() => loadStats())

  // Fermer la liste déroulante quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOutOfStockDropdown && !event.target.closest('.out-of-stock-dropdown')) {
        setShowOutOfStockDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showOutOfStockDropdown])

  const loadStats = async () => {
    const hasCachedData = sales.length || expenses.length || products.length || customers.length
    try {
      if (hasCachedData) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [nextSales, nextExpenses, nextProducts, nextCustomers] = await Promise.all([
        appStorage.getSales(),
        appStorage.getExpenses(),
        appStorage.getProducts(),
        appStorage.getCustomers()
      ])

      const nextSnapshot = buildDashboardSnapshot({
        sales: nextSales,
        expenses: nextExpenses,
        products: nextProducts,
        customers: nextCustomers
      }, {
        salesPeriod,
        expensesPeriod,
        customersPeriod,
        debtPeriod
      }, selectedWeek)

      setSales(nextSales)
      setExpenses(nextExpenses)
      setProducts(nextProducts)
      setCustomers(nextCustomers)
      setTopProducts(nextSnapshot.topProducts)
      setSalesEvolution(nextSnapshot.salesEvolution)
      setStats(nextSnapshot.stats)
    } catch (error) {
      console.error('Dashboard: Erreur de chargement:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const cards = [
    {
      title: t('revenue'),
      value: formatCurrency(stats.totalSales || 0),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-400',
      shadowColor: 'shadow-emerald-500/30',
      change: '+12%',
      changePositive: true,
      hasFilter: false
    },
    {
      title: salesExpensesMode === 'sales' ? t('sales') : t('expenses'),
      value: salesExpensesMode === 'sales'
        ? formatCurrency(stats.totalSales || 0)
        : formatCurrency(stats.totalExpenses || 0),
      icon: salesExpensesMode === 'sales' ? TrendingUp : TrendingDown,
      gradient: salesExpensesMode === 'sales' ? 'from-green-500 to-emerald-400' : 'from-red-500 to-rose-400',
      shadowColor: salesExpensesMode === 'sales' ? 'shadow-green-500/30' : 'shadow-red-500/30',
      change: salesExpensesMode === 'sales' ? '+12%' : '-8%',
      changePositive: salesExpensesMode === 'sales',
      hasFilter: true,
      filter: salesExpensesMode === 'sales' ? salesPeriod : expensesPeriod,
      setFilter: salesExpensesMode === 'sales' ? setSalesPeriod : setExpensesPeriod,
      hasModeToggle: true,
      mode: salesExpensesMode,
      setMode: setSalesExpensesMode
    },
    {
      title: t('productsCard'),
      value: stats.totalProducts.toString(),
      subtitle: `${t('stockValue')}: ${formatCurrency(stats.totalStockValue)}`,
      icon: Package,
      gradient: 'from-blue-500 to-indigo-400',
      shadowColor: 'shadow-blue-500/30',
      change: '+3',
      changePositive: true,
      hasFilter: false,
      outOfStockCount: stats.outOfStockCount,
      outOfStockProducts: stats.outOfStockProducts
    },
    {
      title: customersDebtMode === 'customers' ? t('customersCard') : 'Dette en cours',
      value: customersDebtMode === 'customers'
        ? stats.uniqueCustomers.toString()
        : formatCurrency(stats.totalDebt || 0),
      subtitle: customersDebtMode === 'customers' && stats.totalCustomers > 0 ? `${stats.totalCustomers} au total` : null,
      icon: customersDebtMode === 'customers' ? Users : DollarSign,
      gradient: customersDebtMode === 'customers' ? 'from-violet-500 to-purple-400' : 'from-orange-500 to-amber-400',
      shadowColor: customersDebtMode === 'customers' ? 'shadow-violet-500/30' : 'shadow-orange-500/30',
      change: customersDebtMode === 'customers' ? '+5' : '-5%',
      changePositive: customersDebtMode === 'customers',
      hasFilter: true,
      filter: customersDebtMode === 'customers' ? customersPeriod : debtPeriod,
      setFilter: customersDebtMode === 'customers' ? setCustomersPeriod : setDebtPeriod,
      hasModeToggle: true,
      mode: customersDebtMode,
      setMode: setCustomersDebtMode
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500">Vue d'ensemble de votre activité commerciale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, index) => (
          <div key={index} className={`relative group bg-white rounded-2xl p-6 shadow-lg ${stat.shadowColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 ${stat.outOfStockCount !== undefined ? 'relative out-of-stock-dropdown' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadowColor}`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {stat.hasModeToggle && (
                  <button
                    onClick={() => {
                      if (stat.mode === 'sales' || stat.mode === 'expenses') {
                        stat.setMode(stat.mode === 'sales' ? 'expenses' : 'sales')
                      } else if (stat.mode === 'customers' || stat.mode === 'debt') {
                        stat.setMode(stat.mode === 'customers' ? 'debt' : 'customers')
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all duration-200 shadow-sm"
                    title={`Basculer vers ${
                      stat.mode === 'sales' ? 'Dépenses' :
                      stat.mode === 'expenses' ? 'Ventes' :
                      stat.mode === 'customers' ? 'Dette en cours' : 'Clients'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                  </button>
                )}
                <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${
                  stat.changePositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stat.changePositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {stat.change}
                </div>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</h3>
            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            {stat.subtitle && <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>}
            
            {stat.outOfStockCount !== undefined && stat.outOfStockCount > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowOutOfStockDropdown(!showOutOfStockDropdown)}
                  className="mt-3 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-medium rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md shadow-red-500/30"
                >
                  ⚠️ {stat.outOfStockCount} {t('outOfStock')}
                </button>
                
                {showOutOfStockDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-red-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-red-700">{t('outOfStockProducts')}</h4>
                        <button 
                          onClick={() => setShowOutOfStockDropdown(false)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {stats.outOfStockProducts.length > 0 ? (
                          stats.outOfStockProducts.map((product, index) => (
                            <div key={index} className="px-3 py-2 hover:bg-red-50 border-b border-red-50 last:border-b-0 rounded-xl transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-slate-800 text-sm">{product.name}</div>
                                  <div className="text-xs text-slate-500">
                                    Stock: {product.stock || 0} | Min: {product.minStock || 0}
                                  </div>
                                </div>
                                <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                  {product.stock === 0 ? 'Rupture' : 'Stock faible'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-slate-500 text-sm">
                            {t('noOutOfStock')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {stat.hasFilter && (
              <div className="mt-4 flex gap-1.5 flex-wrap">
                {['all', 'day', 'week', 'month'].map(period => (
                  <button
                    key={period}
                    onClick={() => stat.setFilter(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                      stat.filter === period
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {period === 'all' ? t('all') : period === 'day' ? t('day') : period === 'week' ? t('week') : t('month')}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Products Histogram - Vertical */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
                <Trophy size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{t('top3Products')}</h3>
                <p className="text-sm text-slate-500">{t('mostSoldProducts')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BarChart3 size={16} />
              <span>{t('quantitiesSold')}</span>
            </div>
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-end justify-center h-64 px-4 gap-4">
                {topProducts.map((product, index) => {
                  const maxQuantity = Math.max(...topProducts.map(p => p.quantity))
                  const barHeight = maxQuantity > 0 ? (product.quantity / maxQuantity) * 100 : 0
                  
                  // Couleurs dégradées pour les 3 premiers (médailles)
                  const colors = [
                    'from-yellow-400 to-orange-500',    // 1er - or
                    'from-gray-300 to-gray-400',         // 2ème - argent
                    'from-orange-600 to-orange-700'     // 3ème - bronze
                  ]
                  
                  return (
                    <div 
                      key={product.name}
                      className="group relative flex flex-col items-center flex-1"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)'
                        e.currentTarget.style.transition = 'transform 0.3s ease'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      }}
                    >
                      {/* Pourcentage au-dessus de la barre */}
                      <div className="mb-2 text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                        {product.percentage}%
                      </div>
                      
                      {/* Barre verticale fine */}
                      <div className="relative w-full flex flex-col items-center">
                        {/* Conteneur de la barre */}
                        <div className="w-full bg-slate-200 rounded-t-lg overflow-hidden relative shadow-inner" style={{ height: '180px', maxWidth: '48px' }}>
                          <div 
                            className={`absolute bottom-0 w-full bg-gradient-to-t ${colors[index]} transition-all duration-1500 ease-out flex items-center justify-center pt-2 shadow-lg`}
                            style={{ height: `${barHeight}%` }}
                          >
                            {barHeight > 20 && (
                              <span className="text-white text-xs font-bold drop-shadow-lg">
                                {product.quantity}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Badge du rang */}
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center text-white font-bold text-xs shadow-lg -mt-3 border-2 border-white`}>
                          {product.rank}
                        </div>
                      </div>
                      
                      {/* Nom du produit */}
                      <div className="mt-3 text-center">
                        <h4 className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors leading-tight max-w-[100px] truncate" title={product.name}>
                          {product.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                      
                      {/* Tooltip au survol */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-2xl whitespace-nowrap text-sm border border-slate-700">
                          <p className="font-bold text-yellow-400 mb-1">{product.name}</p>
                          <p className="text-xs">📦 Quantité: <span className="font-semibold">{product.quantity}</span></p>
                          <p className="text-xs">💰 Revenu: <span className="font-semibold">{formatCurrency(product.revenue)}</span></p>
                          <p className="text-xs text-slate-300 mt-1">{product.percentage}% des ventes</p>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-900 rotate-45 border-r border-t border-slate-700"></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Légende améliorée */}
              <div className="mt-6 pt-4 border-t border-slate-200 bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">📊 Total des ventes analysées</span>
                  <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-full shadow-sm">
                    {topProducts.reduce((sum, p) => sum + p.quantity, 0)} unités
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-600 font-medium">💰 Revenu total</span>
                  <span className="font-bold text-green-600 bg-white px-3 py-1 rounded-full shadow-sm">
                    {formatCurrency(topProducts.reduce((sum, p) => sum + p.revenue, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-500">{t('searchSales')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('dataWillAppear')}</p>
            </div>
          )}
        </div>

        {/* Sales Evolution Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{t('salesEvolution')}</h3>
                <p className="text-sm text-slate-500">
                  Semaine du {salesEvolution[0]?.dateStr} au {salesEvolution[6]?.dateStr}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newWeek = new Date(selectedWeek)
                  newWeek.setDate(newWeek.getDate() - 7)
                  setSelectedWeek(newWeek)
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Semaine précédente"
              >
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <button
                onClick={() => setSelectedWeek(new Date())}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => {
                  const newWeek = new Date(selectedWeek)
                  newWeek.setDate(newWeek.getDate() + 7)
                  setSelectedWeek(newWeek)
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Semaine suivante"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {salesEvolution.length > 0 ? (
            <div className="space-y-4">
              {/* Graphique en barres */}
              <div className="h-56 relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-between px-2 pb-8">
                  {salesEvolution.map((day, index) => {
                    const maxTotal = Math.max(...salesEvolution.map(d => d.total))
                    const barHeight = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0
                    
                    // Couleur selon la performance
                    let barColor = 'from-blue-400 to-blue-600'
                    if (day.total > 0) {
                      const avgTotal = salesEvolution.reduce((sum, d) => sum + d.total, 0) / salesEvolution.filter(d => d.total > 0).length
                      if (day.total > avgTotal * 1.2) {
                        barColor = 'from-green-400 to-green-600'
                      } else if (day.total < avgTotal * 0.8) {
                        barColor = 'from-red-400 to-red-600'
                      }
                    }
                    
                    return (
                      <div 
                        key={index}
                        className="group relative flex flex-col items-center flex-1 mx-0.5"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                          e.currentTarget.style.transition = 'transform 0.3s ease'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        }}
                      >
                        {/* Bâton */}
                        <div className="flex justify-center items-end w-full" style={{ height: '180px' }}>
                          <div 
                            className={`w-8 lg:w-12 bg-gradient-to-t ${barColor} transition-all duration-1500 ease-out rounded-t-lg shadow-lg flex items-center justify-center pt-2`}
                            style={{ height: `${barHeight}%`, minHeight: '4px' }}
                          >
                            {barHeight > 20 && (
                              <span className="text-white text-[10px] lg:text-xs font-bold drop-shadow-lg">
                                {formatCurrency(day.total)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Nom du jour */}
                        <div className="mt-2 text-center">
                          <p className="text-[10px] lg:text-xs font-bold text-slate-700 bg-white px-1 lg:px-2 py-1 rounded-full shadow-sm">
                            {day.dayName}
                          </p>
                          <p className="text-[8px] lg:text-[10px] text-slate-500">{day.dateStr}</p>
                        </div>
                        
                        {/* Tooltip au survol */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-2xl whitespace-nowrap text-sm border border-slate-700">
                            <p className="font-bold text-purple-400 mb-1">{day.dayName} - {day.dateStr}</p>
                            <p className="text-xs">📈 {t('sales')}: <span className="font-semibold">{day.count}</span></p>
                            <p className="text-xs">💰 {t('total')}: <span className="font-semibold">{formatCurrency(day.total)}</span></p>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-900 rotate-45 border-r border-t border-slate-700"></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Ligne zéro */}
                <div className="absolute bottom-8 left-0 right-0 h-px bg-slate-300"></div>
              </div>
              
              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total semaine</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(salesEvolution.reduce((sum, d) => sum + d.total, 0))}
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Moyenne/jour</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(salesEvolution.length > 0 ? salesEvolution.reduce((sum, d) => sum + d.total, 0) / salesEvolution.length : 0)}
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Meilleur jour</p>
                  <p className="text-lg font-bold text-green-600">
                    {salesEvolution.length > 0 ? formatCurrency(Math.max(...salesEvolution.map(d => d.total))) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-500">{t('noSalesRecorded')}</p>
              <p className="text-sm text-slate-400 mt-2">{t('dataWillAppear')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
