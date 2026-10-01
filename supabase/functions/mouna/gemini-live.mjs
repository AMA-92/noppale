const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function toGeminiTools(tools = []) {
  const declarations = tools
    .filter((tool) => tool?.type === 'function' && tool.function?.name)
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || '',
      parameters: tool.function.parameters || { type: 'object', properties: {} }
    }))
  return declarations.length ? [{ functionDeclarations: declarations }] : []
}

function toPrompt(messages = []) {
  return messages
    .filter((message) => message?.role && typeof message.content === 'string')
    .map((message) => {
      const role = message.role === 'assistant' ? 'Mouna' : message.role === 'tool' ? 'Résultat serveur' : 'Utilisateur'
      return `${role}: ${message.content.slice(0, 12000)}`
    })
    .join('\n')
}

function extractText(message) {
  const serverContent = message?.serverContent || {}
  const parts = serverContent.modelTurn?.parts || []
  const generated = parts.map((part) => part?.text || '').filter(Boolean).join(' ')
  const transcription = serverContent.outputTranscription?.text || ''
  return `${generated} ${transcription}`.trim()
}

async function waitForMessage(socket, timeoutMs) {
  return await Promise.race([
    new Promise((resolve, reject) => {
      const onMessage = (event) => {
        cleanup()
        try {
          resolve(JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)))
        } catch (error) {
          reject(new Error(`Réponse Gemini Live invalide : ${error.message}`))
        }
      }
      const onError = () => { cleanup(); reject(new Error('Connexion Gemini Live interrompue.')) }
      const onClose = () => { cleanup(); reject(new Error('Session Gemini Live fermée prématurément.')) }
      const cleanup = () => {
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('error', onError)
        socket.removeEventListener('close', onClose)
      }
      socket.addEventListener('message', onMessage)
      socket.addEventListener('error', onError)
      socket.addEventListener('close', onClose)
    }),
    sleep(timeoutMs).then(() => { throw new Error('Délai Gemini Live dépassé.') })
  ])
}

export async function runGeminiLiveTurn({ apiKey, model, language = 'fr', voiceStyle = 'female_soft_warm', messages, tools, timeoutMs = 12000 }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY est absent des secrets Supabase.')
  const socket = new WebSocket(`${LIVE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`)
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connexion Gemini Live dépassée.')), timeoutMs)
      socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Connexion Gemini Live refusée.')) }, { once: true })
    })

    const system = messages.find((message) => message?.role === 'system')?.content || ''
    const conversation = toPrompt(messages.filter((message) => message?.role !== 'system'))
    const languageCode = language === 'ar' ? 'ar-SA' : language === 'wo' ? 'wo-SN' : 'fr-FR'
    const voiceName = voiceStyle === 'female_soft_warm' ? 'Aoede' : 'Aoede'
    socket.send(JSON.stringify({
      setup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          temperature: 0.2,
          maxOutputTokens: 320,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            languageCode
          }
        },
        systemInstruction: { parts: [{ text: `${system}\nVoix : féminine, douce, chaleureuse, posée et claire. ${conversation}` }] },
        tools: toGeminiTools(tools),
        contextWindowCompression: { triggerTokens: 12000, slidingWindow: { targetTokens: 8000 } },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    }))

    let setupComplete = false
    while (!setupComplete) setupComplete = !!(await waitForMessage(socket, timeoutMs)).setupComplete

    socket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: conversation || 'Réponds brièvement à la demande utilisateur.' }] }],
        turnComplete: true
      }
    }))

    let text = ''
    let toolCalls = []
    for (let count = 0; count < 40; count += 1) {
      const message = await waitForMessage(socket, timeoutMs)
      text = `${text} ${extractText(message)}`.trim()
      if (message.toolCall?.functionCalls?.length) {
        toolCalls = message.toolCall.functionCalls.slice(0, 3).map((call) => ({
          id: call.id,
          type: 'function',
          function: {
            name: call.name,
            arguments: JSON.stringify(call.args || {})
          }
        }))
        break
      }
      if (message.serverContent?.turnComplete) break
    }
    return { content: text.trim(), tool_calls: toolCalls }
  } finally {
    try { socket.close() } catch { /* déjà fermé */ }
  }
}
