// Mouna - passerelle IA sécurisée côté serveur.
// Ne place JAMAIS la clé du fournisseur IA dans le PWA.
// Configure les secrets Supabase : AI_API_KEY, AI_BASE_URL, AI_MODEL.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('AI_API_KEY')
  const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1'
  const model = Deno.env.get('AI_MODEL') || 'gpt-4o-mini'
  if (!apiKey) return json({ error: 'AI_API_KEY is not configured' }, 500)

  try {
    const { message, history = [] } = await req.json()
    if (!message || typeof message !== 'string') return json({ error: 'message is required' }, 400)

    const safeHistory = Array.isArray(history) ? history.slice(-10).filter((m) => m?.role && m?.content) : []
    const system = `Tu es Mouna, l'assistante IA de Noppalé, une application de gestion commerciale. Réponds en français, clairement et brièvement. Pour le moment, tu ne dois pas prétendre avoir exécuté une action dans Noppalé : les outils métier seront ajoutés progressivement. Si une demande nécessite une action réelle, explique que l'outil correspondant doit être activé.`

    const aiResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
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
    return json({ reply: data?.choices?.[0]?.message?.content || 'Je n’ai pas de réponse.' })
  } catch (error) {
    console.error(error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
