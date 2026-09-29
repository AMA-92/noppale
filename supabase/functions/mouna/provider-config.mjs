export function normalizeMounaProviderBaseUrl(configured, fallback) {
  const value = (configured || fallback).trim()
  if (!value) return fallback

  const baseUrl = value.replace(/\/+$/, '')
  if (baseUrl.includes('generativelanguage.googleapis.com/v1beta/openai')) return baseUrl
  if (/\/v\d+$/.test(baseUrl)) return baseUrl
  return `${baseUrl}/v1`
}

export function createMounaProviders(getEnv) {
  const env = (name) => getEnv(name)

  return [
    {
      name: 'GLM',
      apiKey: env('GLM_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('GLM_BASE_URL'), 'https://api.z.ai/api/paas/v4'),
      model: env('GLM_MODEL') || 'glm-5.3-flash',
    },
    {
      name: 'CodeCraft',
      apiKey: env('CODECRAFT_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('CODECRAFT_BASE_URL'), 'https://codecraftapi.com/v1')
        .replace(/^https:\/\/www\.codecraftapi\.com(?=\/|$)/i, 'https://codecraftapi.com'),
      model: 'claude-sonnet-5',
    },
    {
      name: 'Gemini',
      apiKey: env('GEMINI_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('GEMINI_BASE_URL'), 'https://generativelanguage.googleapis.com/v1beta/openai'),
      model: env('GEMINI_TEXT_MODEL') || 'gemini-3.8-flash',
    },
    {
      name: 'OpenAI',
      apiKey: env('OPENAI_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('OPENAI_BASE_URL'), 'https://api.openai.com/v1'),
      model: env('OPENAI_TEXT_MODEL') || 'gpt-4o-mini',
      realtimeModel: env('OPENAI_REALTIME_MODEL') || 'gpt-realtime-2.1-mini',
    },
    {
      name: 'AI',
      apiKey: env('AI_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('AI_BASE_URL'), 'https://api.openai.com/v1'),
      model: env('AI_MODEL') || 'gpt-4o-mini',
    },
    {
      name: 'Mistral',
      apiKey: env('MISTRAL_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('MISTRAL_BASE_URL'), 'https://api.mistral.ai/v1'),
      model: env('MISTRAL_MODEL') || 'mistral-small-latest',
    },
    {
      name: 'DeepSeek',
      apiKey: env('DEEPSEEK_API_KEY'),
      baseUrl: normalizeMounaProviderBaseUrl(env('DEEPSEEK_BASE_URL'), 'https://api.deepseek.com/v1'),
      model: env('DEEPSEEK_MODEL') || 'deepseek-chat',
    },
  ].filter((provider) => typeof provider.apiKey === 'string' && provider.apiKey.trim())
}
