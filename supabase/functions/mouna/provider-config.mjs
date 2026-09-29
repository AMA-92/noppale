export function normalizeMounaProviderBaseUrl(configured, fallback) {
  const value = (configured || fallback).trim()
  if (!value) return fallback

  const baseUrl = value.replace(/\/+$/, '')
  if (baseUrl.includes('generativelanguage.googleapis.com/v1beta/openai')) return baseUrl
  if (/\/v\d+$/.test(baseUrl)) return baseUrl
  return `${baseUrl}/v1`
}

export function createMounaProviders(getEnv) {
  const apiKey = getEnv('CODECRAFT_API_KEY')
  if (typeof apiKey !== 'string' || !apiKey.trim()) return []

  return [{
    name: 'CodeCraft',
    apiKey: apiKey.trim(),
    baseUrl: normalizeMounaProviderBaseUrl(getEnv('CODECRAFT_BASE_URL'), 'https://codecraftapi.com/v1')
      .replace(/^https:\/\/www\.codecraftapi\.com(?=\/|$)/i, 'https://codecraftapi.com'),
    model: getEnv('CODECRAFT_MODEL') || 'claude-sonnet-5',
  }]
}
