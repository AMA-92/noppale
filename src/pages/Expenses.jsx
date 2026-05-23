import React, { useState, useEffect } from 'react'
import { Plus, Search, Wallet, X, Calendar, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { appStorage } from '../utils/storage'
import { formatDate } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { useExpensesRealtime } from '../hooks/useRealtime.jsx'
import { validateExpenseData, sanitizeString, truncateString } from '../utils/security'

const emptyExpense = {
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  notes: ''
}

export default function Expenses() {
  const { formatCurrency, currency, t } = useI18n()
  const [expenses, setExpenses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyExpense)
  const [editingId, setEditingId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadExpenses = async () => {
    try {
      if (!expenses.length) setLoading(true)
      setError(null)
      const data = await appStorage.getExpenses()
      setExpenses(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Expenses: Error loading:', e)
      setError('Erreur lors du chargement des dépenses')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses().catch(console.error)
  }, [currency])

  // Realtime: recharger quand une dépense change
  useExpensesRealtime(() => {
    loadExpenses().catch(console.error)
  })

  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      setFiltered(expenses)
      return
    }
    setFiltered(
      expenses.filter((e) => {
        const desc = (e.description || '').toLowerCase()
        const cat = (e.category || '').toLowerCase()
        return desc.includes(q) || cat.includes(q)
      })
    )
  }, [expenses, search])

  const openAdd = () => {
    setForm(emptyExpense)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (expense) => {
    setForm({
      description: expense.description || '',
      amount: expense.amount || 0,
      category: expense.category || '',
      date: expense.date || (expense.createdAt ? new Date(expense.createdAt).toISOString().split('T')[0] : emptyExpense.date),
      notes: expense.notes || ''
    })
    setEditingId(expense.id)
    setShowModal(true)
  }

  const handleDelete = async (expense) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la dépense "${expense.description}" ?`)) return
    try {
      await appStorage.deleteExpense(expense.id)
      toast.success('Dépense supprimée')
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    } catch (e) {
      console.error('Error deleting expense:', e)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleDeleteEditingExpense = async () => {
    const expense = expenses.find((e) => e.id === editingId)
    if (!expense) return
    await handleDelete(expense)
    setShowModal(false)
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const sanitizedExpense = {
      description: sanitizeString(truncateString(form.description || '', 500)),
      amount: parseFloat(form.amount) || 0,
      category: sanitizeString(truncateString(form.category || '', 100)),
      date: form.date,
      notes: sanitizeString(truncateString(form.notes || '', 500))
    }

    const validation = validateExpenseData(sanitizedExpense)
    if (!validation.isValid) {
      toast.error(validation.errors[0])
      return
    }

    const currentEditingId = editingId
    const optimisticExpense = {
      ...sanitizedExpense,
      id: currentEditingId || `temp-${Date.now()}`
    }

    setSaving(true)
    setShowModal(false)
    setForm(emptyExpense)
    setEditingId(null)

    if (currentEditingId) {
      setExpenses((prev) => prev.map((x) => (x.id === currentEditingId ? { ...x, ...optimisticExpense } : x)))
    } else {
      setExpenses((prev) => [optimisticExpense, ...prev])
    }

    const savePromise = currentEditingId
      ? appStorage.updateExpense(currentEditingId, sanitizedExpense)
      : appStorage.addExpense(sanitizedExpense)

    savePromise
      .then((savedExpense) => {
        if (savedExpense) {
          setExpenses((prev) => prev.map((x) => (x.id === optimisticExpense.id ? savedExpense : x)))
        }
        toast.success(currentEditingId ? 'Dépense modifiée' : 'Dépense enregistrée')
      })
      .catch((e2) => {
        console.error('Error saving expense:', e2)
        toast.error('Erreur lors de la sauvegarde')
        loadExpenses().catch(console.error)
      })
      .finally(() => setSaving(false))
  }

  const total = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Erreur</div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={() => loadExpenses()} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('expenses')}</h1>
          <p className="text-slate-500">{t('expensesDesc')}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} />
          {t('addExpense')}
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

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
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(filtered.length > 0 ? total / filtered.length : 0)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="w-full border-collapse border border-slate-200">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-200">
                <th className="border border-slate-200 px-4 py-3 text-left">Description</th>
                <th className="border border-slate-200 px-4 py-3 text-left">Catégorie</th>
                <th className="border border-slate-200 px-4 py-3 text-left">Date</th>
                <th className="border border-slate-200 px-4 py-3 text-right">Montant</th>
                <th className="border border-slate-200 px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-10 text-slate-500">
                    {search ? 'Aucune dépense trouvée' : 'Aucune dépense'}
                  </td>
                </tr>
              ) : (
                filtered.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="border border-slate-200 px-4 py-3">{expense.description}</td>
                    <td className="border border-slate-200 px-4 py-3">
                      {expense.category ? <span className="badge badge-gray">{expense.category}</span> : null}
                    </td>
                    <td className="border border-slate-200 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        {formatDate(new Date(expense.createdAt || expense.date || Date.now()))}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(expense.amount || 0)}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(expense)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                          type="button"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                          type="button"
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? t('editExpense') : t('addExpense')}</h2>
              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    onClick={handleDeleteEditingExpense}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                    type="button"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={() => { setShowModal(false); setEditingId(null) }} className="p-1.5 hover:bg-slate-100 rounded-lg" type="button">
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label-field">Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Montant *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Catégorie</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Loyer, Transport..."
                />
              </div>

              <div>
                <label className="label-field">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? t('saving') : editingId ? t('editExpense') : t('addExpense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

