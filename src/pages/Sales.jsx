import React, { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync, createPortal } from 'react-dom'
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
        
        // Générer le HTML de la facture avec le nouveau design professionnel
        tempDiv.innerHTML = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 210mm; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
              <div style="flex: 1;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="max-height: 80px; margin-bottom: 10px;">` : '<div style="border: 2px dashed #ccc; padding: 20px; text-align: center; color: #999; font-size: 12px; margin-bottom: 10px;">VOTRE LOGO ICI</div>'}
                <h1 style="color: #0066cc; font-size: 28px; margin: 0 0 5px 0; font-weight: bold;">${shopInfo.name || 'Ma boutique'}</h1>
              </div>
              <div style="text-align: right; flex: 1;">
                <h2 style="color: #333; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 2px;">FACTURE</h2>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">N°${selectedSale.id}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">${formatDate(new Date(selectedSale.createdAt))}</p>
              </div>
            </div>

            <!-- Client Information -->
            <div style="background: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h3 style="color: #0066cc; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Informations Client</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <span style="color: #666; font-size: 12px;">Nom:</span>
                  <p style="color: #333; font-size: 14px; margin: 2px 0 0 0; font-weight: 500;">${selectedSale.customerName || 'Client'}</p>
                </div>
                <div>
                  <span style="color: #666; font-size: 12px;">Date:</span>
                  <p style="color: #333; font-size: 14px; margin: 2px 0 0 0; font-weight: 500;">${formatDate(new Date(selectedSale.createdAt))}</p>
                </div>
              </div>
            </div>

            <!-- Payment Information -->
            <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h3 style="color: #28a745; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Informations de Paiement</h3>
              <div>
                <span style="color: #666; font-size: 12px;">Mode:</span>
                <p style="color: #333; font-size: 14px; margin: 2px 0 0 0; font-weight: 500;">${getPaymentMethod(selectedSale.paymentMethod)?.label || selectedSale.paymentMethod}</p>
              </div>
              ${selectedSale.amountReceived > 0 ? `
                <div style="margin-top: 10px;">
                  <span style="color: #666; font-size: 12px;">Montant reçu:</span>
                  <p style="color: #333; font-size: 14px; margin: 2px 0 0 0; font-weight: 500;">${formatCurrency(selectedSale.amountReceived)}</p>
                  ${selectedSale.change > 0 ? `
                    <div style="margin-top: 5px;">
                      <span style="color: #666; font-size: 12px;">Monnaie rendue:</span>
                      <p style="color: #28a745; font-size: 14px; margin: 2px 0 0 0; font-weight: 500;">${formatCurrency(selectedSale.change)}</p>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white;">
                  <th style="border: 1px solid #0052a3; padding: 12px; text-align: left; font-weight: 600; font-size: 13px;">ARTICLE</th>
                  <th style="border: 1px solid #0052a3; padding: 12px; text-align: center; font-weight: 600; font-size: 13px;">QUANTITÉ</th>
                  <th style="border: 1px solid #0052a3; padding: 12px; text-align: right; font-weight: 600; font-size: 13px;">PRIX UNITAIRE</th>
                  <th style="border: 1px solid #0052a3; padding: 12px; text-align: right; font-weight: 600; font-size: 13px;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${selectedSale.items && selectedSale.items.length > 0 ? selectedSale.items.map((item, index) => `
                  <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="border: 1px solid #dee2e6; padding: 12px; font-size: 13px;">${item.productName}</td>
                    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: center; font-size: 13px;">${item.quantity}</td>
                    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-size: 13px;">${formatCurrency(item.unitPrice)}</td>
                    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: #666;">Aucun article détaillé</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: white; font-weight: bold;">
                  <td colspan="3" style="border: 1px solid #218838; padding: 15px; text-align: right; font-size: 16px;">TOTAL:</td>
                  <td style="border: 1px solid #218838; padding: 15px; text-align: right; font-size: 18px;">${formatCurrency(selectedSale.total)}</td>
                </tr>
              </tfoot>
            </table>

            ${selectedSale.notes ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #856404; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Notes</h3>
                <p style="color: #333; font-size: 13px; margin: 0; line-height: 1.5;">${selectedSale.notes}</p>
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #0066cc;">
              <p style="color: #0066cc; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">Merci pour votre confiance!</p>
              <div style="color: #666; font-size: 12px; line-height: 1.8;">
                ${shopInfo.address ? `<p style="margin: 5px 0;">📍 ${shopInfo.address}</p>` : ''}
                ${shopInfo.phone ? `<p style="margin: 5px 0;">📞 ${shopInfo.phone}</p>` : ''}
                ${shopInfo.email ? `<p style="margin: 5px 0;">✉️ ${shopInfo.email}</p>` : ''}
              </div>
            </div>
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
                <th>Statut crédit</th>
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
                    {getCreditStatusBadge(sale)}
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
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="sale-product-search"
                      name="productSearch"
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="input-field pl-10 w-full"
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
                            <input
                              type="number"
                              min="1"
                              max={getAvailableStock(item.productId)}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                              className="w-14 px-1 py-1 border border-slate-200 rounded text-center text-sm"
                              aria-label={`Quantité ${item.productName}`}
                            />
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
                    <option value="credit">À Crédit</option>
                  </select>
                </section>

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
                      <th className="text-center p-3 border-b">Quantit├®</th>
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
    </div>
  )
}
