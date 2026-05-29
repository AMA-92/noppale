import React, { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync, createPortal } from 'react-dom'
import { appCache, appStorage } from '../utils/storage'
import { formatDate, getPaymentMethod, formatCurrency, getProductSellingPrice } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { useProductsRealtime, useSalesRealtime } from '../hooks/useRealtime.jsx'
import { Plus, Search, ShoppingCart, X, DollarSign, Calendar, User, Package, Printer, Eye, Edit, CreditCard, CheckCircle, Clock, AlertCircle, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateSaleData, sanitizeString, truncateString } from '../utils/security'
import InvoiceTemplate from '../components/InvoiceTemplate'

const emptySale = {
  customerName: '',
  items: [],
  total: 0,
  amountReceived: 0,
  change: 0,
  paymentMethod: 'especes',
  notes: '',
  createdAt: new Date().toISOString(),
  initialPayment: 0,
  dueDate: ''
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
  
  const [sales, setSales] = useState(() => appCache.getSales())
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [form, setForm] = useState(emptySale)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(() => appCache.getSales().length === 0)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState(() => appCache.getProducts())
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

  // États pour la gestion des paiements
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'especes',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  })
  const [salePayments, setSalePayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)

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

  useProductsRealtime(() => {
    loadProducts()
  })

  const loadProducts = async () => {
    try {
      const products = await appStorage.getProducts()
      appCache.setProducts(products)
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
    if (!sales.length) setLoading(true)
    try {
      const sales = await appStorage.getSales()
      appCache.setSales(sales)
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

  useEffect(() => {
    if (!showModal) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('sale-modal-open')
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.classList.remove('sale-modal-open')
    }
  }, [showModal])

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

    if (quantity === '') {
      updateCart((currentItems) =>
        currentItems.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: '',
                totalPrice: 0
              }
            : item
        )
      )
      return
    }

    // Permettre les valeurs vides temporairement (l'utilisateur supprime pour retaper)
    const newQuantity = quantity === null ? 0 : parseFloat(quantity)
    if (isNaN(newQuantity)) return

    // Si la valeur est 0 ou vide, la placer à 1 (minimum)
    const finalQuantity = Math.max(1, newQuantity)
    const availableStock = parseInt(product.stock || 0)

    // Validation du stock disponible
    if (finalQuantity > availableStock) {
      toast.error(`Quantité trop élevée ! Il ne reste que ${availableStock} unité(s) de ${product.name}`)
      return
    }

    updateCart((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: finalQuantity,
              totalPrice: calculateItemTotal(finalQuantity, parseFloat(item.unitPrice) || 0)
            }
          : item
      )
    )
  }

  const adjustItemQuantity = (productId, delta) => {
    const currentItem = getCartItems().find((item) => item.productId === productId)
    const currentQuantity = parseInt(currentItem?.quantity || 1, 10)
    updateItemQuantity(productId, currentQuantity + delta)
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

    // Vérification pour les ventes à crédit avec avance
    const initialPayment = parseFloat(form.initialPayment) || 0
    if (sanitizedSale.paymentMethod === 'credit' && initialPayment > 0) {
      if (initialPayment > saleTotal) {
        toast.error('L\'avance ne peut pas dépasser le montant total')
        return
      }
    }

    const salePayload = {
      customerName: sanitizedSale.customerName,
      total: sanitizedSale.total,
      paymentMethod: sanitizedSale.paymentMethod,
      notes: sanitizedSale.notes,
      items: sanitizedSale.items,
      dueDate: form.dueDate || null,
      initialPayment: initialPayment // Ajouter l'avance initiale pour les ventes à crédit
    }

    // Calculer paidAmount et remainingAmount pour l'optimistic update
    const isCredit = salePayload.paymentMethod === 'credit'
    const paidAmount = isCredit ? initialPayment : salePayload.total
    const remainingAmount = isCredit ? (salePayload.total - paidAmount) : 0
    const paymentStatus = isCredit ? (paidAmount > 0 ? 'partial' : 'pending') : 'paid'

    const optimisticSale = {
      id: `temp-${Date.now()}`,
      customerName: salePayload.customerName,
      customer_name: salePayload.customerName,
      total: salePayload.total,
      paymentMethod: salePayload.paymentMethod,
      payment_method: salePayload.paymentMethod,
      paidAmount: paidAmount,
      paid_amount: paidAmount,
      remainingAmount: remainingAmount,
      remaining_amount: remainingAmount,
      paymentStatus: paymentStatus,
      payment_status: paymentStatus,
      notes: salePayload.notes,
      items: salePayload.items,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    setSaving(true)
    cartItemsRef.current = []
    setCartItems([])
    setShowModal(false)
    setForm(emptySale)
    setCurrentItem(emptyItem)
    setProductSearch('')
    setSales((prev) => {
      const next = [optimisticSale, ...prev]
      appCache.setSales(next)
      return next
    })
    setProducts((prev) =>
      {
        const next = prev.map((product) => {
        const soldItem = salePayload.items.find((item) => item.productId === product.id)
        if (!soldItem) return product
        return {
          ...product,
          stock: Math.max(0, (parseInt(product.stock, 10) || 0) - (parseInt(soldItem.quantity, 10) || 0))
        }
        })
        appCache.setProducts(next)
        return next
      }
    )

    appStorage.addSale(salePayload)
      .then(async (savedSale) => {
        if (savedSale) {
          // Si c'est une vente à crédit avec avance initiale, ajouter le paiement
          if (salePayload.paymentMethod === 'credit' && initialPayment > 0) {
            try {
              await appStorage.addSalePayment(savedSale.id, {
                amount: initialPayment,
                paymentMethod: 'especes',
                notes: 'Avance initiale lors de la vente',
                paymentDate: new Date().toISOString()
              })
            } catch (paymentError) {
              console.error('Erreur lors de l\'ajout de l\'avance initiale:', paymentError)
            }
          }

          setSales((prev) => {
            // Fusionner les données en préservant les valeurs calculées si savedSale ne les a pas
            const mergedSale = {
              ...optimisticSale,
              ...savedSale,
              // Préserver les valeurs calculées si savedSale ne les a pas définies
              paidAmount: savedSale.paidAmount || savedSale.paid_amount || optimisticSale.paidAmount || 0,
              paid_amount: savedSale.paid_amount || savedSale.paidAmount || optimisticSale.paid_amount || 0,
              remainingAmount: savedSale.remainingAmount || savedSale.remaining_amount || optimisticSale.remainingAmount || 
                             (savedSale.total - (savedSale.paidAmount || savedSale.paid_amount || 0)),
              remaining_amount: savedSale.remaining_amount || savedSale.remainingAmount || optimisticSale.remaining_amount ||
                                (savedSale.total - (savedSale.paidAmount || savedSale.paid_amount || 0)),
              paymentStatus: savedSale.paymentStatus || savedSale.payment_status || optimisticSale.paymentStatus || 'pending',
              payment_status: savedSale.payment_status || savedSale.paymentStatus || optimisticSale.payment_status || 'pending',
              paymentMethod: savedSale.paymentMethod || savedSale.payment_method || optimisticSale.paymentMethod,
              payment_method: savedSale.payment_method || savedSale.paymentMethod || optimisticSale.payment_method
            }
            const next = prev.map((sale) => (sale.id === optimisticSale.id ? mergedSale : sale))
            appCache.setSales(next)
            return next
          })
        }
        toast.success('Vente enregistrée et stock mis à jour')
        Promise.all([loadSales(), loadProducts()]).catch((err) => {
          console.error('Erreur lors du rechargement:', err)
        })
      })
      .catch((e) => {
        console.error('Erreur détaillée:', e)
        toast.error('Erreur lors de l\'enregistrement de la vente: ' + e.message)
        Promise.all([loadSales(), loadProducts()]).catch(console.error)
      })
      .finally(() => setSaving(false))
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

  const saveEditedSale = async () => {
    if (!editingSaleData?.items?.length) {
      toast.error('Ajoutez au moins un article')
      return
    }

    const normalizedItems = normalizeSaleItems(editingSaleData.items)
    const invalidItem = normalizedItems.find((item) => item.unitPrice <= 0 || item.quantity <= 0)
    if (invalidItem) {
      toast.error(`Article invalide: ${invalidItem.productName || 'Produit'}`)
      return
    }

    const updatedTotal = calculateTotal(normalizedItems)
    const sanitizedSale = {
      customerName: sanitizeString(truncateString(editingSaleData.customerName?.trim() || 'Client', 200)),
      total: updatedTotal,
      paymentMethod: editingSaleData.paymentMethod,
      notes: sanitizeString(truncateString(editingSaleData.notes || '', 500)),
      items: normalizedItems.map(item => ({
        ...item,
        productName: sanitizeString(truncateString(item.productName || '', 200))
      }))
    }

    setSaving(true)
    try {
      await appStorage.updateSale(editingSaleData.id, sanitizedSale)
      await loadSales()
      await loadProducts()
      toast.success('Vente modifiée et stock synchronisé')
      setIsEditingSale(false)
      setEditingSaleData(null)
    } catch (error) {
      console.error('Erreur modification vente:', error)
      toast.error('Erreur lors de la modification de la vente: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEditingSale = () => {
    setIsEditingSale(false)
    setEditingSaleData(null)
  }

  // Fonctions de gestion des paiements
  const openPaymentModal = async (sale) => {
    setSelectedSale(sale)
    setShowPaymentModal(true)
    setLoadingPayments(true)
    try {
      const payments = await appStorage.getSalePayments(sale.id)
      setSalePayments(payments)
    } catch (error) {
      console.error('Erreur chargement paiements:', error)
      toast.error('Erreur lors du chargement des paiements')
    } finally {
      setLoadingPayments(false)
    }
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedSale(null)
    setSalePayments([])
    setPaymentForm({
      amount: '',
      paymentMethod: 'especes',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0]
    })
  }

  const handleAddPayment = async () => {
    if (!selectedSale) return

    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }

    const remainingAmount = selectedSale.remainingAmount || (selectedSale.total - (selectedSale.paidAmount || 0))
    if (amount > remainingAmount) {
      toast.error(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(remainingAmount)})`)
      return
    }

    try {
      await appStorage.addSalePayment(selectedSale.id, {
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
        paymentDate: new Date(paymentForm.paymentDate).toISOString()
      })

      toast.success('Paiement ajouté avec succès')

      // Recharger les paiements
      const updatedPayments = await appStorage.getSalePayments(selectedSale.id)
      setSalePayments(updatedPayments)

      // Mettre à jour la liste des ventes
      await loadSales()

      // Reset form
      setPaymentForm({
        amount: '',
        paymentMethod: 'especes',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Erreur ajout paiement:', error)
      toast.error('Erreur lors de l\'ajout du paiement')
    }
  }

  const getPaymentStatusBadge = (sale) => {
    if (sale.paymentMethod !== 'credit' && sale.payment_method !== 'credit') return null

    const status = sale.paymentStatus || sale.payment_status || 'pending'
    const remaining = sale.remainingAmount || sale.remaining_amount || (sale.total - (sale.paidAmount || sale.paid_amount || 0))

    if (status === 'paid' || remaining <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle size={12} />
          Payé
        </span>
      )
    }

    if (status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <Clock size={12} />
          Partiel
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
        <AlertCircle size={12} />
        En attente
      </span>
    )
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

  const printAdvancedFacture = async () => {
    if (!selectedSale) return
    
    // Create a temporary container for the invoice
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    document.body.appendChild(tempDiv)
    
    // Render the InvoiceTemplate component
    const { createRoot } = await import('react-dom/client')
    const root = createRoot(tempDiv)
    
    const invoiceData = {
      shopLogo: shopInfo.logo || '',
      shopName: shopInfo.name || 'MA BOUTIQUE',
      customerName: selectedSale.customerName || 'Client',
      invoiceNumber: selectedSale.id,
      paymentMethod: getPaymentMethod(selectedSale.paymentMethod)?.label || selectedSale.paymentMethod,
      items: selectedSale.items?.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalPrice
      })) || [],
      total: formatCurrency(selectedSale.total),
      phone: shopInfo.phone || '',
      email: shopInfo.email || '',
      address: shopInfo.address || '',
      date: formatDate(new Date(selectedSale.createdAt)),
      autoExport: true
    }
    
    root.render(
      React.createElement(InvoiceTemplate, invoiceData)
    )
    
    // Clean up after export
    setTimeout(() => {
      root.unmount()
      document.body.removeChild(tempDiv)
    }, 2000)
  }

  const openSaleDetails = (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }

  const markAsRepaid = async (sale) => {
    try {
      await appStorage.updateSaleCreditStatus(sale.id, 'repaid')
      toast.success('Vente marquée comme remboursée')
      await loadSales()
    } catch (error) {
      console.error('Erreur lors du marquage comme remboursé:', error)
      toast.error('Erreur lors du marquage comme remboursé')
    }
  }

  const getCreditStatusBadge = (sale) => {
    if (sale.paymentMethod !== 'credit') return null
    
    if (sale.creditStatus === 'repaid') {
      return (
        <span className="badge badge-green">
          Remboursé
        </span>
      )
    }
    
    return (
      <button
        onClick={() => markAsRepaid(sale)}
        className="badge badge-orange hover:bg-orange-600 cursor-pointer transition-colors"
        title="Marquer comme remboursé"
      >
        À crédit
      </button>
    )
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
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="sales-list-search"
          name="salesSearch"
          type="search"
          placeholder={t('searchSales')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field-with-icon"
          aria-label={t('searchSales')}
        />
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="table-container">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-200">
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Client</th>
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Montant</th>
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Paiement</th>
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Statut paiement</th>
                <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id} className="border-b border-slate-300 hover:bg-slate-50">
                  <td className="border border-slate-300 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      {sale.customerName}
                    </div>
                  </td>
                  <td className="border border-slate-300 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      {formatDate(sale.createdAt || new Date())}
                    </div>
                  </td>
                  <td className="border border-slate-300 px-4 py-3 font-semibold text-green-600">
                    {formatCurrency(sale.total || 0)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3">
                    <span className={`badge ${getPaymentMethod(sale.paymentMethod)?.color ? getPaymentMethod(sale.paymentMethod).color : 'badge-gray'}`}>
                      {getPaymentMethod(sale.paymentMethod)?.label || sale.paymentMethod}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getPaymentStatusBadge(sale)}
                      {(sale.paymentMethod === 'credit' || sale.payment_method === 'credit') && (
                        <span className="text-xs text-slate-500">
                          Payé: {formatCurrency(sale.paidAmount || sale.paid_amount || 0)} / Reste: {formatCurrency(sale.remainingAmount || sale.remaining_amount || (sale.total - (sale.paidAmount || sale.paid_amount || 0)))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="border border-slate-300 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSaleDetails(sale)}
                        className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                      >
                        <Eye size={14} />
                        Détails
                      </button>
                      {(sale.paymentMethod === 'credit' || sale.payment_method === 'credit') && (
                        <button
                          onClick={() => openPaymentModal(sale)}
                          className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
                          title="Ajouter un paiement"
                        >
                          <Banknote size={14} />
                          Paiement
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Supprimer cette vente ?')) return
                          try {
                            await appStorage.deleteSale(sale.id)
                            await loadSales()
                            await loadProducts()
                            toast.success('Vente supprimée et stock synchronisé')
                          } catch (err) {
                            console.error('Erreur suppression vente:', err)
                            toast.error('Erreur lors de la suppression de la vente')
                          }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
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

      {showModal && createPortal(
        <div
          className="sale-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="sale-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sale-modal-header">
              <h2 id="sale-modal-title" className="text-xl font-bold text-slate-800">{t('newSale')}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg touch-manipulation"
                aria-label="Fermer"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="sale-modal-body space-y-4">
                <section className="sale-product-section">
                  <label htmlFor="sale-product-search" className="label-field">Choisir un produit</label>
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="sale-product-search"
                      name="productSearch"
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="input-field-with-icon w-full"
                    />
                  </div>

                  <div className="sale-product-list">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={(e) => addProductToCart(product, e)}
                          className="sale-product-row"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="font-medium text-slate-800 truncate">{product.name}</div>
                            <div className="text-sm text-slate-500">Stock: {product.stock}</div>
                          </div>
                          <div className="font-semibold text-primary-600 flex-shrink-0">
                            {formatCurrency(getProductSellingPrice(product))}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-center text-slate-500 text-sm">
                        {productSearch
                          ? products.some((p) => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                            ? 'Produit trouvé mais en rupture de stock'
                            : 'Aucun produit trouvé'
                          : 'Aucun produit en stock'}
                      </p>
                    )}
                  </div>
                </section>

                {cartItems.length > 0 && (
                  <section className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary-800">Panier ({cartItems.length})</span>
                      <span className="text-sm font-bold text-primary-600">
                        {formatCurrency(cartItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0))}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {cartItems.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-primary-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => adjustItemQuantity(item.productId, -1)}
                              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 touch-manipulation"
                              aria-label={`Diminuer la quantité ${item.productName}`}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={getAvailableStock(item.productId)}
                              value={item.quantity}
                              inputMode="numeric"
                              onChange={(e) => {
                                const raw = e.target.value
                                updateItemQuantity(item.productId, raw === '' ? '' : parseInt(raw, 10))
                              }}
                              onBlur={(e) => {
                                if (e.target.value === '') updateItemQuantity(item.productId, 1)
                              }}
                              className="w-14 h-8 px-1 border border-slate-200 rounded text-center text-sm"
                              aria-label={`Quantité ${item.productName}`}
                            />
                            <button
                              type="button"
                              onClick={() => adjustItemQuantity(item.productId, 1)}
                              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 touch-manipulation"
                              aria-label={`Augmenter la quantité ${item.productName}`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemFromSale(item.productId)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded touch-manipulation"
                              aria-label="Retirer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <label htmlFor="sale-customer-name" className="label-field">Nom du client</label>
                  <input
                    id="sale-customer-name"
                    name="customerName"
                    type="text"
                    autoComplete="name"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="input-field w-full"
                    placeholder="Client (optionnel)"
                  />
                </section>

                <section className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-slate-800">Total:</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(form.total || 0)}</span>
                  </div>

                  {form.paymentMethod === 'especes' && (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="sale-amount-received" className="label-field">Montant reçu</label>
                        <input
                          id="sale-amount-received"
                          name="amountReceived"
                          type="number"
                          inputMode="numeric"
                          value={form.amountReceived || ''}
                          onChange={(e) => updateAmountReceived(e.target.value)}
                          className="input-field w-full"
                          placeholder="Montant reçu"
                          min="0"
                          step="100"
                        />
                      </div>

                      {form.amountReceived > 0 && (
                        <div
                          className={`p-4 rounded-lg border ${
                            form.change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">Monnaie à rendre:</span>
                            <span className={`text-xl font-bold ${form.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(form.change || 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <label htmlFor="sale-payment-method" className="label-field">Mode de paiement</label>
                  <select
                    id="sale-payment-method"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={(e) => {
                      const newPaymentMethod = e.target.value
                      const newChange =
                        newPaymentMethod === 'especes' ? calculateChange(form.total, form.amountReceived) : 0
                      setForm({ ...form, paymentMethod: newPaymentMethod, change: newChange })
                    }}
                    className="input-field w-full"
                  >
                    <option value="especes">Espèces</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="carte_bancaire">Carte Bancaire</option>
                    <option value="credit">À Crédit / Avance</option>
                  </select>
                </section>

                {/* Champs pour les ventes à crédit */}
                {form.paymentMethod === 'credit' && (
                  <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 font-medium">
                      <CreditCard size={18} />
                      <span>Paiement échelonné</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sale-initial-payment" className="label-field text-sm">Avance (optionnel)</label>
                        <input
                          id="sale-initial-payment"
                          name="initialPayment"
                          type="number"
                          inputMode="numeric"
                          value={form.initialPayment || ''}
                          onChange={(e) => setForm({ ...form, initialPayment: parseFloat(e.target.value) || 0 })}
                          className="input-field w-full"
                          placeholder="Montant avance"
                          min="0"
                          step="100"
                        />
                        {form.initialPayment > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Reste: {formatCurrency((form.total || 0) - (form.initialPayment || 0))}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="sale-due-date" className="label-field text-sm">Date d'échéance</label>
                        <input
                          id="sale-due-date"
                          name="dueDate"
                          type="date"
                          value={form.dueDate || ''}
                          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <section>
                  <label htmlFor="sale-notes" className="label-field">Notes</label>
                  <textarea
                    id="sale-notes"
                    name="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input-field w-full"
                    rows={2}
                  />
                </section>
              </div>

              <div className="sale-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !cartItems.length} className="btn-primary">
                  {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal D├®tails Vente */}
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

      {/* Modal ├ëdition Vente */}
      {isEditingSale && editingSaleData && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Modifier la Vente N┬░{editingSaleData.id}</h2>
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
                  <option value="especes">Esp├¿ces</option>
                  <option value="carte">Carte</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="cheque">Ch├¿que</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Articles</h3>
                <button
                  onClick={addEditingSaleItem}
                  className="btn-primary flex items-center gap-2"
                  type="button"
                >
                  <Plus size={18} />
                  Ajouter un article
                </button>
              </div>

              {editingSaleData.items && editingSaleData.items.length > 0 ? (
                <div className="space-y-3">
                  {editingSaleData.items.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Article</label>
                          <input
                            type="text"
                            value={item.productName || ''}
                            onChange={(e) => updateEditingSaleItem(index, 'productName', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            placeholder="Nom de l'article"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                            <input
                              type="number"
                              value={item.quantity ?? ''}
                              onChange={(e) => updateEditingSaleItem(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center"
                              min="1"
                              inputMode="numeric"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prix</label>
                            <input
                              type="number"
                              value={item.unitPrice ?? ''}
                              onChange={(e) => updateEditingSaleItem(index, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-600">Total article</div>
                          <div className="font-semibold text-green-700">{formatCurrency(item.totalPrice || 0)}</div>
                          <button
                            type="button"
                            onClick={() => removeEditingSaleItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            aria-label="Supprimer l'article"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-slate-500">Aucun article</div>
              )}

              <div className="mt-4 flex items-center justify-end">
                <div className="text-right">
                  <div className="text-sm text-slate-600">TOTAL</div>
                  <div className="text-lg font-bold text-green-700">{formatCurrency(editingSaleData.total || 0)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Montant Re├ºu</label>
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
                  placeholder="Montant re├ºu"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monnaie ├á Rendre</label>
                <input
                  type="number"
                  value={editingSaleData.change || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  placeholder="Monnaie ├á rendre"
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
                placeholder="Notes suppl├®mentaires..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaymentModal && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Paiement - Vente #{selectedSale.id?.slice(-6)}
              </h2>
              <button
                onClick={closePaymentModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Client:</span>
                <span className="font-medium">{selectedSale.customerName || 'Client'}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Montant total:</span>
                <span className="font-semibold">{formatCurrency(selectedSale.total || 0)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Déjà payé:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(selectedSale.paidAmount || selectedSale.paid_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-slate-800">Reste à payer:</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(
                    (selectedSale.total || 0) - (selectedSale.paidAmount || selectedSale.paid_amount || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Historique des paiements */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Historique des paiements</h3>
              {loadingPayments ? (
                <div className="text-center py-4">
                  <div className="spinner mx-auto"></div>
                </div>
              ) : salePayments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {salePayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{formatCurrency(payment.amount || 0)}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(payment.paymentDate || payment.createdAt)}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-slate-400">{payment.notes}</p>
                        )}
                      </div>
                      <span className="badge badge-green text-xs">
                        {getPaymentMethod(payment.paymentMethod || payment.payment_method)?.label || payment.paymentMethod}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Aucun paiement enregistré</p>
              )}
            </div>

            {/* Formulaire d'ajout de paiement */}
            {(selectedSale.remainingAmount ||
              (selectedSale.total - (selectedSale.paidAmount || selectedSale.paid_amount || 0))) > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Ajouter un paiement</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Montant</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="input-field w-full"
                      placeholder="Montant du paiement"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="especes">Espèces</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="carte_bancaire">Carte Bancaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optionnel)</label>
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="input-field w-full"
                      placeholder="Notes sur le paiement"
                    />
                  </div>
                  <button
                    onClick={handleAddPayment}
                    className="btn-primary w-full"
                    disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Ajouter le paiement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
