import React, { useState, useEffect } from 'react'
import { appStorage } from '../utils/storage'
import { useI18n } from '../hooks/useI18n'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, FileText, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

// Fonctions pour calculer les périodes
const getToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const getWeekStart = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
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

export default function Reports() {
  const { formatCurrency } = useI18n()
  const [period, setPeriod] = useState('month')
  const [reportType, setReportType] = useState('sales') // 'sales', 'expenses', 'balance'
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = () => {
    try {
      console.log('Reports: Début du chargement...')
      setLoading(true)
      setError(null)
      
      const allSales = appStorage.getSales() || []
      const allExpenses = appStorage.getExpenses() || []
      const allProducts = appStorage.getProducts() || []

      console.log('Reports: Données brutes', { 
        sales: allSales.length, 
        expenses: allExpenses.length, 
        products: allProducts.length 
      })

      const filteredSales = filterByPeriod(allSales, 'createdAt', period)
      const filteredExpenses = filterByPeriod(allExpenses, 'createdAt', period)

      console.log('Reports: Données filtrées', { 
        sales: filteredSales.length, 
        expenses: filteredExpenses.length 
      })

      setSales(filteredSales)
      setExpenses(filteredExpenses)
      setProducts(allProducts)
    } catch (error) {
      console.error('Reports: Erreur de chargement:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const calculateSalesTotals = () => {
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalCost = sales.reduce((sum, sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        return sum + sale.items.reduce((itemSum, item) => {
          const purchasePrice = item.purchasePrice || 0
          const quantity = item.quantity || 1
          return itemSum + (purchasePrice * quantity)
        }, 0)
      }
      return sum
    }, 0)
    
    return {
      totalSales,
      totalCost,
      grossProfit: totalSales - totalCost,
      netProfit: totalSales - totalCost - expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    }
  }

  const calculateExpensesTotals = () => {
    return {
      totalExpenses: expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
      count: expenses.length
    }
  }

  const calculateBalance = () => {
    const salesData = calculateSalesTotals()
    const expensesData = calculateExpensesTotals()
    
    return {
      totalSales: salesData.totalSales,
      totalCost: salesData.totalCost,
      totalExpenses: expensesData.totalExpenses,
      grossProfit: salesData.totalSales - salesData.totalCost,
      netProfit: salesData.totalSales - salesData.totalCost - expensesData.totalExpenses,
      salesCount: sales.length,
      expensesCount: expenses.length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Erreur</div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapports</h1>
        <p className="text-slate-500">Analysez vos performances commerciales</p>
      </div>

      {/* Filtre et boutons de rapport */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Filtre de période */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
        </div>

        {/* Boutons de rapport */}
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('sales')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'sales'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Rapport ventes
          </button>
          <button
            onClick={() => setReportType('expenses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'expenses'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Rapport dépenses
          </button>
          <button
            onClick={() => setReportType('balance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'balance'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Bilan
          </button>
        </div>
      </div>

      {/* Contenu du rapport */}
      <div className="card">
        <div className="p-6">
          {reportType === 'sales' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Rapport des ventes</h2>
              
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700 font-medium">Total des ventes</span>
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(calculateSalesTotals().totalSales)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {sales.length} vente{sales.length > 1 ? 's' : ''}
                  </div>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-700 font-medium">Coût d'achat</span>
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    {formatCurrency(calculateSalesTotals().totalCost)}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    Coût total des produits vendus
                  </div>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 font-medium">Bénéfice brut</span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-800">
                    {formatCurrency(calculateSalesTotals().grossProfit)}
                  </div>
                  <div className="text-sm text-purple-600 mt-1">
                    Ventes - Coût d'achat
                  </div>
                </div>
              </div>

              {/* Liste des ventes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Détail des ventes</h3>
                {sales.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Aucune vente trouvée pour cette période
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-slate-700">Date</th>
                          <th className="text-left py-3 px-4 text-slate-700">Client</th>
                          <th className="text-right py-3 px-4 text-slate-700">Total</th>
                          <th className="text-right py-3 px-4 text-slate-700">Coût</th>
                          <th className="text-right py-3 px-4 text-slate-700">Bénéfice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale, index) => {
                          const saleCost = sale.items ? sale.items.reduce((sum, item) => {
                            const purchasePrice = item.purchasePrice || 0
                            const quantity = item.quantity || 1
                            return sum + (purchasePrice * quantity)
                          }, 0) : 0
                          const saleProfit = (sale.total || 0) - saleCost
                          
                          return (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-4 text-slate-600">
                                {new Date(sale.createdAt).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="py-3 px-4 text-slate-800">
                                {sale.customerName || 'Client anonyme'}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-green-600">
                                {formatCurrency(sale.total || 0)}
                              </td>
                              <td className="py-3 px-4 text-right text-blue-600">
                                {formatCurrency(saleCost)}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-purple-600">
                                {formatCurrency(saleProfit)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan="2" className="py-3 px-4 font-semibold text-slate-800">Total</td>
                          <td className="py-3 px-4 text-right font-bold text-green-600">
                            {formatCurrency(calculateSalesTotals().totalSales)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600">
                            {formatCurrency(calculateSalesTotals().totalCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-purple-600">
                            {formatCurrency(calculateSalesTotals().grossProfit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {reportType === 'expenses' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Rapport des dépenses</h2>
              
              {/* Statistiques */}
              <div className="bg-red-50 p-6 rounded-lg mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-700 font-medium">Total des dépenses</span>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-800">
                  {formatCurrency(calculateExpensesTotals().totalExpenses)}
                </div>
                <div className="text-sm text-red-600 mt-1">
                  {expenses.length} dépense{expenses.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Liste des dépenses */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Détail des dépenses</h3>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Aucune dépense trouvée pour cette période
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-slate-700">Date</th>
                          <th className="text-left py-3 px-4 text-slate-700">Description</th>
                          <th className="text-left py-3 px-4 text-slate-700">Catégorie</th>
                          <th className="text-right py-3 px-4 text-slate-700">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((expense, index) => (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-slate-600">
                              {expense.date ? new Date(expense.date).toLocaleDateString('fr-FR') : 
                               new Date(expense.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3 px-4 text-slate-800">
                              {expense.description || 'Sans description'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                                {expense.category || 'Non catégorisé'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-red-600">
                              {formatCurrency(expense.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan="3" className="py-3 px-4 font-semibold text-slate-800">Total</td>
                          <td className="py-3 px-4 text-right font-bold text-red-600">
                            {formatCurrency(calculateExpensesTotals().totalExpenses)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {reportType === 'balance' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Bilan</h2>
              
              {/* Statistiques principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700 font-medium">Total des ventes</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(calculateBalance().totalSales)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {calculateBalance().salesCount} vente{calculateBalance().salesCount > 1 ? 's' : ''}
                  </div>
                </div>
                
                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-700 font-medium">Total des dépenses</span>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-800">
                    {formatCurrency(calculateBalance().totalExpenses)}
                  </div>
                  <div className="text-sm text-red-600 mt-1">
                    {calculateBalance().expensesCount} dépense{calculateBalance().expensesCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Calculs de bénéfice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-700 font-medium">Coût d'achat total</span>
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    {formatCurrency(calculateBalance().totalCost)}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    Coût des produits vendus
                  </div>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 font-medium">Bénéfice/Perte</span>
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className={`text-2xl font-bold ${
                    calculateBalance().grossProfit >= 0 ? 'text-purple-800' : 'text-red-800'
                  }`}>
                    {formatCurrency(calculateBalance().grossProfit)}
                  </div>
                  <div className={`text-sm mt-1 ${
                    calculateBalance().grossProfit >= 0 ? 'text-purple-600' : 'text-red-600'
                  }`}>
                    {calculateBalance().grossProfit >= 0 ? 'Bénéfice brut' : 'Perte brute'}
                  </div>
                </div>
              </div>

              {/* Bénéfice net */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Bénéfice net</span>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold">
                  {formatCurrency(calculateBalance().netProfit)}
                </div>
                <div className="text-sm opacity-90 mt-1">
                  Ventes - Coût d'achat - Dépenses
                </div>
                {calculateBalance().netProfit < 0 && (
                  <div className="mt-2 text-sm bg-red-500 bg-opacity-30 px-3 py-1 rounded inline-block">
                    ⚠️ Perte nette
                  </div>
                )}
              </div>

              {/* Résumé détaillé */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Résumé détaillé</h3>
                <div className="bg-slate-50 p-6 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-600">Total des ventes</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(calculateBalance().totalSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-600">Moins: Coût d'achat</span>
                      <span className="font-medium text-blue-600">
                        -{formatCurrency(calculateBalance().totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-600">Moins: Dépenses</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(calculateBalance().totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 font-bold text-lg">
                      <span className="text-slate-800">Bénéfice net</span>
                      <span className={calculateBalance().netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(calculateBalance().netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
