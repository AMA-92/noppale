import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const tools = [
  { type: 'function', function: { name: 'get_today_sales', description: 'Calcule le chiffre d’affaires et le nombre de ventes du jour.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_today_expenses', description: 'Calcule le total des dépenses du jour.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_today_profit', description: 'Calcule le bénéfice estimé du jour après le coût des produits vendus et les dépenses.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_outstanding_debts', description: 'Calcule le total des dettes encore dues par les clients.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_stock_status', description: 'Retourne les produits en rupture et ceux dont le stock est faible.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'search_products', description: 'Recherche les produits dont le nom correspond à une demande.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Nom ou partie du nom du produit' } }, required: ['query'], additionalProperties: false } } }
]

const detectLanguage = (text: string) => {
  const value = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/\b(hello|hi|good morning|good afternoon|how much|how many|today|sold|expense|profit|stock)\b/.test(value)) return 'anglais'
  if (/\b(ça va|ca va|nanga def|naa nga def|jamm|dama|yow|waaw|déedéet|deedeet|ndank|xam nga)\b/.test(value)) return 'wolof'
  if (/[\u0600-\u06ff]/.test(text) || /\b(ahlan|salam|marhaban)\b/.test(value)) return value.includes('marhaban') ? 'français' : 'arabe'
  return 'français'
}

const languageInstruction = (language: string) => language === 'anglais'
  ? 'Réponds en anglais.'
  : language === 'wolof'
    ? 'Réponds en wolof si tu peux le faire correctement ; sinon réponds en français simple.'
    : language === 'arabe'
      ? 'Réponds en arabe.'
      : 'Réponds en français.'

const baseInstruction = `Tu es Noppalé, l’assistant vocal d’une application de gestion commerciale.
Sois naturel, chaleureux, bref et direct. Ne récite jamais la liste de tes capacités. Pose une seule question à la fois.
Utilise les outils pour les chiffres et ne fabrique jamais de données. Formate les montants avec des espaces entre les milliers et la devise fournie.
Cette version autorise uniquement les outils de lecture. Pour toute création, modification, dépense ou vente, demande les informations nécessaires et précise qu’une confirmation sera requise.`

const callOpenAI = async (messages: unknown[], useTools = true) => {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY manquante dans les secrets Edge Functions')
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, ...(useTools ? { tools, tool_choice: 'auto' } : {}) }) })
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`)
  return response.json()
}

const dayStart = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date.toISOString() }
const dayDate = () => new Date().toISOString().split('T')[0]

async function readData(userId: string, supabase: ReturnType<typeof createClient>) {
  const [salesResult, expensesResult, productsResult] = await Promise.all([
    supabase.from('sales').select('id, total, items, created_at, payment_method, paid_amount, remaining_amount, customer_name').eq('user_id', userId).gte('created_at', dayStart()),
    supabase.from('expenses').select('amount, date, created_at').eq('user_id', userId).gte('date', dayDate()),
    supabase.from('products').select('id, name, stock, min_stock, buying_price, selling_price').eq('user_id', userId)
  ])
  if (salesResult.error) throw salesResult.error
  if (expensesResult.error) throw expensesResult.error
  if (productsResult.error) throw productsResult.error
  return { sales: salesResult.data || [], expenses: expensesResult.data || [], products: productsResult.data || [] }
}

async function runTool(name: string, args: Record<string, unknown>, userId: string, supabase: ReturnType<typeof createClient>) {
  const data = await readData(userId, supabase)
  const sales = data.sales
  const expenses = data.expenses
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  const expensesTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const cost = sales.reduce((sum, sale) => sum + (Array.isArray(sale.items) ? sale.items.reduce((itemSum, item) => { const product = data.products.find((candidate) => candidate.id === item.productId); return itemSum + Number(item.quantity || 0) * Number(product?.buying_price || 0) }, 0) : 0), 0)
  if (name === 'get_today_sales') return { count: sales.length, total: revenue, currency: 'FCFA' }
  if (name === 'get_today_expenses') return { count: expenses.length, total: expensesTotal, currency: 'FCFA' }
  if (name === 'get_today_profit') return { revenue, productCost: cost, expenses: expensesTotal, profit: revenue - cost - expensesTotal, currency: 'FCFA' }
  if (name === 'get_outstanding_debts') {
    const creditSales = (await supabase.from('sales').select('customer_name, total, paid_amount, remaining_amount, payment_method').eq('user_id', userId).eq('payment_method', 'credit')).data || []
    const total = creditSales.reduce((sum, sale) => sum + Math.max(0, Number(sale.remaining_amount ?? (Number(sale.total || 0) - Number(sale.paid_amount || 0)))), 0)
    return { count: creditSales.length, total, currency: 'FCFA', customers: creditSales.map((sale) => ({ name: sale.customer_name || 'Client', remaining: Number(sale.remaining_amount ?? 0) })) }
  }
  if (name === 'get_stock_status') return { outOfStock: data.products.filter((product) => Number(product.stock || 0) === 0).map((product) => product.name), lowStock: data.products.filter((product) => Number(product.stock || 0) > 0 && Number(product.min_stock || 0) > 0 && Number(product.stock) <= Number(product.min_stock)).map((product) => ({ name: product.name, stock: Number(product.stock) })) }
  if (name === 'search_products') { const query = String(args.query || '').toLowerCase(); return { products: data.products.filter((product) => product.name.toLowerCase().includes(query)).map((product) => ({ name: product.name, stock: Number(product.stock || 0), sellingPrice: Number(product.selling_price || 0) })) } }
  throw new Error(`Outil inconnu : ${name}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'Connexion requise' }, 401)
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Session invalide' }, 401)
    const payload = await req.json()
    const incoming = Array.isArray(payload.messages) ? payload.messages : payload.message ? [{ role: 'user', content: String(payload.message) }] : []
    if (!incoming.length) return json({ error: 'La conversation est vide' }, 400)
    const lastMessage = String(incoming[incoming.length - 1].content || '')
    const language = detectLanguage(lastMessage)
    const currency = String(payload.currency || 'FCFA')
    const messages: any[] = [{ role: 'system', content: `${baseInstruction}\n${languageInstruction(language)}\nAprès un simple bonjour, réponds uniquement par une salutation courte et attends la demande. Devise : ${currency}.` }, ...incoming.map((message: any) => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: String(message.content || '') }))]
    let result = await callOpenAI(messages)
    let assistantMessage = result.choices?.[0]?.message
    const toolCalls = assistantMessage?.tool_calls || []
    if (toolCalls.length) {
      messages.push(assistantMessage)
      for (const toolCall of toolCalls) messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(await runTool(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'), user.id, supabase)) })
      result = await callOpenAI(messages, false)
      assistantMessage = result.choices?.[0]?.message
    }
    return json({ text: String(assistantMessage?.content || 'Je n’ai pas pu formuler une réponse.').trim(), language, model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini' })
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : 'Erreur interne de l’assistant' }, 500) }
})
