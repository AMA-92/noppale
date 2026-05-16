import React, { useState, useEffect } from 'react'
import { Plus, Search, Wallet, X, Trash2, Edit } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import { appStorage } from '../utils/storage'
import toast from 'react-hot-toast'

const emptyExpense = {
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  notes: ''
}

export default function Expenses() {
  const { formatCurrency, language, t } = useI18n()
  const [expenses, setExpenses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyExpense)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadExpenses()
  }, [language])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(expenses.filter(e => 
      !q || 
      (e.description && e.description.toLowerCase().includes(q)) || 
      (e.category && e.category.toLowerCase().includes(q))
    ))
  }, [expenses, search])

  const loadExpenses = () => {
    try {
      console.log('Expenses: Début du chargement...')
      setLoading(true)
      setError(null)
      
      const data = appStorage.getExpenses() || []
      console.log('Expenses: Données chargées', data.length, data)
      
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

  const openAdd = () => {
    setForm(emptyExpense)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (expense) => {
    setForm({
      ...expense,
      amount: expense.amount || 0
    })
    setEditingId(expense.id)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const expenseToSave = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        date: form.date || new Date().toISOString().split('T')[0]
      }

      if (editingId) {
        // Modification
        const updated = expenses.map(e => 
          e.id === editingId ? {...expenseToSave, id: editingId} : e
        )
        appStorage.setExpenses(updated)
        setExpenses(updated)
        toast.success('Dépense modifiée')
      } else {
        // Ajout
        const newExpense = {
          ...expenseToSave,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        }
        const updated = [newExpense, ...expenses]
        appStorage.setExpenses(updated)
        setExpenses(updated)
        toast.success('Dépense ajoutée')
      }
      
      setShowModal(false)
      setForm(emptyExpense)
      setEditingId(null)
    } catch (error) {
      console.error('Expenses: Erreur sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        const updated = expenses.filter(e => e.id !== id)
        appStorage.setExpenses(updated)
        setExpenses(updated)
        toast.success('Dépense supprimée')
      } catch (error) {
        console.error('Expenses: Erreur suppression:', error)
        toast.error('Erreur lors de la suppression')
      }
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
          <button onClick={loadExpenses} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
          <p className="text-slate-500">Suivez vos dépenses et coûts</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} />
          {t('addExpense')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">{t('totalExpenses')}</span>
            <Wallet className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(total)}</div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">{t('numberOfExpenses')}</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{filtered.length}</div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">{t('average')}</span>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(filtered.length > 0 ? total / filtered.length : 0)}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Aucune dépense</h3>
              <p className="text-slate-500 mb-4">Commencez par ajouter votre première dépense</p>
              <button onClick={openAdd} className="btn-primary">
                <Plus size={18} />
                {t('addExpense')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{expense.description || 'Sans description'}</div>
                    <div className="text-sm text-slate-500">
                      {expense.category && <span className="mr-3">{expense.category}</span>}
                      {expense.date && <span>{expense.date}</span>}
                    </div>
                    {expense.notes && (
                      <div className="text-sm text-slate-400 mt-1">{expense.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">{formatCurrency(expense.amount || 0)}</div>
                    </div>
                    <button
                      onClick={() => openEdit(expense)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? t('editExpense') : t('addExpense')}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Loyer, Transport..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
