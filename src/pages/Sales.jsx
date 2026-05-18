import React, { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { appStorage } from '../utils/storage'
import { formatDate, getPaymentMethod, formatCurrency, getProductSellingPrice } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { useSalesRealtime } from '../hooks/useRealtime.jsx'
import { Plus, Search, ShoppingCart, X, DollarSign, Calendar, User, Package, Printer, Eye, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateSaleData, sanitizeString, truncateString } from '../utils/security'

const emptySale = {
  customerName: '',
  items: [],
  total: 0,
  amountReceived: 0,
  change: 0,
  paymentMethod: 'especes',
  notes: '',
  createdAt: new Date().toISOString()
}

const emptyItem = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0
}

export default function Sales() {  
  // Traduction simplifiée
  const { formatCurrency, currency, language, t } = useI18n()
  
  const [sales, setSales] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [form, setForm] = useState(emptySale)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [currentItem, setCurrentItem] = useState(emptyItem)
  const [shopInfo, setShopInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: ''
  })
  const [isEditingSale, setIsEditingSale] = useState(false)
  const [editingSaleData, setEditingSaleData] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const cartItemsRef = useRef([])
  const lastProductTapRef = useRef(0)

  const syncCartWithForm = useCallback((items, prevForm) => {
    const newTotal = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0)
    return {
      ...prevForm,
      items,
      total: newTotal,
      change: (parseFloat(prevForm.amountReceived) || 0) - newTotal
    }
  }, [])

  const updateCart = useCallback((updater) => {
    setCartItems((prev) => {
      const newItems = typeof updater === 'function' ? updater(prev) : updater
      cartItemsRef.current = newItems
      setForm((formPrev) => syncCartWithForm(newItems, formPrev))
      return newItems
    })
  }, [syncCartWithForm])

  const getCartItems = useCallback(() => {
    if (cartItemsRef.current?.length) return cartItemsRef.current
    if (cartItems.length) return cartItems
    return form.items || []
  }, [cartItems, form.items])

  // Charger les informations de la boutique
  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const shopData = await appStorage.getShopInfo()
        setShopInfo(shopData)
      } catch(e) {
        console.error('Erreur de chargement des informations de la boutique:', e)
      }
    }
    loadShopInfo()
  }, [])

  useEffect(() => {
    loadSales()
    loadProducts()
  }, [currency, language])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(sales.filter(s => !q || (s.customer_name && s.customer_name.toLowerCase().includes(q))))
  }, [sales, search])

  // Écouter les changements en temps réel sur les ventes
  useSalesRealtime(() => {
    loadSales()
  })

  const loadProducts = async () => {
    try {
      const products = await appStorage.getProducts()
      setProducts(products)
    } catch(e) { toast.error('Erreur de chargement des produits') }
  }

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0)
  }

  const calculateItemTotal = (quantity, unitPrice) => {
    return (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  }

  const calculateChange = (total, amountReceived) => {
    const totalNum = parseFloat(total) || 0
    const receivedNum = parseFloat(amountReceived) || 0
    return receivedNum - totalNum
  }

  /** Complète les prix manquants depuis le catalogue produits */
  const normalizeSaleItems = (items) => {
    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const qty = parseFloat(item.quantity) || 1
      let unitPrice = parseFloat(item.unitPrice ?? item.unit_price) || 0

      if (unitPrice <= 0 && product) {
        unitPrice = getProductSellingPrice(product)
      }

      let totalPrice = parseFloat(item.totalPrice ?? item.total_price) || 0
      if (totalPrice <= 0 && unitPrice > 0) {
        totalPrice = calculateItemTotal(qty, unitPrice)
      }
      if (unitPrice <= 0 && totalPrice > 0 && qty > 0) {
        unitPrice = totalPrice / qty
      }

      return {
        ...item,
        productId: item.productId,
        productName: item.productName || product?.name || 'Produit',
        quantity: qty,
        unitPrice,
        totalPrice
      }
    })
  }

  const loadSales = async () => {
    setLoading(true)
    try {
      const sales = await appStorage.getSales()
      setSales(sales)
    } catch(e) { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }

  const openAdd = () => { 
    cartItemsRef.current = []
    setCartItems([])
    setForm(emptySale)
    setCurrentItem(emptyItem)
    setProductSearch('')
    setShowProductDropdown(true)
    setShowModal(true) 
  }

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase()
    const matchesSearch = !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    return matchesSearch && parseInt(p.stock || 0, 10) > 0
  })

  const selectProduct = (product) => {
    try {
      // Validation du produit
      if (!product || !product.id) {
        console.error('Produit invalide:', product)
        toast.error('Produit invalide')
        return
      }

      const availableStock = parseInt(product.stock || 0, 10)

      const unitPrice = getProductSellingPrice(product)
      const quantity = 1

      if (unitPrice <= 0) {
        toast.error('Prix du produit invalide — définissez un prix de vente dans Produits')
        return
      }

      const newItem = {
        productId: product.id,
        quantity,
        unitPrice,
        costPrice: parseFloat(product.buying_price || 0),
        totalPrice: calculateItemTotal(quantity, unitPrice),
        productName: product.name || 'Produit sans nom',
        productUnit: product.barcode || 'unité'
      }

      flushSync(() => {
        updateCart((currentItems) => {
          const existingItem = currentItems.find((item) => item.productId === product.id)
          if (existingItem) {
            const currentQty = parseInt(existingItem.quantity || 0, 10)
            if (currentQty >= availableStock) {
              toast.error(`Stock insuffisant ! Il ne reste que ${availableStock} unité(s) de ${product.name}`)
              return currentItems
            }
            return currentItems.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: currentQty + quantity,
                    totalPrice: calculateItemTotal(currentQty + quantity, item.unitPrice)
                  }
                : item
            )
          }
          if (availableStock < 1) {
            toast.error(`${product.name} est en rupture de stock`)
            return currentItems
          }
          return [...currentItems, newItem]
        })
      })

      setProductSearch('')
      setCurrentItem(emptyItem)
      toast.success(`${product.name || 'Produit'} ajouté au panier`)
    } catch (error) {
      console.error('Erreur dans selectProduct:', error)
      toast.error(error?.message || 'Erreur lors de l\'ajout du produit')
    }
  }

  const addProductToCart = (product, event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    const now = Date.now()
    if (now - lastProductTapRef.current < 350) return
    lastProductTapRef.current = now
    selectProduct(product)
  }

  const addItemToSale = () => {
    if (!currentItem.productId) {
      toast.error('Veuillez sélectionner un produit')
      return
    }
    
    updateCart((currentItems) => {
      const existingItemIndex = currentItems.findIndex((item) => item.productId === currentItem.productId)
      if (existingItemIndex >= 0) {
        const updatedItems = [...currentItems]
        const existingQuantity = parseFloat(updatedItems[existingItemIndex].quantity) || 0
        const addQuantity = parseFloat(currentItem.quantity) || 0
        const unitPrice = parseFloat(updatedItems[existingItemIndex].unitPrice) || 0
        updatedItems[existingItemIndex].quantity = existingQuantity + addQuantity
        updatedItems[existingItemIndex].totalPrice = calculateItemTotal(
          updatedItems[existingItemIndex].quantity,
          unitPrice
        )
        return updatedItems
      }
      return [...currentItems, currentItem]
    })
    
    setCurrentItem(emptyItem)
    setProductSearch('')
  }

  const removeItemFromSale = (productId) => {
    updateCart((currentItems) => currentItems.filter((item) => item.productId !== productId))
  }

  const getAvailableStock = (productId) => {
    const product = products.find(p => p.id === productId)
    return product ? parseInt(product.stock || 0) : 999
  }

  const updateItemQuantity = (productId, quantity) => {
    // Récupérer le produit pour vérifier le stock disponible
    const product = products.find(p => p.id === productId)

    if (!product) {
      toast.error('Produit non trouvé')
      return
    }

    const newQuantity = parseFloat(quantity) || 1
    const availableStock = parseInt(product.stock || 0)

    // Validation du stock disponible
    if (newQuantity > availableStock) {
      toast.error(`Quantité trop élevée ! Il ne reste que ${availableStock} unité(s) de ${product.name}`)
      return
    }

    updateCart((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: calculateItemTotal(newQuantity, parseFloat(item.unitPrice) || 0)
            }
          : item
      )
    )
  }

  const updateAmountReceived = (amount) => {
    const newChange = calculateChange(form.total || 0, amount)
    setForm({
      ...form,
      amountReceived: parseFloat(amount) || 0,
      change: newChange
    })
  }

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault()

    const cartItems = getCartItems()
    if (!cartItems.length) {
      toast.error('Ajoutez au moins un produit au panier')
      return
    }

    const normalizedItems = normalizeSaleItems(cartItems)
    const invalidItem = normalizedItems.find((item) => item.unitPrice <= 0)
    if (invalidItem) {
      toast.error(`Prix manquant pour « ${invalidItem.productName} ». Définissez un prix de vente dans Produits.`)
      return
    }

    const saleTotal = parseFloat(form.total) || calculateTotal(normalizedItems)

    // Sanitize and validate input
    const sanitizedSale = {
      customerName: sanitizeString(truncateString(form.customerName?.trim() || 'Client', 200)),
      total: saleTotal,
      paymentMethod: form.paymentMethod,
      notes: sanitizeString(truncateString(form.notes || '', 500)),
      items: normalizedItems.map(item => ({
        ...item,
        productName: sanitizeString(truncateString(item.productName || '', 200))
      }))
    }

    // Validate sale data
    const validation = validateSaleData(sanitizedSale)
    if (!validation.isValid) {
      toast.error(validation.errors[0])
      return
    }

    if (sanitizedSale.paymentMethod === 'especes') {
      const received = parseFloat(form.amountReceived) || 0
      if (received > 0 && received < saleTotal) {
        toast.error('Le montant reçu est insuffisant')
        return
      }
    }

    setSaving(true)
    try {
      // Enregistrer la vente avec Supabase (gère automatiquement le stock)
      await appStorage.addSale({
        customerName: sanitizedSale.customerName,
        total: sanitizedSale.total,
        paymentMethod: sanitizedSale.paymentMethod,
        notes: sanitizedSale.notes,
        items: sanitizedSale.items
      })

      await loadSales()
      await loadProducts()

      toast.success('Vente enregistrée et stock mis à jour')
      cartItemsRef.current = []
      setCartItems([])
      setShowModal(false)
      setForm(emptySale)
      setCurrentItem(emptyItem)
      setProductSearch('')
    } catch(e) {
      console.error('Erreur détaillée:', e)
      toast.error('Erreur lors de l\'enregistrement de la vente: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const printFacture = () => {
    if (!selectedSale) return
    window.print()
  }

  const startEditingSale = () => {
    if (!selectedSale) return
    setEditingSaleData({
      ...selectedSale,
      items: selectedSale.items ? [...selectedSale.items] : []
    })
    setIsEditingSale(true)
    setShowDetailsModal(false)
  }

  const saveEditedSale = () => {
    // Pour l'instant, la modification de vente est désactivée avec Supabase
    // car elle nécessite une logique complexe de gestion du stock
    toast.error('La modification de vente n\'est pas encore supportée avec Supabase')
    setIsEditingSale(false)
    setEditingSaleData(null)
  }

  const cancelEditingSale = () => {
    setIsEditingSale(false)
    setEditingSaleData(null)
  }

  const updateEditingSaleItem = (index, field, value) => {
    const updatedItems = [...editingSaleData.items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    
    // Recalculer le total de l'article
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = calculateItemTotal(
        updatedItems[index].quantity, 
        updatedItems[index].unitPrice
      )
    }
    
    // Recalculer le total de la vente
    const newTotal = calculateTotal(updatedItems)
    
    setEditingSaleData({
      ...editingSaleData,
      items: updatedItems,
      total: newTotal
    })
  }

  const addEditingSaleItem = () => {
    const newItem = {
      ...emptyItem,
      id: Date.now().toString()
    }
    setEditingSaleData({
      ...editingSaleData,
      items: [...editingSaleData.items, newItem]
    })
  }

  const removeEditingSaleItem = (index) => {
    const updatedItems = editingSaleData.items.filter((_, i) => i !== index)
    const newTotal = calculateTotal(updatedItems)
    
    setEditingSaleData({
      ...editingSaleData,
      items: updatedItems,
      total: newTotal
    })
  }

  const printAdvancedFacture = () => {
    if (!selectedSale) return
    
    // Importer les bibliothèques nécessaires
    import('jspdf').then(({ jsPDF }) => {
      import('html2canvas').then(({ default: html2canvas }) => {
        // Créer un conteneur temporaire pour le PDF
        const tempDiv = document.createElement('div')
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.backgroundColor = 'white'
        tempDiv.style.padding = '20px'
        tempDiv.style.fontFamily = 'Arial, sans-serif'
        
        // Créer le nom du fichier avec nom client et date
        const saleDate = new Date(selectedSale.createdAt)
        const formattedDate = `${saleDate.getDate().toString().padStart(2, '0')}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}-${saleDate.getFullYear().toString().slice(-2)}`
        const clientName = selectedSale.customerName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') // Nettoyer le nom
        const fileName = `Facture_${clientName}_${formattedDate}.pdf`
        
        // Générer le HTML de la facture
        tempDiv.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
            ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
            <h1 style="color: #0066cc; font-size: 24px; margin: 10px 0;">${shopInfo.name || 'Boutique'}</h1>
            <h2 style="font-size: 18px; margin: 5px 0;">FACTURE</h2>
            <p style="margin: 5px 0;">N°${selectedSale.id}</p>
            <p style="margin: 5px 0;">${formatDate(new Date(selectedSale.createdAt))}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-size: 14px; margin-bottom: 10px;">Informations Client</h3>
            <p><strong>Nom:</strong> ${selectedSale.customerName}</p>
            <p><strong>Date:</strong> ${formatDate(new Date(selectedSale.createdAt))}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-size: 14px; margin-bottom: 10px;">Informations de Paiement</h3>
            <p><strong>Mode:</strong> ${getPaymentMethod(selectedSale.paymentMethod)?.label || selectedSale.paymentMethod}</p>
            ${selectedSale.amountReceived > 0 ? `
              <p><strong>Montant reçu:</strong> ${formatCurrency(selectedSale.amountReceived)}</p>
              ${selectedSale.change > 0 ? `<p><strong>Monnaie rendue:</strong> ${formatCurrency(selectedSale.change)}</p>` : ''}
            ` : ''}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix Unitaire</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedSale.items && selectedSale.items.length > 0 ? selectedSale.items.map(item => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: center;">Aucun article détaillé</td></tr>'}
            </tbody>
            <tfoot>
              <tr style="background: #f5f5f5; font-weight: bold;">
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">TOTAL:</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: green;">${formatCurrency(selectedSale.total)}</td>
              </tr>
            </tfoot>
          </table>
          
          ${selectedSale.notes ? `
            <div style="margin: 20px 0;">
              <h3 style="font-size: 14px; margin-bottom: 10px;">Notes</h3>
              <p style="background: #f9f9f9; padding: 10px; border-radius: 4px;">${selectedSale.notes}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
            <p>Merci pour votre confiance !</p>
            ${(shopInfo.address || shopInfo.phone || shopInfo.email) ? `
              <p>
                ${shopInfo.address || ''}${shopInfo.address && (shopInfo.phone || shopInfo.email) ? ' • ' : ''}
                ${shopInfo.phone ? '📞 ' + shopInfo.phone : ''}${shopInfo.phone && shopInfo.email ? ' • ' : ''}
                ${shopInfo.email ? '✉️ ' + shopInfo.email : ''}
              </p>
            ` : ''}
          </div>
        `
        
        document.body.appendChild(tempDiv)
        
        // Générer le PDF
        html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true
        }).then(canvas => {
          const imgData = canvas.toDataURL('image/png')
          const pdf = new jsPDF('p', 'mm', 'a4')
          
          const imgWidth = 210
          const pageHeight = 297
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          let heightLeft = imgHeight
          let position = 0
          
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
          
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
          }
          
          pdf.save(fileName)
          document.body.removeChild(tempDiv)
          toast.success('Facture PDF générée avec succès')
        }).catch(error => {
          console.error('Erreur lors de la génération du PDF:', error)
          toast.error('Erreur lors de la génération du PDF')
          document.body.removeChild(tempDiv)
        })
      })
    })
  }

  const openSaleDetails = (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ventes</h1>
          <p className="text-slate-500">Enregistrez et suivez vos ventes</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} />
          {t('newSale')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="sales-list-search"
          name="salesSearch"
          type="search"
          placeholder={t('searchSales')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
          aria-label={t('searchSales')}
        />
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      {sale.customerName}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      {formatDate(sale.createdAt || new Date())}
                    </div>
                  </td>
                  <td className="font-semibold text-green-600">
                    {formatCurrency(sale.total || 0)}
                  </td>
                  <td>
                    <span className={`badge ${getPaymentMethod(sale.paymentMethod)?.color ? getPaymentMethod(sale.paymentMethod).color : 'badge-gray'}`}>
                      {getPaymentMethod(sale.paymentMethod)?.label || sale.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => openSaleDetails(sale)}
                      className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            {search ? 'Aucune vente trouvée' : 'Aucune vente'}
          </h3>
          <p className="text-slate-500">
            {search ? 'Essayez une autre recherche' : 'Enregistrez votre première vente pour commencer'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{t('newSale')}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="sale-customer-name" className="label-field">Nom du client</label>
                <input
                  id="sale-customer-name"
                  name="customerName"
                  type="text"
                  autoComplete="name"
                  value={form.customerName}
                  onChange={e => setForm({...form, customerName: e.target.value})}
                  className="input-field"
                  placeholder="Client (optionnel)"
                />
              </div>

              {/* Product Selection */}
              <div>
                <label htmlFor="sale-product-search" className="label-field">Article</label>
                
                {/* Panier en temps réel */}
                {cartItems.length > 0 && (
                  <div className="mb-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary-800">
                        🛒 Panier ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})
                      </span>
                      <span className="text-sm font-bold text-primary-600">
                        {(() => {
                          try {
                            const total = cartItems.reduce((sum, item) => {
                              const itemTotal = parseFloat(item.totalPrice) || 0
                              return sum + itemTotal
                            }, 0)
                            return formatCurrency(total)
                          } catch (error) {
                            console.error('Erreur calcul total panier:', error)
                            return '0 FCFA'
                          }
                        })()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {cartItems.map((item, index) => (
                        <div key={item.productId || index} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700">
                            {item.productName || 'Produit'} x{item.quantity || 1}
                          </span>
                          <span className="text-slate-600 font-medium">
                            {(() => {
                              try {
                                return formatCurrency(parseFloat(item.totalPrice) || 0)
                              } catch (error) {
                                console.error('Erreur formatage prix:', error)
                                return '0 FCFA'
                              }
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div
                  className="relative product-dropdown-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="sale-product-search"
                        name="productSearch"
                        type="search"
                        autoComplete="off"
                        value={productSearch}
                        onChange={e => {
                          setProductSearch(e.target.value)
                          setShowProductDropdown(true)
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Cliquez sur un produit pour l'ajouter au panier..."
                        className="input-field pl-10"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSave()}
                      className="btn-primary flex items-center gap-2 px-4 shrink-0"
                      disabled={!cartItems.length || saving}
                    >
                      <ShoppingCart size={18} />
                      <span>
                        {cartItems.length
                          ? `Panier (${cartItems.length})`
                          : 'Panier vide'}
                      </span>
                    </button>
                  </div>

                  <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={(e) => addProductToCart(product, e)}
                              className="w-full text-left px-4 py-3 min-h-[48px] hover:bg-slate-50 active:bg-primary-50 border-b border-slate-100 flex items-center justify-between touch-manipulation select-none cursor-pointer"
                            >
                              <div>
                                <div className="font-medium text-slate-800">{product.name}</div>
                                <div className="text-sm text-slate-500">Stock: {product.stock}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-primary-600">{formatCurrency(getProductSellingPrice(product))}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            {productSearch 
                              ? (products.some(p => p.name.toLowerCase().includes(productSearch.toLowerCase())) 
                                  ? 'Produit trouvé mais en rupture de stock' 
                                  : 'Aucun produit trouvé')
                              : 'Tous les produits sont en rupture de stock'
                            }
                          </div>
                        )}
                  </div>
                </div>
              </div>

              {/* Selected Items */}
              {cartItems.length > 0 && (
                <div>
                  <p className="label-field" id="sale-items-label">Articles sélectionnés</p>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{item.productName}</p>
                            <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / {item.productUnit || 'pièce'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`sale-qty-${item.productId}`}
                              name={`quantity-${item.productId}`}
                              type="number"
                              min="1"
                              max={getAvailableStock(item.productId)}
                              value={item.quantity}
                              onChange={e => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                              aria-label={`Quantité pour ${item.productName}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeItemFromSale(item.productId)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-right">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-slate-800">Total:</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(form.total || 0)}</span>
                </div>

                {/* Montant reçu et monnaie */}
                {form.paymentMethod === 'especes' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="sale-amount-received" className="label-field">Montant reçu</label>
                      <input
                        id="sale-amount-received"
                        name="amountReceived"
                        type="number"
                        value={form.amountReceived || ''}
                        onChange={e => updateAmountReceived(e.target.value)}
                        className="input-field"
                        placeholder="Entrez le montant reçu"
                        min="0"
                        step="100"
                      />
                    </div>

                    {form.amountReceived > 0 && (
                      <div className={`p-4 rounded-lg border ${
                        form.change >= 0 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800">Monnaie à rendre:</span>
                          <span className={`text-xl font-bold ${
                            form.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(form.change || 0))}
                          </span>
                        </div>
                        {form.change >= 0 ? (
                          <p className="text-sm text-green-700 mt-1">✅ Montant suffisant</p>
                        ) : (
                          <p className="text-sm text-red-700 mt-1">❌ Montant insuffisant</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="sale-payment-method" className="label-field">Mode de paiement</label>
                <select
                  id="sale-payment-method"
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={e => {
                    const newPaymentMethod = e.target.value
                    const newChange = newPaymentMethod === 'especes' ? calculateChange(form.total, form.amountReceived) : 0
                    setForm({
                      ...form,
                      paymentMethod: newPaymentMethod,
                      change: newChange
                    })
                  }}
                  className="input-field"
                >
                  <option value="especes">Espèces</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="carte_bancaire">Carte Bancaire</option>
                  <option value="credit">À Crédit</option>
                </select>
              </div>

              <div>
                <label htmlFor="sale-notes" className="label-field">Notes</label>
                <textarea
                  id="sale-notes"
                  name="notes"
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Vente */}
      {showDetailsModal && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={startEditingSale}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <Edit size={18} />
                Modifier la vente
              </button>
              <button 
                onClick={printAdvancedFacture}
                className="btn-primary flex items-center justify-center gap-2 w-full"
              >
                <Printer size={18} />
                Imprimer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Vente */}
      {isEditingSale && editingSaleData && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Modifier la Vente N°{editingSaleData.id}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={saveEditedSale}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <div className="spinner w-4 h-4"></div> : null}
                  Sauvegarder
                </button>
                <button 
                  onClick={cancelEditingSale}
                  className="btn-secondary flex items-center gap-2"
                >
                  Annuler
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom du Client</label>
                <input
                  type="text"
                  value={editingSaleData.customerName}
                  onChange={(e) => setEditingSaleData({
                    ...editingSaleData,
                    customerName: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom du client"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mode de Paiement</label>
                <select
                  value={editingSaleData.paymentMethod}
                  onChange={(e) => setEditingSaleData({
                    ...editingSaleData,
                    paymentMethod: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Articles</h3>
                <button 
                  onClick={addEditingSaleItem}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Ajouter un article
                </button>
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 border-b">Article</th>
                      <th className="text-center p-3 border-b">Quantité</th>
                      <th className="text-right p-3 border-b">Prix Unitaire</th>
                      <th className="text-right p-3 border-b">Total</th>
                      <th className="text-center p-3 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingSaleData.items && editingSaleData.items.length > 0 ? (
                      editingSaleData.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.productName || ''}
                              onChange={(e) => updateEditingSaleItem(index, 'productName', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded"
                              placeholder="Nom de l'article"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateEditingSaleItem(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-center"
                              min="1"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateEditingSaleItem(index, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-right"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(item.totalPrice || 0)}
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => removeEditingSaleItem(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center p-4 text-slate-500">
                          Aucun article
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan="3" className="text-right p-3">TOTAL:</td>
                      <td className="text-right p-3 text-lg text-green-600">{formatCurrency(editingSaleData.total || 0)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Montant Reçu</label>
                <input
                  type="number"
                  value={editingSaleData.amountReceived || ''}
                  onChange={(e) => {
                    const amountReceived = parseFloat(e.target.value) || 0
                    const total = parseFloat(editingSaleData.total) || 0
                    setEditingSaleData({
                      ...editingSaleData,
                      amountReceived,
                      change: amountReceived - total
                    })
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Montant reçu"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monnaie à Rendre</label>
                <input
                  type="number"
                  value={editingSaleData.change || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  placeholder="Monnaie à rendre"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                value={editingSaleData.notes || ''}
                onChange={(e) => setEditingSaleData({
                  ...editingSaleData,
                  notes: e.target.value
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
