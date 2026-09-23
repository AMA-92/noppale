const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  try {
    if (!req.headers.get('Authorization')) return json({ error: 'Connexion requise' }, 401)
    const apiKey = Deno.env.get('GOOGLE_SPEECH_API_KEY')
    if (!apiKey) return json({ error: 'GOOGLE_SPEECH_API_KEY manquante dans les secrets Edge Functions' }, 500)

    const payload = await req.json()
    const audioContent = String(payload.audioContent || payload.audio_base64 || '')
    const languageCode = String(payload.languageCode || 'fr-FR')
    if (!audioContent) return json({ error: 'Audio manquant' }, 400)

    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: payload.encoding || 'WEBM_OPUS',
          sampleRateHertz: payload.sampleRateHertz || 48000,
          languageCode,
          alternativeLanguageCodes: payload.alternativeLanguageCodes || ['fr-FR', 'en-US', 'ar-MA'],
          enableAutomaticPunctuation: true,
          maxAlternatives: 3,
          model: 'latest_long'
        },
        audio: { content: audioContent }
      })
    })

    const result = await response.json()
    if (!response.ok) return json({ error: result?.error?.message || `Google Speech HTTP ${response.status}` }, response.status)

    const alternatives = (result.results || []).flatMap((item: any) => item.alternatives || [])
    const best = alternatives[0]
    return json({
      transcript: best?.transcript || '',
      confidence: best?.confidence || 0,
      alternatives: alternatives.slice(0, 3).map((item: any) => ({ transcript: item.transcript || '', confidence: item.confidence || 0 }))
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erreur Speech-to-Text' }, 500)
  }
})
