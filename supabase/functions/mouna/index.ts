// Mouna - passerelle IA sécurisée côté serveur.
// Ne place JAMAIS la clé du fournisseur IA dans le PWA.
// Configure les secrets Supabase : AI_API_KEY, AI_BASE_URL, AI_MODEL.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, anthropic-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

const normalizeBaseUrl = (rawUrl: string, fallback: string) => {
  const value = (rawUrl || fallback).trim()
  if (!value) return fallback
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  return withoutTrailingSlash.endsWith('/v1') ? withoutTrailingSlash : `${withoutTrailingSlash}/v1`
}

const getUserContext = async (req: Request) => {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!url || !anonKey || !token) {
    return { user: null, admin: null, error: 'Session utilisateur introuvable. Connecte-toi dans Noppalé avant d’utiliser Mouna.' }
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) {
    return { user: null, admin: null, error: 'Jeton utilisateur invalide. Reconnecte-toi pour autoriser les actions Mouna.' }
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null

  return { user: data.user, admin, error: null }
}

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(value || 0)

const fallbackProductName = (input: string) => input.replace(/^(?:le|la|un|une|des|du|de|de la|du stock|au stock|dans le stock|stock )\s+/i, '').trim()

const detectIntent = (message: string) => {
  const txt = message.toLowerCase()

  if (/combien.*vendu|total.*ventes|ventes.*aujourd|chiffre.*affaires|recette.*jour|ventes.*jour|ca.*aujourd/i.test(txt)) return 'sales_today'
  if (/stock|rupture|en rupture|presque.*rupture|stock.*crit|critique/i.test(txt)) return 'stock_check'
  if (/ajout.*stock|augment.*stock|ajoute.*stock|ajouter.*stock|stock.*\+|ajouter.*\d+.*au stock/i.test(txt)) return 'add_stock'
  if (/modif.*produit|modifier.*produit|change.*prix.*produit|prix.*produit|met.*prix/i.test(txt)) return 'update_product'
  if (/supprim.*produit|efface.*produit|retire.*produit|supprimer.*produit|supprime.*produit/i.test(txt)) return 'delete_product'
  if (/cr(?:ee|e).*produit|nouveau produit|ajoute.*produit|ajouter.*produit|cr(?:ee|e).*le produit/i.test(txt)) return 'create_product'
  if (/liste.*produits|produits|recherche.*produit|quel.*prix.*produit|prix.*(riz|coca|eau)|cat\S* produit/i.test(txt)) return 'products_list'
  if (/clients|client|historique.*client|paiement.*client|dette.*client|ajoute.*client|cr(?:ee|e).*client/i.test(txt)) return 'customers_list'
  if (/rapport|bilan|recettes|depenses|benefice|stat|resume|synthese/i.test(txt)) return 'report'
  if (/top 3|top3|produit.*plus.*vendu|plus.*vendu|meilleur produit|diagramme.*top|evolution.*ventes|évolution.*ventes|jour.*plus.*vendu|meilleur jour|jour.*plus.*vente|ventes.*diagramme|top.*produit/i.test(txt)) return 'sales_insights'
  if (/dette|dettes|encours|credit.*client|client.*dette|montant.*dette|reste.*payer|reste.*payer/i.test(txt)) return 'debt_summary'
  if (/rapport.*(vente|ventes|depense|depenses|bilan)|telecharger.*rapport|télécharger.*rapport|download.*report|whatsapp.*rapport|envoyer.*rapport|rapport.*periode|rapport.*(semaine|mois|jour|annee|année)/i.test(txt)) return 'report_export'
  if (/vend|vente|ajout.*vente|enregistre.*vente|ajoute.*vente|vends?/i.test(txt)) return 'add_sale'
  if (/ajoute.*depense|dépense|depense|nouvelle depense|nouvelle dépense/i.test(txt)) return 'add_expense'
  return 'question'
}

const parseAmount = (input: string) => {
  const match = input.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  const clean = match[1].replace(',', '.')
  return Number.parseFloat(clean)
}

const parseProductName = (input: string) => {
  const cleaned = fallbackProductName(input)
  const cleaned2 = cleaned.replace(/^(?:le |la |un |une |des )/i, '')
  return cleaned2.replace(/\s+/g, ' ').trim()
}

const detectPeriod = (input: string) => {
  const txt = input.toLowerCase()
  if (/(aujourd|jour|hier|today|day)/i.test(txt)) return 'day'
  if (/(semaine|7 jours|7j|week)/i.test(txt)) return 'week'
  if (/(trimestre|3 mois|quarter|90 jours)/i.test(txt)) return 'quarter'
  if (/(annee|an|year|12 mois|année)/i.test(txt)) return 'year'
  if (/(mois|month|30 jours|30j)/i.test(txt)) return 'month'
  return 'month'
}

const getPeriodLabel = (period: string) => {
  switch (period) {
    case 'day': return 'jour'
    case 'week': return 'semaine'
    case 'quarter': return 'trimestre'
    case 'year': return 'année'
    default: return 'mois'
  }
}

const getSalesForPeriod = async (admin: any, userId: string, period: string) => {
  const now = new Date()
  const start = new Date(now)

  switch (period) {
    case 'day':
      start.setDate(now.getDate() - 1)
      break
    case 'week':
      start.setDate(now.getDate() - 7)
      break
    case 'quarter':
      start.setMonth(now.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(now.getFullYear() - 1)
      break
    default:
      start.setMonth(now.getMonth() - 1)
  }

  const query = admin.from('sales')
    .select('id,total,customer_name,customer_id,payment_method,payment_status,credit_status,paid_amount,remaining_amount,created_at, sale_items(*)')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', now.toISOString())

  const { data, error } = await query
  if (error) return []
  return data || []
}

const isConfirmation = (input: string) => /(?:^|\s)(oui|ok|confirme|confirmer|yes|d'accord|d accord)(?:\b|,)/i.test(input)

const findProductByName = async (admin: any, userId: string, productName: string) => {
  const cleaned = productName.trim()
  if (!cleaned) return { product: null, error: 'Nom produit vide' }

  const { data, error } = await admin
    .from('products')
    .select('id,name,stock,min_stock,selling_price,buying_price')
    .eq('user_id', userId)
    .ilike('name', `%${cleaned}%`)
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') return { product: null, error }
  return { product: data, error: null }
}

const executeTool = async (tool: string, message: string, userId: string, admin: any, confirmed = false) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  if (tool === 'sales_today') {
    const { data: sales, error } = await admin.from('sales')
      .select('id,total,created_at,customer_name,payment_status')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    if (error) return { ok: false, response: 'Je n’ai pas pu lire les ventes du jour. La requête a échoué.' }

    const total = (sales || []).reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0)
    const count = sales?.length || 0
    return {
      ok: true,
      response: count > 0
        ? `Aujourd’hui, tu as ${count} vente${count > 1 ? 's' : ''} pour un total de ${money(total)}.`
        : 'Aucune vente n’a été enregistrée aujourd’hui pour le moment.'
    }
  }

  if (tool === 'stock_check') {
    const { data: products, error } = await admin.from('products')
      .select('id,name,stock,min_stock,selling_price')
      .eq('user_id', userId)
      .order('stock', { ascending: true })

    if (error) return { ok: false, response: 'Je n’ai pas pu vérifier le stock.' }

    const low = (products || []).filter((p: any) => Number(p.stock || 0) <= Number(p.min_stock || 0))
    if (!low.length) return { ok: true, response: 'Le stock est globalement stable. Aucun produit n’est en rupture ou au seuil critique.' }

    const list = low.slice(0, 5).map((p: any) => `${p.name} (${p.stock} en stock)`).join(', ')
    return {
      ok: true,
      response: `Produits à surveiller : ${list}.`
    }
  }

  if (tool === 'products_list') {
    const { data: products, error } = await admin.from('products')
      .select('id,name,stock,selling_price')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return { ok: false, response: 'Je n’ai pas pu lister les produits.' }

    if (!products?.length) return { ok: true, response: 'Aucun produit n’est enregistré pour ce compte.' }

    const lines = products.map((p: any) => `${p.name} — stock ${p.stock || 0} — ${money(Number(p.selling_price || 0))}`).join(' | ')
    return { ok: true, response: `Produits récents : ${lines}.` }
  }

  if (tool === 'customers_list') {
    const { data: customers, error } = await admin.from('customers')
      .select('id,name,phone,email')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return { ok: false, response: 'Je n’ai pas pu lister les clients.' }

    if (!customers?.length) return { ok: true, response: 'Aucun client n’est enregistré pour ce compte.' }

    const lines = customers.map((c: any) => `${c.name}${c.phone ? ` (${c.phone})` : ''}`).join(' | ')
    return { ok: true, response: `Clients récents : ${lines}.` }
  }

  if (tool === 'report') {
    const { data: sales, errorSales } = await admin.from('sales').select('total,created_at').eq('user_id', userId)
    const { data: products, errorProducts } = await admin.from('products').select('stock,min_stock').eq('user_id', userId)
    const { data: expenses, errorExpenses } = await admin.from('expenses').select('amount').eq('user_id', userId)

    if (errorSales || errorProducts || errorExpenses) return { ok: false, response: 'Je n’ai pas pu générer le rapport.' }

    const totalSales = (sales || []).reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0)
    const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
    const stockAlert = (products || []).filter((p: any) => Number(p.stock || 0) <= Number(p.min_stock || 0)).length

    return {
      ok: true,
      response: `Rapport rapide : ventes ${money(totalSales)} ; dépenses ${money(totalExpenses)} ; bénéfice estimé ${money(totalSales - totalExpenses)} ; produits en stock critique ${stockAlert}.`
    }
  }

  if (tool === 'sales_insights') {
    const period = detectPeriod(message)
    const sales = await getSalesForPeriod(admin, userId, period)

    if (!sales.length) {
      return { ok: true, response: `Aucune vente n’a été enregistrée pour la période ${getPeriodLabel(period)}.` }
    }

    const productMap = new Map<string, { name: string, quantity: number, revenue: number }>()
    const dayMap = new Map<string, number>()

    for (const sale of sales) {
      const saleDate = new Date(sale.created_at)
      if (!Number.isNaN(saleDate.getTime())) {
        const key = saleDate.toISOString().slice(0, 10)
        const saleTotal = Number(sale.paid_amount ?? sale.total ?? 0) || 0
        dayMap.set(key, (dayMap.get(key) || 0) + saleTotal)
      }

      const items = Array.isArray(sale.sale_items) ? sale.sale_items : []
      for (const item of items) {
        const name = String(item.product_name || 'Produit inconnu').trim() || 'Produit inconnu'
        const quantity = Number(item.quantity || 0) || 0
        const revenue = Number(item.total_price || 0) || 0
        const entry = productMap.get(name) || { name, quantity: 0, revenue: 0 }
        entry.quantity += quantity
        entry.revenue += revenue
        productMap.set(name, entry)
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)

    const bestDay = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const bestDate = bestDay ? new Date(bestDay[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Aucun'
    const bestDayTotal = bestDay ? bestDay[1] : 0

    const trend = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, total]) => `${new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}: ${money(total)}`)
      .join(' | ')

    const topProductsText = topProducts.length
      ? topProducts.map((p, index) => `${index + 1}. ${p.name} — ${p.quantity} unités (${money(p.revenue)})`).join(' ; ')
      : 'Aucun produit vendu'

    return {
      ok: true,
      response: `Analyse ${getPeriodLabel(period)} : ${topProductsText}. Le jour où tu as vendu le plus est ${bestDate} avec ${money(bestDayTotal)}. Évolution des ventes : ${trend}.`
    }
  }

  if (tool === 'debt_summary') {
    const sales = await getSalesForPeriod(admin, userId, 'year')
    const debtSales = sales.filter((sale: any) => {
      const isCredit = String(sale.payment_method || sale.paymentMethod || '').toLowerCase() === 'credit' || String(sale.credit_status || '').toLowerCase() === 'pending' || String(sale.credit_status || '').toLowerCase() === 'partial'
      if (!isCredit) return false
      const remaining = Number(sale.remaining_amount ?? (Number(sale.total || 0) - Number(sale.paid_amount || 0))) || 0
      return remaining > 0
    })

    if (!debtSales.length) {
      return { ok: true, response: 'Aucune dette en cours pour l’instant. Tout le monde est à jour.' }
    }

    const totalDebt = debtSales.reduce((sum: number, sale: any) => sum + (Number(sale.remaining_amount ?? (Number(sale.total || 0) - Number(sale.paid_amount || 0))) || 0), 0)
    const debtList = debtSales
      .map((sale: any) => `${sale.customer_name || 'Client'} : ${money(Number(sale.remaining_amount ?? (Number(sale.total || 0) - Number(sale.paid_amount || 0))) || 0)}`)
      .slice(0, 10)
      .join(' ; ')

    return {
      ok: true,
      response: `Dette totale en cours : ${money(totalDebt)}. Détail par client : ${debtList}.`
    }
  }

  if (tool === 'report_export') {
    const period = detectPeriod(message)
    const sales = await getSalesForPeriod(admin, userId, period)
    const { data: expenses, errorExpenses } = await admin.from('expenses').select('amount,created_at').eq('user_id', userId)

    if (errorExpenses) return { ok: false, response: 'Je n’ai pas pu préparer le rapport.' }

    const filteredExpenses = (expenses || []).filter((expense: any) => {
      const createdAt = new Date(expense.created_at)
      const now = new Date()
      const start = new Date(now)
      switch (period) {
        case 'day': start.setDate(now.getDate() - 1); break
        case 'week': start.setDate(now.getDate() - 7); break
        case 'quarter': start.setMonth(now.getMonth() - 3); break
        case 'year': start.setFullYear(now.getFullYear() - 1); break
        default: start.setMonth(now.getMonth() - 1)
      }
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= now
    })

    const totalSales = sales.reduce((sum: number, sale: any) => sum + (Number(sale.paid_amount ?? sale.total ?? 0) || 0), 0)
    const totalExpensesValue = filteredExpenses.reduce((sum: number, expense: any) => sum + (Number(expense.amount) || 0), 0)
    const balance = totalSales - totalExpensesValue

    return {
      ok: true,
      response: `Rapport ${getPeriodLabel(period)} : ventes ${money(totalSales)} ; dépenses ${money(totalExpensesValue)} ; bilan ${money(balance)}. Tu veux le télécharger directement sur l’appareil ou l’envoyer par WhatsApp ? Réponds par “télécharger” ou “WhatsApp” et donne-moi le numéro si nécessaire.`
    }
  }

  if (tool === 'add_stock') {
    const qty = parseAmount(message)
    const name = parseProductName(message.replace(/(?:ajout(?:e|er|es)?|ajouter|stock|au stock|dans le stock)/gi, ''))

    if (!qty || !name) {
      return { ok: true, response: 'Pour ajouter du stock, donne-moi le produit et la quantité, par exemple : “ajoute 20 unités de riz au stock”.' }
    }

    if (!confirmed) {
      return { ok: true, response: `Tu veux bien ajouter ${qty} unité${qty > 1 ? 's' : ''} de ${name} au stock ? Confirme-moi : “oui, ajoute ${qty} ${name} au stock”.` }
    }

    const { product, error: findError } = await findProductByName(admin, userId, name)
    if (findError || !product) {
      return { ok: false, response: `Je n’ai pas trouvé le produit “${name}”. Vérifie le nom exact avant d’ajouter du stock.` }
    }

    const nextStock = Number(product.stock || 0) + qty
    const { error: updateError } = await admin.from('products').update({ stock: nextStock, updated_at: new Date().toISOString() }).eq('id', product.id).eq('user_id', userId)

    if (updateError) return { ok: false, response: 'Je n’ai pas pu mettre à jour le stock.' }

    return { ok: true, response: `Le stock de ${name} a bien été augmenté de ${qty}. Nouveau stock : ${nextStock}.` }
  }

  if (tool === 'create_product') {
    const qty = parseAmount(message)
    const name = parseProductName(message.replace(/(?:cr(?:ee|e)|creer|nouveau produit|ajoute.*produit|ajouter.*produit|cr(?:ee|e).*le produit)/gi, ''))

    if (!name) {
      return { ok: true, response: 'Pour créer un produit, donne-moi le nom exact du produit, par exemple : “crée le produit riz 25kg”.' }
    }

    if (!confirmed) {
      return { ok: true, response: `Je peux créer le produit “${name}”. Confirme pour l’ajouter à la base.` }
    }

    const { error } = await admin.from('products').insert({
      user_id: userId,
      name,
      category: 'général',
      stock: qty || 0,
      min_stock: 0,
      buying_price: 0,
      selling_price: 0,
      barcode: '',
      description: '',
      image: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (error) return { ok: false, response: 'Je n’ai pas pu créer le produit dans la base.' }

    return { ok: true, response: `Le produit “${name}” a bien été créé.` }
  }

  if (tool === 'add_sale') {
    const qty = parseAmount(message)
    const productName = parseProductName(message.replace(/(?:vend|vente|vends|ajout.*vente|enregistre.*vente|ajoute.*vente|vente.*de|de|à|pour)/gi, ''))
    const normalizedName = productName || parseProductName(message)

    if (!normalizedName || !qty) {
      return { ok: true, response: 'Pour enregistrer une vente, donne-moi le produit et la quantité, par exemple : “vend 2 sacs de riz”.' }
    }

    if (!confirmed) {
      return { ok: true, response: `Tu veux bien enregistrer la vente de ${qty} ${normalizedName} ? Confirme-moi : “oui, vend ${qty} ${normalizedName}”.` }
    }

    const { product, error: findError } = await findProductByName(admin, userId, normalizedName)
    if (findError || !product) return { ok: false, response: `Je n’ai pas trouvé le produit “${normalizedName}”.` }

    const quantity = Number(qty)
    if (Number(product.stock || 0) < quantity) {
      return { ok: false, response: `Stock insuffisant pour ${product.name}. En stock : ${product.stock}, demandé : ${quantity}.` }
    }

    const unitPrice = Number(product.selling_price || 0)
    const total = unitPrice * quantity
    const now = new Date().toISOString()

    const { data: sale, error: saleError } = await admin.from('sales').insert({
      user_id: userId,
      customer_name: 'Client',
      total,
      payment_method: 'cash',
      payment_status: 'paid',
      paid_amount: total,
      credit_status: 'paid',
      created_at: now,
      updated_at: now
    }).select().single()

    if (saleError || !sale) return { ok: false, response: 'Je n’ai pas pu enregistrer la vente.' }

    const { error: itemError } = await admin.from('sale_items').insert({
      sale_id: sale.id,
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      total_price: total
    })

    if (itemError) return { ok: false, response: 'La vente a été créée, mais l’article n’a pas pu être rattaché.' }

    const { error: stockError } = await admin.from('products').update({
      stock: Math.max(0, Number(product.stock || 0) - quantity),
      updated_at: now
    }).eq('id', product.id).eq('user_id', userId)

    if (stockError) return { ok: false, response: 'La vente est enregistrée, mais le stock n’a pas été recalculé.' }

    return { ok: true, response: `Vente enregistrée : ${quantity} ${product.name} pour ${money(total)}. Souhaites-tu télécharger la facture PDF ou l’envoyer par WhatsApp ? Si oui, donne-moi le numéro WhatsApp du client ou réponds “télécharger”.` }
  }

  if (tool === 'add_expense') {
    const amount = parseAmount(message)
    const label = parseProductName(message.replace(/(?:ajoute.*depense|ajouter.*depense|dépense|depense|nouvelle depense|nouvelle dépense)/gi, '')) || 'Dépense'

    if (!amount) {
      return { ok: true, response: 'Pour enregistrer une dépense, donne-moi le montant et la nature, par exemple : “ajoute une dépense de 5000 pour loyer”.' }
    }

    if (!confirmed) {
      return { ok: true, response: `Tu veux bien enregistrer une dépense de ${money(amount)} pour ${label} ? Confirme-moi : “oui, ajoute la dépense de ${amount} pour ${label}”.` }
    }

    const { error } = await admin.from('expenses').insert({
      user_id: userId,
      name: label,
      amount,
      category: 'général',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (error) return { ok: false, response: 'Je n’ai pas pu enregistrer la dépense.' }

    return { ok: true, response: `Dépense enregistrée : ${label} – ${money(amount)}.` }
  }

  if (tool === 'update_product') {
    const price = parseAmount(message)
    const name = parseProductName(message.replace(/(?:modif|modifier|change.*prix|met.*prix|prix.*)/gi, ''))
    const cleanName = name || parseProductName(message)

    if (!cleanName) return { ok: true, response: 'Quel produit veux-tu modifier ? Donne-moi son nom et éventuellement le nouveau prix.' }

    const { product, error: findError } = await findProductByName(admin, userId, cleanName)
    if (findError || !product) return { ok: false, response: `Je n’ai pas trouvé le produit “${cleanName}”.` }

    if (!price) {
      return { ok: true, response: `Le produit “${product.name}” est connu. Donne-moi le nouveau prix à appliquer, par exemple : “modifie le prix de ${product.name} à 500”.` }
    }

    if (!confirmed) {
      return { ok: true, response: `Tu veux vraiment fixer le prix de ${product.name} à ${money(price)} ? Confirme-moi avec “oui, modifie le prix de ${product.name}”.` }
    }

    const { error } = await admin.from('products').update({ selling_price: price, updated_at: new Date().toISOString() }).eq('id', product.id).eq('user_id', userId)
    if (error) return { ok: false, response: `Je n’ai pas pu modifier le prix de ${product.name}.` }

    return { ok: true, response: `Le prix de ${product.name} a été mis à ${money(price)}.` }
  }

  if (tool === 'delete_product') {
    const name = parseProductName(message.replace(/(?:supprim|efface|retire|supprimer|effacer|retirer)(?:.*produit)?/gi, ''))
    if (!name) return { ok: true, response: 'Quel produit veux-tu supprimer ? Donne-moi son nom exact.' }

    if (!confirmed) {
      return { ok: true, response: `Tu veux vraiment supprimer le produit “${name}” ? Réponds par “oui, supprime ${name}”.` }
    }

    const { error } = await admin.from('products').delete().eq('user_id', userId).ilike('name', `%${name}%`)
    if (error) return { ok: false, response: `Je n’ai pas pu supprimer “${name}”.` }

    return { ok: true, response: `Le produit “${name}” a bien été supprimé.` }
  }

  if (tool === 'general_query') {
    return { ok: true, response: 'Je peux aider avec les ventes, le stock, les produits, les clients et les rapports de Noppalé. Donne-moi une demande précise, par exemple : “combien ai-je vendu aujourd’hui ?” ou “ajoute 20 riz au stock”.' }
  }

  return { ok: true, response: 'Je peux t’aider à lire ou modifier les données de Noppalé, mais il me faut une demande précise sur les ventes, le stock, les produits ou les clients.' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('AI_API_KEY')
  const baseUrl = normalizeBaseUrl(Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1', 'https://api.openai.com/v1')
  const model = Deno.env.get('AI_MODEL') || 'claude-haiku-4-5'
  const provider = (Deno.env.get('AI_PROVIDER') || (baseUrl.includes('anthropic') ? 'anthropic' : 'openai')).toLowerCase()

  if (!apiKey) return json({ error: 'AI_API_KEY is not configured' }, 500)

  try {
    const body = await req.json()
    const message = typeof body?.message === 'string' ? body.message : ''
    const history = Array.isArray(body?.history) ? body.history : []
    const confirmed = Boolean(body?.confirmed) || isConfirmation(message)

    if (!message) return json({ error: 'message is required' }, 400)

    const context = await getUserContext(req)
    const tool = detectIntent(message)

    if (context.user && context.admin && (
      tool === 'sales_today' ||
      tool === 'stock_check' ||
      tool === 'add_stock' ||
      tool === 'create_product' ||
      tool === 'add_sale' ||
      tool === 'add_expense' ||
      tool === 'sales_insights' ||
      tool === 'debt_summary' ||
      tool === 'report_export' ||
      tool === 'update_product' ||
      tool === 'delete_product' ||
      tool === 'products_list' ||
      tool === 'customers_list' ||
      tool === 'report' ||
      tool === 'general_query'
    )) {
      const result = await executeTool(tool, message, context.user.id, context.admin, confirmed)
      const action = tool === 'add_sale'
        ? { type: 'invoice_followup', label: 'facture' }
        : tool === 'report_export'
          ? { type: 'report_followup', label: 'rapport', period: detectPeriod(message) }
          : null
      return json({ reply: result.response, tool, ok: result.ok, action })
    }

    if (context.error) {
      return json({ reply: context.error })
    }

    const safeHistory = Array.isArray(history) ? history.slice(-10).filter((m) => m?.role && m?.content) : []
    const system = `Tu es Mouna, l'assistante IA de Noppalé. Tu peux répondre en français, aider à gérer les ventes, le stock, les produits et les clients. Pour les actions sensibles, demande une confirmation avant d’écrire dans la base. N’utilise pas la base directement dans ta réponse : tu peux seulement utiliser les outils Noppalé sécurisés et résumer le résultat de manière claire.`

    let aiResponse: Response
    let reply: string | undefined

    if (provider === 'anthropic') {
      const anthropicBaseUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`
      const anthropicUrl = `${anthropicBaseUrl.replace(/\/$/, '')}/messages`
      const anthropicBody = {
        model,
        max_tokens: 1024,
        system,
        messages: [
          ...safeHistory
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: String(m.content)
            })),
          { role: 'user', content: message }
        ]
      }

      aiResponse = await fetch(anthropicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicBody)
      })

      if (!aiResponse.ok) {
        const detail = await aiResponse.text()
        return json({ error: 'Anthropic API error', detail }, 502)
      }

      const data = await aiResponse.json()
      reply = data?.content?.[0]?.text || 'Je n’ai pas de réponse.'
    } else {
      const openAiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`
      aiResponse = await fetch(openAiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...safeHistory, { role: 'user', content: message }],
          temperature: 0.2
        })
      })

      if (!aiResponse.ok) {
        const detail = await aiResponse.text()
        return json({ error: 'AI provider error', detail }, 502)
      }

      const data = await aiResponse.json()
      reply = data?.choices?.[0]?.message?.content || 'Je n’ai pas de réponse.'
    }

    return json({ reply })
  } catch (error) {
    console.error(error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
