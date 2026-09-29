const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function makeMounaRequestBody({ message, history = [], saleState = null }) {
  const body = {
    message: String(message || ''),
    history: Array.isArray(history) ? history.slice(-10) : [],
  }
  const requestId = globalThis.crypto?.randomUUID?.()
  if (requestId) body.request_id = requestId
  if (saleState && typeof saleState === 'object' && !Array.isArray(saleState)) {
    body.sale_state = saleState
  }
  return body
}

export function makeMounaConfirmationBody(actionId, confirm = true) {
  if (typeof actionId !== 'string' || !UUID.test(actionId)) {
    throw new Error('Identifiant de confirmation invalide.')
  }
  return confirm ? { confirm_action_id: actionId } : { cancel_action_id: actionId }
}

export function getMounaPendingConfirmation(data) {
  const pending = data?.pending_confirmation
  return pending && typeof pending.id === 'string' && UUID.test(pending.id)
    ? pending
    : null
}

export function classifyMounaConfirmation(text, language = 'fr') {
  const value = String(text || '').trim().toLocaleLowerCase(language === 'ar' ? 'ar' : 'fr')
  if (!value) return null
  const affirmative = {
    fr: /^(?:oui|oui je confirme|je confirme|confirme|confirmer|d'accord|d’accord|ok|okay)(?:[.!?,;\s]|$)/iu,
    ar: /^(?:نعم|أؤكد|أوافق|موافق|تمام|حسنًا|حسنا|أكد)(?:[.!?،,;\s]|$)/u,
    wo: /^(?:waaw|dëggal|dëggal naa|baax na|waaw dëggal|ok)(?:[.!?،,;\s]|$)/iu,
  }
  const negative = {
    fr: /^(?:non|annule|annuler|j'annule|j’annule|stop)(?:[.!?,;\s]|$)/iu,
    ar: /^(?:لا|ألغ|ألغِ|إلغاء|الغاء|أرفض|ارفض)(?:[.!?،,;\s]|$)/u,
    wo: /^(?:deedeet|nekkal|bañ|bëgguma|stop)(?:[.!?،,;\s]|$)/iu,
  }
  const lang = ['fr', 'ar', 'wo'].includes(language) ? language : 'fr'
  if (affirmative[lang].test(value)) return 'confirm'
  if (negative[lang].test(value)) return 'cancel'
  return null
}
