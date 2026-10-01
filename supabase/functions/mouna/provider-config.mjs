export function createMounaProviders(getEnv) {
  const apiKey = getEnv('GEMINI_API_KEY')
  if (typeof apiKey !== 'string' || !apiKey.trim()) return []

  return [{
    name: 'Gemini Live',
    apiKey: apiKey.trim(),
    model: getEnv('GEMINI_LIVE_MODEL') || 'gemini-3.8-live',
    voiceStyle: getEnv('MOUNA_VOICE_STYLE') || 'female_soft_warm',
    language: getEnv('MOUNA_DEFAULT_LANGUAGE') || 'fr',
  }]
}
