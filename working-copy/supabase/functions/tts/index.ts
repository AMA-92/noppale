import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)))
  }
  return btoa(binary)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'Connexion requise' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Session invalide' }, 401)

    const endpoint = Deno.env.get('TTS_ENDPOINT')
    if (!endpoint) return json({ fallback: true, reason: 'TTS_ENDPOINT manquant' })

    const payload = await req.json()
    const text = String(payload?.text || '').trim()
    const language = String(payload?.language || 'fr-FR')
    if (!text) return json({ error: 'Texte manquant' }, 400)

    const ttsResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('TTS_API_KEY') ? {
          Authorization: `Bearer ${Deno.env.get('TTS_API_KEY')}`,
          'X-API-Key': Deno.env.get('TTS_API_KEY') || ''
        } : {})
      },
      body: JSON.stringify({ text, language })
    })
    if (!ttsResponse.ok) throw new Error(`TTS HTTP ${ttsResponse.status}`)

    const contentType = ttsResponse.headers.get('content-type') || ''
    if (contentType.includes('audio/')) {
      const audio = await ttsResponse.arrayBuffer()
      return json({ audio_base64: bytesToBase64(new Uint8Array(audio)), mime_type: contentType.split(';')[0] })
    }

    const result = await ttsResponse.json()
    const audioBase64 = result.audio_base64 || result.audioContent || result.audio || result.data
    if (!audioBase64) throw new Error('Réponse TTS sans audio')
    return json({ audio_base64: String(audioBase64), mime_type: result.mime_type || 'audio/wav' })
  } catch (error) {
    console.error(error)
    return json({ fallback: true, error: error instanceof Error ? error.message : 'Erreur TTS' })
  }
})
