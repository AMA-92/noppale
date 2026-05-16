import React, { useState, useEffect } from 'react'
import { appStorage } from '../utils/storage'
import { formatDate } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { Plus, Search, Edit2, Trash2, Package, X, Tag, DollarSign, Upload, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyProduct = { 
  name: '', 
  sellingPrice: '', 
  costPrice: '', 
  stock: '', 
  minStock: '',
  unit: '',
  category: '', 
  description: '',
  image: ''
}

export default function Products() {
  const { formatCurrency, currency, language, t } = useI18n()
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProducts() }, [currency, language])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(products.filter(p => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)))
  }, [products, search])

  const loadProducts = () => {
    setLoading(true)
    try {
      const products = appStorage.getProducts()
      setProducts(products)
    } catch(e) { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditingId(null); setForm(emptyProduct); setShowModal(true) }
  const openEdit = (p) => { 
    setEditingId(p.id); 
    setForm({ 
      name: p.name, 
      sellingPrice: p.sellingPrice || '', 
      costPrice: p.costPrice || '', 
      category: p.category || '', 
      stock: p.stock || '', 
      minStock: p.minStock || '', 
      unit: p.unit || '', 
      description: p.description || '',
      image: p.image || ''
    }); 
    setShowModal(true) 
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!form.name || !form.sellingPrice) { toast.error('Nom et prix de vente requis'); return }
    setSaving(true)
    try {
      if (editingId) {
        const updatedProducts = products.map(p => 
          p.id === editingId ? { ...p, ...form } : p
        )
        setProducts(updatedProducts)
        appStorage.setProducts(updatedProducts)
        toast.success('Produit mis à jour')
      } else {
        const newProduct = appStorage.addProduct(form)
        setProducts([...products, newProduct])
        toast.success('Produit ajouté')
      }
      setShowModal(false)
      setForm(emptyProduct)
      setEditingId(null)
    } catch(e) { toast.error('Erreur') }
    finally { setSaving(false) }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        setForm({ ...form, image: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDelete = (product) => {
    if (confirm(`Supprimer ${product.name}?`)) {
      const updatedProducts = products.filter(p => p.id !== product.id)
      setProducts(updatedProducts)
      appStorage.setProducts(updatedProducts)
      toast.success('Produit supprimé')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Produits</h1>
          <p className="text-slate-500">Gérez votre catalogue de produits</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} />
          {t('addProduct')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('searchProducts')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(product => (
          <div key={product.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={20} className="text-primary-600" />
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(product)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{product.name}</h3>
            {product.category && (
              <span className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full mb-2">
                {product.category}
              </span>
            )}
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-green-600">{formatCurrency(product.sellingPrice)}</p>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    (parseInt(product.stock) || 0) === 0 || ((parseInt(product.minStock) || 0) > 0 && (parseInt(product.stock) || 0) <= (parseInt(product.minStock) || 0))
                      ? 'text-red-600' 
                      : 'text-slate-500'
                  }`}>
                    Stock: {product.stock || 0} {product.unit || ''}
                  </p>
                  {product.minStock && (
                    <p className="text-xs text-slate-400">Min: {product.minStock} {product.unit || ''}</p>
                  )}
                </div>
              </div>
              {product.costPrice && (
                <p className="text-sm text-slate-500">Achat: {formatCurrency(product.costPrice)}</p>
              )}
              {((parseInt(product.stock) || 0) === 0 || ((parseInt(product.minStock) || 0) > 0 && (parseInt(product.stock) || 0) <= (parseInt(product.minStock) || 0))) && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ {(parseInt(product.stock) || 0) === 0 ? 'Rupture de stock' : 'Stock faible'}
                  </p>
                </div>
              )}
            </div>
            {product.description && (
              <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            {search ? 'Aucun produit trouvé' : 'Aucun produit'}
          </h3>
          <p className="text-slate-500">
            {search ? 'Essayez une autre recherche' : 'Ajoutez votre premier produit pour commencer'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? t('editProduct') : t('addProduct')}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="label-field">Image du produit</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {form.image ? (
                      <img src={form.image} alt="Aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="btn-secondary cursor-pointer"
                    >
                      <Upload size={18} />
                      Ajouter une image
                    </label>
                    <p className="text-xs text-slate-500 mt-1">Max: 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label-field">Nom du produit *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">Catégorie</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Alimentaire, Électronique..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Prix de vente (FCFA) *</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={e => setForm({...form, sellingPrice: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Prix d'achat (FCFA)</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={e => setForm({...form, costPrice: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm({...form, stock: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Stock minimum</label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={e => setForm({...form, minStock: e.target.value})}
                    className="input-field"
                    placeholder="Alerte si stock ≤"
                  />
                </div>
              </div>

              <div>
                <label className="label-field">Unité</label>
                <select
                  value={form.unit}
                  onChange={e => setForm({...form, unit: e.target.value})}
                  className="input-field"
                >
                  <option value="">Sélectionner</option>
                  <option value="pièces">Pièces</option>
                  <option value="kg">Kg</option>
                  <option value="litres">Litres</option>
                  <option value="mètres">Mètres</option>
                  <option value="cartons">Cartons</option>
                  <option value="sacs">Sacs</option>
                  <option value="bouteilles">Bouteilles</option>
                  <option value="boîtes">Boîtes</option>
                </select>
              </div>

              <div>
                <label className="label-field">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Description détaillée du produit..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
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
