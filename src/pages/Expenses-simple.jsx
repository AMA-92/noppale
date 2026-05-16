import React, { useState, useEffect } from 'react'
import { appStorage } from '../utils/storage'
import { useI18n } from '../hooks/useI18n.jsx'
import { Plus, Search, Wallet, X, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyExpense = {
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  notes: ''
}

export default function Expenses() {
  const { formatCurrency } = useI18n()
  const [expenses, setExpenses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyExpense)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const loadedExpenses = appStorage.getExpenses()
    setExpenses(loadedExpenses)
    setFiltered(loadedExpenses)
    setLoading(false)
  }, [])

  useEffect(() => {
    const filtered = expenses.filter(expense =>
      expense.description.toLowerCase().includes(search.toLowerCase()) ||
      expense.category.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(filtered)
  }, [search, expenses])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingId) {
        appStorage.updateExpense(editingId, form)
        toast.success('Dépense mise à jour')
      } else {
        appStorage.addExpense(form)
        toast.success('Dépense ajoutée')
      }

      const updatedExpenses = editingId
        ? expenses.map(exp => exp.id === editingId ? { ...exp, ...form } : exp)
        : [...expenses, { ...form, id: Date.now().toString() }]

      setExpenses(updatedExpenses)
      setForm(emptyExpense)
      setShowModal(false)
      setEditingId(null)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (expense) => {
    setForm(expense)
    setEditingId(expense.id)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        appStorage.deleteExpense(id)
        const updatedExpenses = expenses.filter(exp => exp.id !== id)
        setExpenses(updatedExpenses)
        toast.success('Dépense supprimée')
      } catch (error) {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const totalExpenses = filtered.reduce((sum, exp) => sum + exp.amount, 0)

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
        <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
        <p className="text-slate-500">Gérez vos dépenses quotidiennes</p>
      </div>

      {/* Stats Card */}
      <div className="card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-slate-700">Total des dépenses</h3>
            <p className="text-sm text-slate-500">Cumul de toutes vos dépenses</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="card p-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une dépense..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Aucune dépense</h3>
            <p className="text-slate-500">Commencez par ajouter votre première dépense</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((expense) => (
              <div key={expense.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">
                        {expense.category || 'Général'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {expense.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-1">
                      {expense.description}
                    </h3>
                    {expense.notes && (
                      <p className="text-sm text-slate-600">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Modifier la dépense' : 'Ajouter une dépense'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setForm(emptyExpense)
                    setEditingId(null)
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Achat de fournitures"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Montant
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Transport"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20 resize-y"
                  placeholder="Ajoutez des notes..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setForm(emptyExpense)
                    setEditingId(null)
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    saving 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
