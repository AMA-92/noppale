import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown,
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
    const itemDate = new Date(item[dateField])
    return itemDate >= startDate && itemDate <= now
  })
}

export default function Dashboard() {
  const { formatCurrency, currency, language, t } = useI18n()
  const [salesPeriod, setSalesPeriod] = useState('all')
  const [expensesPeriod, setExpensesPeriod] = useState('all')
  const [customersPeriod, setCustomersPeriod] = useState('all')
  const [salesExpensesMode, setSalesExpensesMode] = useState('sales')
  const [showOutOfStockDropdown, setShowOutOfStockDropdown] = useState(false)
  const [topProducts, setTopProducts] = useState([])
  const [salesEvolution, setSalesEvolution] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(new Date())
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
  }, [salesPeriod, expensesPeriod, customersPeriod, salesExpensesMode, currency, language, selectedWeek])

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

  const loadStats = () => {
    try {
      console.log('Dashboard: Début du chargement...')
      
      const sales = appStorage.getSales() || []
      const expenses = appStorage.getExpenses() || []
      const products = appStorage.getProducts() || []
      const customers = appStorage.getCustomers() || []

      console.log('Dashboard: Données chargées', { 
        sales: sales.length, 
        expenses: expenses.length, 
        products: products.length, 
        customers: customers.length 
      })

      // Filtrer les ventes selon la période pour le calcul des ventes
      const filteredSales = salesPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', salesPeriod)
      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0)

      // Filtrer les dépenses selon la période
      const filteredExpenses = expensesPeriod === 'all' ? expenses : filterByPeriod(expenses, 'createdAt', expensesPeriod)
      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Filtrer les ventes selon la période pour le calcul des clients uniques
      const filteredSalesForCustomers = customersPeriod === 'all' ? sales : filterByPeriod(sales, 'createdAt', customersPeriod)
      
      // Calculer les clients uniques
      let customerNames = []
      try {
        customerNames = [...new Set(filteredSalesForCustomers.map(sale => {
          return sale.customerName || sale.customerId || 'Anonyme'
        }).filter(name => name && name !== 'Anonyme'))]
      } catch (error) {
        console.error('Erreur dans le calcul des clients:', error)
        customerNames = []
      }
      
      const uniqueCustomers = customerNames.length

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
        return stock === 0 || (minStock > 0 && stock <= minStock)
      })
      const outOfStockCount = outOfStockProducts.length

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

      // Calculer l'évolution des ventes pour la semaine sélectionnée (7 jours)
      const evolutionData = []
      const weekStart = new Date(selectedWeek)
      const dayOfWeek = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)

      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

      // Générer les données pour les 7 jours de la semaine
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        nextDate.setHours(23, 59, 59, 999)

        // Filtrer les ventes pour cette journée
        const daySales = sales.filter(sale => {
          const saleDate = new Date(sale.createdAt)
          return saleDate >= date && saleDate <= nextDate
        })

        const dayTotal = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0)

        evolutionData.push({
          date: date,
          dateStr: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          dayName: days[i],
          total: dayTotal,
          count: daySales.length
        })
      }

      setSalesEvolution(evolutionData)

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
      console.error('Dashboard: Erreur de chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: t('revenue'),
      value: formatCurrency(stats.totalSales || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
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
      color: salesExpensesMode === 'sales' ? 'text-green-600' : 'text-red-600',
      bgColor: salesExpensesMode === 'sales' ? 'bg-green-50' : 'bg-red-50',
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+3',
      changePositive: true,
      hasFilter: false,
      outOfStockCount: stats.outOfStockCount,
      outOfStockProducts: stats.outOfStockProducts
    },
    {
      title: t('customersCard'),
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
          <div key={index} className={`card p-6 ${stat.outOfStockCount !== undefined ? 'relative out-of-stock-dropdown' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-2">
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
                  <ArrowUpRight size={16} />
                  {stat.change}
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            <p className="text-sm text-slate-500">{stat.title}</p>
            {stat.subtitle && <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>}
            
            {stat.outOfStockCount !== undefined && stat.outOfStockCount > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowOutOfStockDropdown(!showOutOfStockDropdown)}
                  className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                >
                  ⚠️ {stat.outOfStockCount} {t('outOfStock')}
                </button>
                
                {showOutOfStockDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div className="p-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-800">{t('outOfStockProducts')}</h4>
                        <button 
                          onClick={() => setShowOutOfStockDropdown(false)}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {stats.outOfStockProducts.length > 0 ? (
                        stats.outOfStockProducts.map((product, index) => (
                          <div key={index} className="px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-slate-800 text-sm">{product.name}</div>
                                <div className="text-xs text-slate-500">
                                  Stock: {product.stock || 0} | Min: {product.minStock || 0}
                                </div>
                              </div>
                              <div className="text-xs text-red-600 font-medium">
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
                )}
              </div>
            )}
            
            {stat.hasFilter && (
              <div className="mt-3 flex gap-1">
                {['all', 'day', 'week', 'month'].map(period => (
                  <button
                    key={period}
                    onClick={() => stat.setFilter(period)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      stat.filter === period
                        ? 'bg-blue-600 text-white'
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
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-8">
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
                        className="group relative flex flex-col items-center flex-1 mx-1"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                          e.currentTarget.style.transition = 'transform 0.3s ease'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        }}
                      >
                        {/* Bâton */}
                        <div className="flex justify-center items-end w-full" style={{ height: '140px' }}>
                          <div 
                            className={`w-12 bg-gradient-to-t ${barColor} transition-all duration-1500 ease-out rounded-t-lg shadow-lg`}
                            style={{ height: `${barHeight}%`, minHeight: '4px' }}
                          >
                          </div>
                        </div>
                        
                        {/* Nom du jour */}
                        <div className="mt-2 text-center">
                          <p className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                            {day.dayName}
                          </p>
                          <p className="text-[10px] text-slate-500">{day.dateStr}</p>
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
