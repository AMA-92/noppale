const LANGUAGES = new Set(['fr', 'ar', 'wo'])

export function getMounaGreeting(language = 'fr', accountName = '') {
  const lang = LANGUAGES.has(language) ? language : 'fr'
  const name = String(accountName || '').trim().slice(0, 60)
  if (lang === 'ar') return name
    ? `مرحبًا، ${name}. أنا منى. كيف يمكنني مساعدتك؟`
    : 'مرحبًا، أنا منى. كيف يمكنني مساعدتك؟'
  if (lang === 'wo') return name
    ? `Naka nga def, ${name}? Maa ngi Mouna. Lan laa mën la dimbali?`
    : 'Naka nga def? Maa ngi Mouna. Lan laa mën la dimbali?'
  return name
    ? `Bonjour, ${name}, je suis Mouna. Que puis-je faire pour vous ?`
    : 'Bonjour, je suis Mouna. Que puis-je faire pour vous ?'
}

export function getMounaProgressMessage(language = 'fr') {
  if (language === 'ar') return 'أتحقق من طلبك الآن…'
  if (language === 'wo') return 'Maa ngi seet sa laaj léegi…'
  return 'Je vérifie votre demande…'
}

export function getMounaErrorMessage(language = 'fr', error) {
  const lang = LANGUAGES.has(language) ? language : 'fr'
  const message = String(error?.message || '').trim().slice(0, 500)
  const status = Number(error?.status || error?.context?.status || 0)
  const providerFailure = /aucun fournisseur IA|aucun cerveau IA|Mouna est temporairement indisponible/i.test(message)

  if (status === 401 || /session utilisateur introuvable|jeton utilisateur invalide|connexion requise/i.test(message)) {
    if (lang === 'ar') return 'انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.'
    if (lang === 'wo') return 'Sesioni dugg bi jeex na. Duggwaat te jéemaat.'
    return 'Ta session a expiré. Reconnecte-toi puis réessaie.'
  }

  if (providerFailure || status === 503) {
    const base = lang === 'ar'
      ? 'تعذّر الوصول إلى محركات الذكاء الاصطناعي.'
      : lang === 'wo'
        ? 'Mouna mënul jokkoo ak xel mu màndarga yi.'
        : 'Mouna n’a pas réussi à joindre un moteur IA.'
    return message ? `${base}\n${message}` : base
  }

  if (lang === 'ar') return 'تعذّر على منى إتمام الطلب. تحقّق من الاتصال ثم حاول مرة أخرى.'
  if (lang === 'wo') return 'Mouna mënul jeexal sa laaj. Seetal sa jokkoo te jéemaat.'
  return 'Mouna n’a pas pu terminer la demande. Vérifie la connexion puis réessaie.'
}
