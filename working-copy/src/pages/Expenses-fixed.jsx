import React, { useState, useEffect } from 'react'
import { appStorage } from '../utils/storage'
import { formatDate } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { Plus, Search, Wallet, X, Calendar, Tag, Edit, Trash2, BarChart3, TrendingDown, PieChart as PieChartIcon, TrendingUp, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Pie } from 'react-chartjs-2'

const emptyExpense = {
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  notes: ''
}

// Enregistrement des composants ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function Expenses() {
  const { formatCurrency, currency, t } = useI18n()
  const [expenses, setExpenses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyExpense)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadExpenses()
  }, [currency])

  const loadExpenses = () => {
    try {
      console.log('Expenses: Début du chargement...')
      setLoading(true)
      setError(null)
      
      const data = appStorage.getExpenses() || []
      console.log('Expenses: Données chargées', data.length)
      
      setExpenses(data)
      setFiltered(data)
    } catch (error) {
      console.error('Expenses: Erreur de chargement:', error)
      setError('Erreur lors du chargement des dépenses')
      setExpenses([])
      setFiltered([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(expenses.filter(e => !q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)))
  }, [expenses, search])

  // Préparer les données pour le graphique d'évolution des dépenses
  const getEvolutionData = () => {
    if (expenses.length === 0) return []
    
    try {
      const last30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return date.toISOString().split('T')[0]
      })

      return last30Days.map(date => {
        const dayExpenses = expenses.filter(e => {
          const expenseDate = e.date || new Date(e.createdAt).toISOString().split('T')[0]
          return expenseDate === date
        })
        return {
          date: formatDate(new Date(date), { day: 'numeric', month: 'short' }),
          amount: dayExpenses.reduce((sum, e) => {
            const amount = parseFloat(e.amount) || 0
            return sum + amount
          }, 0)
        }
      })
    } catch (error) {
      console.error('Error in getEvolutionData:', error)
      return []
    }
  }

  // Préparer les données pour le graphique de répartition des dépenses
  const getCategoryData = () => {
    // Données de test pour le diagramme circulaire
    const testData = [
      { category: 'Transport', amount: 5000 },
      { category: 'Nourriture', amount: 15000 },
      { category: 'Loyer', amount: 50000 },
      { category: 'Internet', amount: 10000 },
      { category: 'Autres', amount: 5000 }
    ]
    
    let dataToUse = expenses.length > 0 ? expenses : testData
    
    if (dataToUse.length === 0) return []
    
    try {
      const categoryTotals = dataToUse.reduce((acc, expense) => {
        const category = expense.category || 'Non catégorisé'
        const amount = parseFloat(expense.amount) || 0
        acc[category] = (acc[category] || 0) + amount
        return acc
      }, {})

      const totalExpenses = dataToUse.reduce((sum, e) => sum + parseFloat(e.amount) || 0, 0)

      return Object.entries(categoryTotals).map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0'
      }))
    } catch (error) {
      console.error('Error in getCategoryData:', error)
      return []
    }
  }

  const openAdd = () => { setForm(emptyExpense); setEditingId(null); setShowModal(true) }

  const openEdit = (expense) => { 
    setForm({
      description: expense.description,
      amount: expense.amount,
      category: expense.category || '',
      date: expense.date || new Date(expense.createdAt).toISOString().split('T')[0],
      notes: expense.notes || ''
    }); 
    setEditingId(expense.id); 
    setShowModal(true) 
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.description || !form.amount) { toast.error('Description et montant requis'); return }
    setSaving(true)
    try {
      const expense = {
        ...form,
        amount: parseFloat(form.amount),
        id: editingId || Date.now().toString(),
        createdAt: editingId ? expenses.find(ex => ex.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updated = editingId 
        ? expenses.map(ex => ex.id === editingId ? expense : ex)
        : [...expenses, expense]
      
      appStorage.setExpenses(updated)
      setExpenses(updated)
      setFiltered(updated)
      
      toast.success(editingId ? 'Dépense modifiée' : 'Dépense ajoutée')
      setShowModal(false)
      setForm(emptyExpense)
      setEditingId(null)
    } catch(e) { toast.error('Erreur') }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette dépense ?')) {
      const updated = expenses.filter(ex => ex.id !== id)
      appStorage.setExpenses(updated)
      setExpenses(updated)
      setFiltered(updated)
      toast.success('Dépense supprimée')
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount) || 0, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Wallet className="text-orange-600" />
            {t('expenses')}
          </h1>
          <p className="text-slate-500 mt-1">{t('expensesDescription')}</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          {t('addExpense')}
        </button>
      </div>

      {/* Stats Cards */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</h3>
            <p className="text-sm text-slate-500">{t('totalExpenses')}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{expenses.length}</h3>
            <p className="text-sm text-slate-500">{t('numberOfExpenses')}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingDown className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}</h3>
            <p className="text-sm text-slate-500">{t('average')}</p>
          </div>
        </div>
      )}

      {/* Graphiques - Toujours afficher avec données de test si nécessaire */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des dépenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                {t('expensesEvolution')}
              </h3>
              <p className="text-sm text-slate-500">{t('last30Days')}</p>
            </div>
          </div>
          <div className="h-64">
            <Line
              data={{
                labels: getEvolutionData().map(d => d.date),
                datasets: [{
                  label: t('dailyExpenses'),
                  data: getEvolutionData().map(d => d.amount),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return formatCurrency(context.parsed.y)
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value)
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Répartition des dépenses - Design amélioré */}
        <div className="card bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                  <PieChartIcon size={20} className="text-white" />
                </div>
                Répartition des dépenses
              </h3>
              <p className="text-sm text-slate-600 mt-1">Analyse par catégorie</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(expenses.reduce((sum, e) => sum + parseFloat(e.amount) || 0, 0))}
              </div>
              <div className="text-xs text-slate-500">Total des dépenses</div>
            </div>
          </div>
          
          <div className="h-80">
            {getCategoryData().length > 0 ? (
              <div className="relative">
                <Pie
                  data={{
                    labels: getCategoryData().map(d => d.category),
                    datasets: [{
                      data: getCategoryData().map(d => d.amount),
                      backgroundColor: [
                        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                        '#ec4899', '#f43f5e'
                      ],
                      borderWidth: 3,
                      borderColor: '#ffffff',
                      hoverOffset: 8,
                      hoverBorderWidth: 4,
                      hoverBorderColor: '#ffffff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle',
                          font: {
                            size: 12,
                            weight: '500'
                          },
                          generateLabels: function(chart) {
                            const data = chart.data
                            if (data.labels.length && data.datasets.length) {
                              const dataset = data.datasets[0]
                              const total = dataset.data.reduce((a, b) => a + b, 0)
                              return data.labels.map((label, i) => {
                                const value = dataset.data[i]
                                const percentage = ((value / total) * 100).toFixed(1)
                                return {
                                  text: `${label} (${percentage}%)`,
                                  fillStyle: dataset.backgroundColor[i],
                                  hidden: false,
                                  index: i,
                                  pointStyle: 'circle'
                                }
                              })
                            }
                            return []
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                          label: function(context) {
                            const data = getCategoryData()[context.dataIndex]
                            return [
                              `${data.category}:`,
                              `Montant: ${formatCurrency(data.amount)}`,
                              `Pourcentage: ${data.percentage}%`
                            ]
                          },
                          title: function(context) {
                            return 'Détail de la catégorie'
                          }
                        }
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000,
                      easing: 'easeInOutQuart'
                    }
                  }}
                />
                
                {/* Centre du donut avec le total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center bg-white rounded-full p-4 shadow-lg">
                    <div className="text-2xl font-bold text-slate-800">
                      {getCategoryData().length}
                    </div>
                    <div className="text-xs text-slate-500">Catégories</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <PieChartIcon size={32} className="text-slate-400" />
                </div>
                <p className="text-lg font-medium">Aucune dépense catégorisée</p>
                <p className="text-sm mt-2">Ajoutez des dépenses avec des catégories pour voir le diagramme</p>
              </div>
            )}
          </div>
          
          {/* Légende détaillée améliorée */}
          {getCategoryData().length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {getCategoryData().slice(0, 6).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ 
                        backgroundColor: [
                          '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                          '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                          '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                          '#ec4899', '#f43f5e'
                        ][index],
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    ></div>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{item.category}</div>
                      <div className="text-xs text-slate-500">{item.percentage}%</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">{formatCurrency(item.amount)}</div>
                  </div>
                </div>
              ))}
              {getCategoryData().length > 6 && (
                <div className="flex items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-600">
                    +{getCategoryData().length - 6} autres catégories
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search and Table */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t('searchExpenses')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">
                    {search ? 'Aucune dépense trouvée' : 'Aucune dépense enregistrée'}
                  </td>
                </tr>
              ) : (
                filtered.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.description}</td>
                    <td>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        {expense.category || 'Non catégorisé'}
                      </span>
                    </td>
                    <td>{formatDate(new Date(expense.date || expense.createdAt))}</td>
                    <td className="font-medium">{formatCurrency(expense.amount)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(expense)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingId ? t('editExpense') : t('addExpense')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label-field">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Montant (FCFA)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Catégorie</label>
                <select
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="input-field"
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="Transport">Transport</option>
                  <option value="Nourriture">Nourriture</option>
                  <option value="Loyer">Loyer</option>
                  <option value="Internet">Internet</option>
                  <option value="Autres">Autres</option>
                </select>
              </div>

              <div>
                <label className="label-field">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? t('saving') : (editingId ? t('editExpense') : t('addExpense'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
