import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SYSTEM_PROMPT = `Tu es Noppalé, l'assistant vocal personnel d'une application de gestion commerciale pour les commerçants d'Afrique de l'Ouest.

CONTEXTE :
- Aides un commerçant à gérer ses produits, son stock, ses ventes, ses dépenses, ses clients et ses statistiques
- L'utilisateur peut parler en français, wolof, arabe ou anglais
- Formate les montants avec des espaces entre les milliers et la devise (ex: 15 000 FCFA)

RÈGLES DE CONVERSATION :
- Réponds en deux phrases courtes maximum (environ 30 mots), sauf si l'utilisateur demande explicitement un détail
- Sois chaleureux, calme, direct et utile comme un assistant humain naturel
- Pose une seule question à la fois et attends la réponse avant de continuer
- Respecte la langue de l'utilisateur

RÈGLES DE DONNÉES :
- Utilise les informations fournies dans le contexte (ventes, dépenses, produits, etc.)
- Ne fabrique jamais de données
- Si une information est manquante, dis-le clairement

INSTRUCTIONS SPÉCIALES :
- Après un simple bonjour, réponds uniquement par une salutation courte
- Ne lance jamais d'explication spontanée de tes capacités
- Pour les commandes complexes (ajout produit, vente, etc.), résume l'action et demande confirmation
- Cette version est en lecture seule : ne prétends jamais avoir exécuté une action de modification

DEMANDE : Réponds de manière naturelle et conversationnelle comme un assistant vocal réel.`

export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, context, language = 'fr-FR', currency = 'FCFA' } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message requis' })
    }

    console.log('🤖 Reçu:', { message, language, currency })

    // Détection de la langue
    const detectLanguage = (text) => {
      const value = text.toLowerCase()
      if (/\b(hello|hi|good morning|good afternoon|how are you|how much|today|sold|expense|profit|stock)\b/.test(value)) return 'anglais'
      if (/\b(ça va|ca va|nanga def|naa nga def|jamm|dama|yow|waaw|deedeet|ndank|xam nga)\b/.test(value)) return 'wolof'
      if (/[\u0600-\u06ff]/.test(text)) return 'arabe'
      return 'français'
    }

    const detectedLanguage = detectLanguage(message)
    const languageInstruction = detectedLanguage === 'anglais'
      ? 'Réponds en anglais.'
      : detectedLanguage === 'wolof'
        ? 'Réponds en wolof si tu peux le faire correctement ; sinon réponds en français simple.'
        : detectedLanguage === 'arabe'
          ? 'Réponds en arabe.'
          : 'Réponds en français.'

    const systemPrompt = `${SYSTEM_PROMPT}\n\n${languageInstruction}\n\nDevise : ${currency}`

    // Construire le contexte pour Claude
    let contextInfo = ''
    if (context) {
      if (context.products?.length > 0) {
        contextInfo += `\nProduits disponibles: ${context.products.map(p => p.name).join(', ')}`
      }
      if (context.sales?.length > 0) {
        const todaySales = context.sales.filter(s => isToday(s.created_at || s.createdAt))
        const totalSales = todaySales.reduce((sum, s) => sum + (s.total || 0), 0)
        contextInfo += `\nVentes aujourd'hui: ${todaySales.length} ventes pour un total de ${totalSales.toLocaleString('fr-FR')} ${currency}`
      }
      if (context.expenses?.length > 0) {
        const todayExpenses = context.expenses.filter(e => isToday(e.date || e.created_at))
        const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        contextInfo += `\nDépenses aujourd'hui: ${totalExpenses.toLocaleString('fr-FR')} ${currency}`
      }
    }

    function isToday(dateStr) {
      if (!dateStr) return false
      const date = new Date(dateStr)
      const today = new Date()
      return date.toDateString() === today.toDateString()
    }

    // Appel à Claude API
    const userMessage = contextInfo 
      ? `${message}\n\nContexte actuel:${contextInfo}`
      : message

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })

    const assistantResponse = response.content[0].text
    console.log('✅ Réponse Claude:', assistantResponse)

    res.status(200).json({
      response: assistantResponse,
      language: detectedLanguage,
      model: 'claude-3-5-sonnet-20241022'
    })

  } catch (error) {
    console.error('❌ Erreur assistant:', error)
    res.status(500).json({ 
      error: error.message || 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}