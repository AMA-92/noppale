import React, { useState, useEffect, useRef, useMemo } from 'react'
import { formatDate } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'
import { currencies } from '../utils/i18n'
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, FileText, PieChart, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'
import { appStorage } from '../utils/storage'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const getItemDate = (item) => new Date(item.createdAt || item.created_at || item.date)

const filterDataByPeriod = (data, period) => {
  if (!Array.isArray(data) || data.length === 0) return []

  const now = new Date()
  const startDate = new Date()

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3)
      break
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    default:
      startDate.setMonth(now.getMonth() - 1)
  }

  return data.filter((item) => {
    const itemDate = getItemDate(item)
    return !Number.isNaN(itemDate.getTime()) && itemDate >= startDate && itemDate <= now
  })
}

const getProductCostPrice = (product) =>
  parseFloat(product?.buying_price ?? product?.buyingPrice ?? product?.costPrice ?? 0) || 0

const calculatePurchaseCost = (salesList, productsList) => {
  if (!Array.isArray(salesList) || !Array.isArray(productsList)) return 0

  const productById = new Map(productsList.map((p) => [p.id, p]))

  return salesList.reduce((sum, sale) => {
    if (!sale.items?.length) return sum
    return sum + sale.items.reduce((itemSum, item) => {
      const product = productById.get(item.productId)
      const costPrice = getProductCostPrice(product)
      const quantity = parseFloat(item.quantity || 0) || 0
      return itemSum + costPrice * quantity
    }, 0)
  }, 0)
}

export default function Reports() {
  const { formatCurrency, currency, language, t } = useI18n()
  const [period, setPeriod] = useState('month')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('sales') // 'sales', 'expenses', 'balance'
  const [shopInfo, setShopInfo] = useState({})
  const salesReportRef = useRef(null)
  const expensesReportRef = useRef(null)
  const balanceReportRef = useRef(null)

  useEffect(() => { loadData() }, [period, currency, language])

  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const savedShopInfo = await appStorage.getShopInfo()
        setShopInfo(savedShopInfo || {})
      } catch (error) {
        console.error('Erreur de chargement des informations de la boutique:', error)
      }
    }
    loadShopInfo()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allSales, allExpenses, allProducts] = await Promise.all([
        appStorage.getSales(),
        appStorage.getExpenses(),
        appStorage.getProducts()
      ])

      setSales(filterDataByPeriod(allSales || [], period))
      setExpenses(filterDataByPeriod(allExpenses || [], period))
      setProducts(allProducts || [])
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setSales([])
      setExpenses([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const totalSales = useMemo(() => sales.reduce((sum, s) => {
    const total = parseFloat(s.total || 0)
    return sum + (Number.isNaN(total) ? 0 : total)
  }, 0), [sales])

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => {
    const amount = parseFloat(e.amount || 0)
    return sum + (Number.isNaN(amount) ? 0 : amount)
  }, 0), [expenses])

  const totalPurchaseCost = useMemo(
    () => calculatePurchaseCost(sales, products),
    [sales, products]
  )

  const profit = totalSales - totalExpenses
  const realProfit = profit - totalPurchaseCost

  const periodOptions = [
    { value: 'week', label: t('thisWeek') },
    { value: 'month', label: t('thisMonth') },
    { value: 'quarter', label: t('thisQuarter') },
    { value: 'year', label: t('thisYear') }
  ]

  // Fonctions pour générer les PDF
  const generatePDF = async (reportType, filename) => {
    try {
      toast.loading('Génération du PDF en cours...')

      const [allSales, allExpenses, allProducts] = await Promise.all([
        appStorage.getSales(),
        appStorage.getExpenses(),
        appStorage.getProducts()
      ])

      const filteredSales = filterDataByPeriod(allSales || [], period)
      const filteredExpenses = filterDataByPeriod(allExpenses || [], period)

      const pdfTotalSales = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total || 0) || 0), 0)
      const pdfTotalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount || 0) || 0), 0)
      const pdfProfit = pdfTotalSales - pdfTotalExpenses
      const pdfPurchaseCost = calculatePurchaseCost(filteredSales, allProducts || [])
      const pdfRealProfit = pdfProfit - pdfPurchaseCost

      // Créer un conteneur temporaire pour le PDF
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'fixed'
      tempContainer.style.left = '0'
      tempContainer.style.top = '0'
      tempContainer.style.width = '210mm'
      tempContainer.style.backgroundColor = 'white'
      tempContainer.style.padding = '20px'
      tempContainer.style.fontFamily = 'Arial, sans-serif'
      tempContainer.style.zIndex = '9999'
      
      // Contenu HTML selon le type de rapport
      let htmlContent = ''
      
      if (reportType === 'sales') {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
              <div style="display: flex; align-items: center;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="height: 60px; margin-right: 20px;" alt="Logo" />` : ''}
              </div>
              <div style="text-align: center; flex: 1;">
                <h2 style="color: #666; margin-bottom: 5px; font-size: 18px;">${t('salesReport')}</h2>
                <p style="color: #888; font-size: 14px;">${periodOptions.find(p => p.value === period)?.label}</p>
                <p style="color: #888; font-size: 14px;">${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div style="text-align: right;">
                <h1 style="color: #333; margin-bottom: 10px; font-size: 24px;">${shopInfo.name || 'Boutique'}</h1>
              </div>
            </div>
            
            <div style="background-color: #f0fdf4; padding: 10px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
              <div style="font-size: 12px; color: #16a34a; margin-bottom: 5px;">${t('totalSales')} ${t('period')}</div>
              <div style="font-size: 18px; font-weight: bold; color: #15803d;">${formatCurrency(totalSales)}</div>
              <div style="font-size: 10px; color: #16a34a;">${filteredSales.length} ${t('salesCount')}${filteredSales.length > 1 ? 's' : ''}</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('date')}</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('customer')}</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('total')}</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSales.map(sale => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px; color: #64748b; font-size: 12px;">${formatDate(new Date(sale.createdAt || sale.created_at))}</td>
                    <td style="padding: 8px; color: #1e293b; font-size: 12px;">${sale.customerName || sale.customer_name || t('anonymousCustomer')}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 500; color: #059669; font-size: 12px;">${formatCurrency(sale.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                  <td colspan="2" style="padding: 8px; font-weight: 600; color: #1e293b; font-size: 12px;">${t('total').toUpperCase()}</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; color: #059669; font-size: 12px;">${formatCurrency(totalSales)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                ${shopInfo.address || ''} ${shopInfo.phone ? `- ${shopInfo.phone}` : ''} ${shopInfo.email ? `- ${shopInfo.email}` : ''}
              </p>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 5px; font-style: italic;">
                Merci pour votre confiance !
              </p>
            </div>
          </div>
        `
      } else if (reportType === 'expenses') {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
              <div style="display: flex; align-items: center;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="height: 60px; margin-right: 20px;" alt="Logo" />` : ''}
              </div>
              <div style="text-align: center; flex: 1;">
                <h2 style="color: #666; margin-bottom: 5px; font-size: 18px;">${t('expensesReport')}</h2>
                <p style="color: #888; font-size: 14px;">${periodOptions.find(p => p.value === period)?.label}</p>
                <p style="color: #888; font-size: 14px;">${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div style="text-align: right;">
                <h1 style="color: #333; margin-bottom: 10px; font-size: 24px;">${shopInfo.name || 'Boutique'}</h1>
              </div>
            </div>
            
            <div style="background-color: #fef2f2; padding: 10px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
              <div style="font-size: 12px; color: #dc2626; margin-bottom: 5px;">${t('totalExpenses')} ${t('period')}</div>
              <div style="font-size: 18px; font-weight: bold; color: #b91c1c;">${formatCurrency(totalExpenses)}</div>
              <div style="font-size: 10px; color: #dc2626;">${filteredExpenses.length} ${t('expensesCount')}${filteredExpenses.length > 1 ? 's' : ''}</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('date')}</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('description')}</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569;">${t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                ${filteredExpenses.map(expense => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px; color: #64748b; font-size: 12px;">${formatDate(new Date(expense.createdAt || expense.created_at || expense.date))}</td>
                    <td style="padding: 8px; color: #1e293b; font-size: 12px;">${expense.description || t('noDescription')}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 500; color: #dc2626; font-size: 12px;">${formatCurrency(expense.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                  <td colspan="2" style="padding: 8px; font-weight: 600; color: #1e293b; font-size: 12px;">${t('total').toUpperCase()}</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; color: #dc2626; font-size: 12px;">${formatCurrency(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                ${shopInfo.address || ''} ${shopInfo.phone ? `- ${shopInfo.phone}` : ''} ${shopInfo.email ? `- ${shopInfo.email}` : ''}
              </p>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 5px; font-style: italic;">
                Merci pour votre confiance !
              </p>
            </div>
          </div>
        `
      } else if (reportType === 'balance') {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
              <div style="display: flex; align-items: center;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="height: 60px; margin-right: 20px;" alt="Logo" />` : ''}
              </div>
              <div style="text-align: center; flex: 1;">
                <h2 style="color: #666; margin-bottom: 5px; font-size: 18px;">${t('balanceReport')}</h2>
                <p style="color: #888; font-size: 14px;">${periodOptions.find(p => p.value === period)?.label}</p>
                <p style="color: #888; font-size: 14px;">${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
              <div style="background-color: #f0fdf4; padding: 10px; border-radius: 8px; border-left: 4px solid #22c55e;">
                <div style="font-size: 12px; color: #16a34a; margin-bottom: 5px;">${t('totalSales')}</div>
                <div style="font-size: 18px; font-weight: bold; color: #15803d;">${formatCurrency(totalSales)}</div>
              </div>
              <div style="background-color: #fef2f2; padding: 10px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-size: 12px; color: #dc2626; margin-bottom: 5px;">${t('totalExpenses')}</div>
                <div style="font-size: 18px; font-weight: bold; color: #b91c1c;">${formatCurrency(totalExpenses)}</div>
              </div>
            </div>
            
            <div style="background-color: #eff6ff; padding: 10px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 12px; color: #1d4ed8; margin-bottom: 5px;">${t('grossProfit')} (${t('totalSales')} - ${t('totalExpenses')})</div>
              <div style="font-size: 18px; font-weight: bold; color: ${profit >= 0 ? '#1e40af' : '#b91c1c'};">${formatCurrency(profit)}</div>
              <div style="font-size: 10px; color: ${profit >= 0 ? '#1d4ed8' : '#dc2626'};">${profit >= 0 ? t('profit') : t('loss')}</div>
            </div>
            
            <div style="background: linear-gradient(135deg, #9333ea 0%, #6366f1 100%); padding: 10px; border-radius: 8px; margin-bottom: 30px; color: white;">
              <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">${t('realProfit')} (${t('totalSales')} - ${t('totalExpenses')} - ${t('totalPurchaseCost')})</div>
              <div style="font-size: 18px; font-weight: bold;">${formatCurrency(realProfit)}</div>
              <div style="font-size: 10px; opacity: 0.75;">${t('totalPurchaseCost')} : ${formatCurrency(totalPurchaseCost)}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
              <div>
                <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 16px;">${t('salesDetails')}</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                      <th style="padding: 8px; text-align: left; color: #475569; font-size: 12px; font-weight: 600;">${t('date')}</th>
                      <th style="padding: 8px; text-align: right; color: #475569; font-size: 12px; font-weight: 600;">${t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredSales.slice(0, 10).map(sale => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; color: #64748b; font-size: 12px;">${formatDate(new Date(sale.createdAt || sale.created_at))}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 500; color: #059669; font-size: 12px;">${formatCurrency(sale.total)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                      <td style="padding: 8px; font-weight: 600; color: #1e293b; font-size: 12px;">${t('total').toUpperCase()}</td>
                      <td style="padding: 8px; text-align: right; font-weight: bold; color: #059669; font-size: 12px;">${formatCurrency(totalSales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div>
                <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 16px;">${t('expensesDetails')}</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                      <th style="padding: 8px; text-align: left; color: #475569; font-size: 12px; font-weight: 600;">${t('date')}</th>
                      <th style="padding: 8px; text-align: right; color: #475569; font-size: 12px; font-weight: 600;">${t('amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredExpenses.slice(0, 10).map(expense => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; color: #64748b; font-size: 12px;">${formatDate(new Date(expense.createdAt || expense.created_at || expense.date))}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 500; color: #dc2626; font-size: 12px;">${formatCurrency(expense.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                      <td style="padding: 8px; font-weight: 600; color: #1e293b; font-size: 12px;">${t('total').toUpperCase()}</td>
                      <td style="padding: 8px; text-align: right; font-weight: bold; color: #dc2626; font-size: 12px;">${formatCurrency(totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                ${shopInfo.address || ''} ${shopInfo.phone ? `- ${shopInfo.phone}` : ''} ${shopInfo.email ? `- ${shopInfo.email}` : ''}
              </p>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 5px; font-style: italic;">
                Merci pour votre confiance !
              </p>
            </div>
          </div>
        `
      }
      
      tempContainer.innerHTML = htmlContent
      document.body.appendChild(tempContainer)
      
      // Utiliser html2canvas pour convertir en image
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Retirer l'élément temporaire
      document.body.removeChild(tempContainer)
      
      // Créer le PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Calculer les dimensions pour s'adapter à la page A4
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      
      // Ajouter l'image au PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Sauvegarder le PDF
      pdf.save(filename)
      toast.success('PDF généré avec succès')
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handlePrintSales = () => {
    setReportType('sales')
    setTimeout(() => {
      generatePDF('sales', `rapport-ventes-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
    }, 500)
  }

  const handlePrintExpenses = () => {
    setReportType('expenses')
    setTimeout(() => {
      generatePDF('expenses', `rapport-depenses-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
    }, 500)
  }

  const handlePrintBalance = () => {
    setReportType('balance')
    setTimeout(() => {
      generatePDF('balance', `bilan-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
    }, 500)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('reports')}</h1>
          <p className="text-slate-500">{t('reportsDesc')}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="input-field"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handlePrintSales}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'sales'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <Printer className="w-4 h-4 inline mr-2" />
            {t('salesReport')}
          </button>
          <button
            onClick={handlePrintExpenses}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'expenses'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <Printer className="w-4 h-4 inline mr-2" />
            {t('expensesReport')}
          </button>
          <button
            onClick={handlePrintBalance}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'balance'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <Printer className="w-4 h-4 inline mr-2" />
            {t('balanceReport')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600">+12%</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">{formatCurrency(totalSales)}</h3>
          <p className="text-xs text-slate-500">{t('totalSales')}</p>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs font-medium text-red-600">+8%</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">{formatCurrency(totalExpenses)}</h3>
          <p className="text-xs text-slate-500">{t('totalExpenses')}</p>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit >= 0 ? '+' : ''}{totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <h3 className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </h3>
          <p className="text-xs text-slate-500">{t('profit')}</p>
        </div>
      </div>

      {/* Éléments cachés pour la génération PDF */}
      <div style={{ display: 'none' }}>
        <div ref={salesReportRef} className="bg-white p-8">
          {/* Contenu PDF pour les ventes */}
        </div>

        <div ref={expensesReportRef} className="bg-white p-8">
          {/* Contenu PDF pour les dépenses */}
        </div>

        <div ref={balanceReportRef} className="bg-white p-8">
          {/* Contenu PDF pour le bilan */}
        </div>
      </div>
    </div>
  )
}
