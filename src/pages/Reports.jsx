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
import { useProductsRealtime, useSalesRealtime, useExpensesRealtime, useShopInfoRealtime } from '../hooks/useRealtime.jsx'
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

  const loadShopInfo = async () => {
    try {
      const savedShopInfo = await appStorage.getShopInfo()
      setShopInfo(savedShopInfo || {})
    } catch (error) {
      console.error('Erreur de chargement des informations de la boutique:', error)
    }
  }

  useEffect(() => {
    loadShopInfo()
  }, [])

  useProductsRealtime(() => loadData())
  useSalesRealtime(() => loadData())
  useExpensesRealtime(() => loadData())
  useShopInfoRealtime(() => loadShopInfo())

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
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 210mm; margin: 0 auto; background: #f7f7f7;">
            <div style="position: relative; overflow: hidden; border-radius: 40px; background: white; padding: 32px; box-shadow: 0 35px 90px rgba(15, 23, 42, 0.15);">
              <div style="position: absolute; top: -40px; right: -60px; width: 220px; height: 220px; background: rgba(16, 185, 129, 0.15); border-radius: 999px;"></div>
              <div style="position: absolute; bottom: -40px; left: -60px; width: 220px; height: 220px; background: rgba(22, 163, 74, 0.12); border-radius: 999px;"></div>

              <div style="position: relative; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 28px;">
                <div style="display: flex; flex-direction: column; align-items: center; min-width: 180px;">
                  <div style="width: 92px; height: 92px; border-radius: 24px; border: 1px solid #d1fae5; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(16, 185, 129, 0.14);">
                    ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="width: 72px; height: 72px; object-fit: cover; border-radius: 20px;" />` : `<div style="width: 48px; height: 48px; border-radius: 999px; background: #22c55e; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px;">↗</div>`}
                  </div>
                  <p style="margin: 14px 0 0; color: #16a34a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;">Gestion de stock</p>
                </div>

                <div style="position: relative; text-align: center; flex: 1 1 340px;">
                  <h1 style="margin: 0; font-size: 40px; font-weight: 800; color: #0f172a; line-height: 1.05;">Rapport des ventes</h1>
                  <p style="margin: 12px 0 0; color: #64748b; font-size: 16px;">${periodOptions.find(p => p.value === period)?.label || 'Ce mois'}</p>
                  <div style="display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; color: #16a34a; font-size: 16px; font-weight: 700;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 999px; background: #dcfce7; color: #16a34a; font-size: 14px;">📅</span>
                    <span>${new Date().toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div style="background: linear-gradient(135deg, #d1fae5, #e6fffa); border-radius: 28px; padding: 20px 20px; min-width: 200px; display: flex; align-items: center; gap: 14px; box-shadow: 0 14px 30px rgba(16, 185, 129, 0.08);">
                  <div style="width: 50px; height: 50px; border-radius: 999px; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);">
                    <span style="color: #16a34a; font-size: 22px;">📝</span>
                  </div>
                  <div>
                    <h2 style="margin: 0; font-size: 26px; font-weight: 800; color: #0f172a;">${shopInfo.name || 'Ma boutique'}</h2>
                  </div>
                </div>
              </div>

              <div style="margin-top: 24px; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 35px; padding: 16px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 14px; align-items: center; flex: 1 1 260px;">
                  <div style="width: 60px; height: 60px; border-radius: 26px; background: #16a34a; display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 22px rgba(16, 185, 129, 0.3);">
                    <span style="color: white; font-size: 22px;">↗</span>
                  </div>
                  <div>
                    <p style="margin: 0; color: #334155; font-size: 16px;">Total des ventes période</p>
                    <h2 style="margin: 8px 0 0; font-size: 30px; font-weight: 800; color: #16a34a;">${formatCurrency(totalSales)}</h2>
                    <p style="margin: 8px 0 0; color: #16a34a; font-size: 16px; font-weight: 700;">${filteredSales.length} ventes</p>
                  </div>
                </div>
                <div style="opacity: 0.18; margin-top: 10px; flex: 1 1 160px; min-width: 160px; display: flex; justify-content: center;">
                  <span style="font-size: 52px; color: #16a34a;">↗</span>
                </div>
              </div>

              <div style="margin-top: 32px; overflow: hidden; border-radius: 30px; border: 1px solid #d1fae5; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
                <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: white; font-size: 18px; font-weight: 700;">
                  <div style="padding: 22px 20px; border-right: 1px solid rgba(255,255,255,0.2);">DATE</div>
                  <div style="padding: 22px 20px; border-right: 1px solid rgba(255,255,255,0.2);">CLIENT</div>
                  <div style="padding: 22px 20px; text-align: right;">TOTAL</div>
                </div>
                ${filteredSales.map((sale, index) => `
                  <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'}; color: #0f172a; font-size: 16px;">
                    <div style="padding: 14px 18px; border-top: 1px solid #e2e8f0;">${formatDate(new Date(sale.createdAt || sale.created_at || sale.date))}</div>
                    <div style="padding: 14px 18px; border-top: 1px solid #e2e8f0;">${sale.customerName || sale.customer_name || t('anonymousCustomer')}</div>
                    <div style="padding: 14px 18px; border-top: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #16a34a;">${formatCurrency(sale.total)}</div>
                  </div>
                `).join('')}
                <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; background: #dcfce7; color: #166534; font-size: 20px; font-weight: 700;">
                  <div style="padding: 18px 18px; border-top: 1px solid #d1fae5; border-right: 1px solid #d1fae5;">TOTAL</div>
                  <div style="padding: 18px 18px; border-top: 1px solid #d1fae5; border-right: 1px solid #d1fae5;"></div>
                  <div style="padding: 18px 18px; border-top: 1px solid #d1fae5; text-align: right;">${formatCurrency(totalSales)}</div>
                </div>
              </div>

              <div style="margin-top: 36px; border: 1px solid #d1fae5; background: #fcfcfc; border-radius: 30px; padding: 32px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; text-align: center;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <div style="width: 56px; height: 56px; border-radius: 999px; border: 2px solid #16a34a; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 24px;">📍</div>
                  <span style="color: #334155; font-size: 16px;">${shopInfo.address || 'Dakar, point E'}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <div style="width: 56px; height: 56px; border-radius: 999px; border: 2px solid #16a34a; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 24px;">📞</div>
                  <span style="color: #334155; font-size: 16px;">${shopInfo.phone || '+221778762082'}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <div style="width: 56px; height: 56px; border-radius: 999px; border: 2px solid #16a34a; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 24px;">✉️</div>
                  <span style="color: #334155; font-size: 16px;">${shopInfo.email || 'mohamediadiara98@gmail.com'}</span>
                </div>
              </div>
            </div>
          </div>
        `
      } else if (reportType === 'expenses') {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 210mm; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
              <div style="flex: 1;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="max-height: 80px; margin-bottom: 10px;">` : '<div style="border: 2px dashed #ccc; padding: 20px; text-align: center; color: #999; font-size: 12px; margin-bottom: 10px;">VOTRE LOGO ICI</div>'}
                <h1 style="color: #0066cc; font-size: 28px; margin: 0 0 5px 0; font-weight: bold;">${shopInfo.name || 'Ma boutique'}</h1>
              </div>
              <div style="text-align: right; flex: 1;">
                <h2 style="color: #333; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 2px;">RAPPORT DÉPENSES</h2>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">${periodOptions.find(p => p.value === period)?.label}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            <!-- Summary Box -->
            <div style="background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h3 style="color: #dc3545; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Total des dépenses ${t('period')}</h3>
              <p style="color: #333; font-size: 24px; margin: 5px 0; font-weight: bold;">${formatCurrency(totalExpenses)}</p>
              <p style="color: #666; font-size: 12px; margin: 0;">${filteredExpenses.length} ${t('expensesCount')}${filteredExpenses.length > 1 ? 's' : ''}</p>
            </div>

            <!-- Expenses Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white;">
                  <th style="border: 1px solid #c82333; padding: 12px; text-align: left; font-weight: 600; font-size: 13px;">DATE</th>
                  <th style="border: 1px solid #c82333; padding: 12px; text-align: left; font-weight: 600; font-size: 13px;">DESCRIPTION</th>
                  <th style="border: 1px solid #c82333; padding: 12px; text-align: right; font-weight: 600; font-size: 13px;">MONTANT</th>
                </tr>
              </thead>
              <tbody>
                ${filteredExpenses.map((expense, index) => `
                  <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="border: 1px solid #dee2e6; padding: 12px; font-size: 13px;">${formatDate(new Date(expense.createdAt || expense.created_at || expense.date))}</td>
                    <td style="border: 1px solid #dee2e6; padding: 12px; font-size: 13px;">${expense.description || t('noDescription')}</td>
                    <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-size: 13px; font-weight: 500; color: #dc3545;">${formatCurrency(expense.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; font-weight: bold;">
                  <td colspan="2" style="border: 1px solid #c82333; padding: 15px; text-align: right; font-size: 16px;">TOTAL:</td>
                  <td style="border: 1px solid #c82333; padding: 15px; text-align: right; font-size: 18px;">${formatCurrency(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>

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
      } else if (reportType === 'balance') {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 210mm; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
              <div style="flex: 1;">
                ${shopInfo.logo ? `<img src="${shopInfo.logo}" style="max-height: 80px; margin-bottom: 10px;">` : '<div style="border: 2px dashed #ccc; padding: 20px; text-align: center; color: #999; font-size: 12px; margin-bottom: 10px;">VOTRE LOGO ICI</div>'}
                <h1 style="color: #0066cc; font-size: 28px; margin: 0 0 5px 0; font-weight: bold;">${shopInfo.name || 'Ma boutique'}</h1>
              </div>
              <div style="text-align: right; flex: 1;">
                <h2 style="color: #333; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 2px;">BILAN</h2>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">${periodOptions.find(p => p.value === period)?.label}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px;">
                <h3 style="color: #28a745; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Total des ventes</h3>
                <p style="color: #333; font-size: 24px; margin: 5px 0; font-weight: bold;">${formatCurrency(totalSales)}</p>
                <p style="color: #666; font-size: 12px; margin: 0;">${filteredSales.length} vente${filteredSales.length > 1 ? 's' : ''}</p>
              </div>
              <div style="background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px;">
                <h3 style="color: #dc3545; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Total des dépenses</h3>
                <p style="color: #333; font-size: 24px; margin: 5px 0; font-weight: bold;">${formatCurrency(totalExpenses)}</p>
                <p style="color: #666; font-size: 12px; margin: 0;">${filteredExpenses.length} dépense${filteredExpenses.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            <!-- Gross Profit -->
            <div style="background: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <h3 style="color: #0066cc; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase;">Bénéfice brut (Ventes - Dépenses)</h3>
              <p style="color: #333; font-size: 24px; margin: 5px 0; font-weight: bold; color: ${profit >= 0 ? '#28a745' : '#dc3545'};">${formatCurrency(profit)}</p>
              <p style="color: #666; font-size: 12px; margin: 0;">${profit >= 0 ? 'Bénéfice' : 'Perte'}</p>
            </div>

            <!-- Real Profit -->
            <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); padding: 15px; margin-bottom: 30px; border-radius: 4px; color: white;">
              <h3 style="font-size: 14px; margin: 0 0 10px 0; font-weight: bold; text-transform: uppercase; opacity: 0.9;">Bénéfice réel (Ventes - Dépenses - Coût d'achat)</h3>
              <p style="font-size: 24px; margin: 5px 0; font-weight: bold;">${formatCurrency(realProfit)}</p>
              <p style="font-size: 12px; margin: 0; opacity: 0.75;">Coût d'achat total: ${formatCurrency(totalPurchaseCost)}</p>
            </div>

            <!-- Details Tables -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
              <!-- Sales Details -->
              <div>
                <h3 style="color: #0066cc; font-size: 16px; margin: 0 0 15px 0; font-weight: bold; text-transform: uppercase;">Détails des ventes</h3>
                <div style="border: 2px solid #0066cc; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white;">
                        <th style="border: 1px solid #0052a3; padding: 12px; text-align: left; font-weight: 600; font-size: 13px;">DATE</th>
                        <th style="border: 1px solid #0052a3; padding: 12px; text-align: right; font-weight: 600; font-size: 13px;">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredSales.slice(0, 10).map((sale, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                          <td style="border: 1px solid #dee2e6; padding: 12px; font-size: 13px;">${formatDate(new Date(sale.createdAt || sale.created_at))}</td>
                          <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-size: 13px; font-weight: 500; color: #28a745;">${formatCurrency(sale.total)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: white; font-weight: bold;">
                        <td style="border: 1px solid #218838; padding: 15px; text-align: right; font-size: 16px;">TOTAL:</td>
                        <td style="border: 1px solid #218838; padding: 15px; text-align: right; font-size: 18px;">${formatCurrency(totalSales)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Expenses Details -->
              <div>
                <h3 style="color: #dc3545; font-size: 16px; margin: 0 0 15px 0; font-weight: bold; text-transform: uppercase;">Détails des dépenses</h3>
                <div style="border: 2px solid #dc3545; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white;">
                        <th style="border: 1px solid #c82333; padding: 12px; text-align: left; font-weight: 600; font-size: 13px;">DATE</th>
                        <th style="border: 1px solid #c82333; padding: 12px; text-align: right; font-weight: 600; font-size: 13px;">MONTANT</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredExpenses.slice(0, 10).map((expense, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                          <td style="border: 1px solid #dee2e6; padding: 12px; font-size: 13px;">${formatDate(new Date(expense.createdAt || expense.created_at || expense.date))}</td>
                          <td style="border: 1px solid #dee2e6; padding: 12px; text-align: right; font-size: 13px; font-weight: 500; color: #dc3545;">${formatCurrency(expense.amount)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; font-weight: bold;">
                        <td style="border: 1px solid #c82333; padding: 15px; text-align: right; font-size: 16px;">TOTAL:</td>
                        <td style="border: 1px solid #c82333; padding: 15px; text-align: right; font-size: 18px;">${formatCurrency(totalExpenses)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

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
