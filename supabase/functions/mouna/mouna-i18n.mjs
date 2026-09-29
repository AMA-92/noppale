const LANGUAGES = new Set(['fr', 'ar', 'wo'])

const exactReplies = {
  ar: new Map([
    ['Quel est le nom du produit ?', 'ما اسم المنتج؟'],
    ['Quel est son prix d’achat ?', 'ما سعر شراء المنتج؟'],
    ['Quel est son prix de vente ?', 'ما سعر بيع المنتج؟'],
    ['Quel est son stock initial ?', 'ما الكمية الأولية في المخزون؟'],
    ['Quel est son seuil de stock minimal ?', 'ما الحد الأدنى للمخزون؟'],
    ['Quel est le nom du client ?', 'ما اسم العميل؟'],
    ['Quel produit voulez-vous vendre ?', 'ما المنتج الذي تريد بيعه؟'],
    ['Quel autre produit voulez-vous ajouter ?', 'ما المنتج الآخر الذي تريد إضافته؟'],
    ['Est-ce tout pour cette vente ?', 'هل اكتملت هذه البيعة؟'],
    ['D’accord, cette vente est annulée et ne sera pas enregistrée.', 'حسنًا، أُلغيت هذه البيعة ولن تُسجّل.'],
    ['Comment le client souhaite-t-il payer : espèces, Mobile Money ou à crédit ?', 'كيف يريد العميل الدفع: نقدًا، عبر الهاتف المحمول، أم بالدَّين؟'],
    ['Le client a-t-il versé une avance ?', 'هل دفع العميل عربونًا؟'],
    ['Quel montant a-t-il versé en avance ?', 'ما مبلغ العربون الذي دفعه؟'],
    ['Par quel moyen a-t-il payé l’avance ?', 'بأي وسيلة دفع العربون؟'],
    ['Combien avez-vous encaissé en espèces ?', 'كم استلمت نقدًا؟'],
    ['Action préparée. Elle attend votre confirmation.', 'تم تجهيز الإجراء، وهو بانتظار تأكيدك.'],
    ['Action annulée. Aucune modification n’a été apportée.', 'أُلغيت العملية. لم يُجرَ أي تغيير.'],
    ['Cette confirmation est déjà expirée ou a déjà été traitée.', 'انتهت صلاحية هذا التأكيد أو تمت معالجته مسبقًا.'],
  ]),
  wo: new Map([
    ['Quel est le nom du produit ?', 'Lan mooy turu produit bi?'],
    ['Quel est son prix d’achat ?', 'Ñaata lañu jëndé produit bi?'],
    ['Quel est son prix de vente ?', 'Ñaata lañu koy jaay?'],
    ['Quel est son stock initial ?', 'Ñaata produit lañuy dugal ci stock bi?'],
    ['Quel est son seuil de stock minimal ?', 'Ban mooy seuil bi ci stock?'],
    ['Quel est le nom du client ?', 'Lan mooy turu klient bi?'],
    ['Quel produit voulez-vous vendre ?', 'Ban produit nga bëgg jaay?'],
    ['Quel autre produit voulez-vous ajouter ?', 'Ban beneen produit nga bëgg yokk?'],
    ['Est-ce tout pour cette vente ?', 'Lii yépp la ci vente bi?'],
    ['D’accord, cette vente est annulée et ne sera pas enregistrée.', 'Baax na, vente bi nekkatul te duñu ko bind.'],
    ['Comment le client souhaite-t-il payer : espèces, Mobile Money ou à crédit ?', 'Naka la klient bi bëgg fey: cash, Mobile Money, walla crédit?'],
    ['Le client a-t-il versé une avance ?', 'Ndax klient bi joxe na avance?'],
    ['Quel montant a-t-il versé en avance ?', 'Ñaata la klient bi joxe ci avance?'],
    ['Par quel moyen a-t-il payé l’avance ?', 'Ban yoon la fayee avance bi?'],
    ['Combien avez-vous encaissé en espèces ?', 'Ñaata xaalis nga jot ci cash?'],
    ['Action préparée. Elle attend votre confirmation.', 'Jëfandikoo bi waajal na, dafay xaar sa dëggal.'],
    ['Action annulée. Aucune modification n’a été apportée.', 'Jëfandikoo bi nekkatul; dara soppeekul.'],
    ['Cette confirmation est déjà expirée ou a déjà été traitée.', 'Dëggal gi jeex na walla jëfandikoo nañu ko ba noppi.'],
  ]),
}

function translateDynamicQuestion(language, reply) {
  let match = reply.match(/^Le client « (.+) » n’est pas enregistré\. Voulez-vous l’ajouter à la liste des clients \?$/u)
  if (match) return language === 'ar'
    ? `العميل «${match[1]}» غير مسجّل. هل تريد إضافته إلى قائمة العملاء؟`
    : `Klient «${match[1]}» binduñu ko. Ndax bëgg nga yokk ko ci limu klien yi?`

  match = reply.match(/^Combien d’unités de « (.+) » voulez-vous vendre \?$/u)
  if (match) return language === 'ar'
    ? `كم وحدة من «${match[1]}» تريد بيعها؟`
    : `Ñaata pès ci «${match[1]}» nga bëgg jaay?`

  match = reply.match(/^Le panier pour (.+), d’un total de (.+?) (.+), est prêt\. Voulez-vous enregistrer cette vente \?$/u)
  if (match) return language === 'ar'
    ? `سلة ${match[1]} جاهزة، والإجمالي ${match[2]} ${match[3]}. هل تريد تسجيل هذه البيعة؟`
    : `Panier bu ${match[1]} pare na, total bi mooy ${match[2]} ${match[3]}. Ndax bëgg nga bind vente bi?`

  match = reply.match(/^Le solde de (.+?) (.+?) sera-t-il laissé à crédit ou réglé autrement \?$/u)
  if (match) return language === 'ar'
    ? `هل سيبقى الرصيد ${match[1]} ${match[2]} دَينًا أم سيدفع بطريقة أخرى؟`
    : `Ndax solde ${match[1]} ${match[2]} dina nekk crédit walla dinañu ko fey beneen yoon?`

  match = reply.match(/^Par quel moyen le client a-t-il réglé le solde de (.+?) (.+?) \?$/u)
  if (match) return language === 'ar'
    ? `بأي وسيلة دفع العميل الرصيد ${match[1]} ${match[2]}؟`
    : `Ban yoon la klient bi feyee solde ${match[1]} ${match[2]}?`

  match = reply.match(/^Quel montant le client a-t-il réglé par (.+) \?$/u)
  if (match) return language === 'ar'
    ? `ما المبلغ الذي دفعه العميل عبر ${match[1]}؟`
    : `Ñaata la klient bi fey ci ${match[1]}?`

  return null
}

export function localizeMounaReply(language, reply) {
  const lang = LANGUAGES.has(language) ? language : 'fr'
  const text = String(reply || '')
  if (lang === 'fr' || !text) return text
  const exact = exactReplies[lang].get(text)
  if (exact) return exact
  return translateDynamicQuestion(lang, text) || text
}

function localizeSaleSummary(language, summary) {
  if (language === 'ar') {
    return summary
      .replace(/^Créer la vente pour /u, 'تأكيد البيع للعميل ')
      .replace(/\. Récapitulatif : le client /u, '. الملخص: العميل ')
      .replace(/ a acheté /u, ' اشترى ')
      .replace(/; total /u, '؛ الإجمالي ')
      .replace(/; paiement /u, '؛ الدفع ')
      .replace(/ par /gu, ' عبر ')
      .replace(/; reste à crédit /u, '؛ المتبقي بالدَّين ')
      .replace(/; monnaie à rendre /u, '؛ الباقي لإرجاعه ')
  }
  return summary
    .replace(/^Créer la vente pour /u, 'Dëggal vente bi ci turu ')
    .replace(/\. Récapitulatif : le client /u, '. Klient bi ')
    .replace(/ a acheté /u, ' jënd na ')
    .replace(/; total /u, '; total bi ')
    .replace(/; paiement /u, '; feyukaay ')
    .replace(/ par /gu, ' ci ')
    .replace(/; reste à crédit /u, '; solde crédit ')
    .replace(/; monnaie à rendre /u, '; xaalis bi ñuy delloo ')
}

export function localizePendingConfirmation(language, pendingConfirmation) {
  const lang = LANGUAGES.has(language) ? language : 'fr'
  const summary = String(pendingConfirmation?.summary || '').trim()
  if (lang === 'fr') {
    if (/^Créer la vente pour /iu.test(summary)) return `${summary} Confirmez-vous cette vente ?`
    return 'Action préparée. Elle attend votre confirmation.'
  }

  let match = summary.match(/^Créer le produit « (.+?) » — prix de vente (.+?), prix d’achat (.+?), stock initial (.+?), alerte à (.+?)\.$/u)
  if (match) return lang === 'ar'
    ? `هل تؤكد إضافة المنتج «${match[1]}»؟ سعر البيع ${match[2]}، سعر الشراء ${match[3]}، المخزون الأولي ${match[4]}، والحد الأدنى ${match[5]}.`
    : `Ndax nga dëggal yokk produit «${match[1]}»? Prix vente ${match[2]}, prix achat ${match[3]}, stock initial ${match[4]}, seuil ${match[5]}.`

  match = summary.match(/^Modifier le produit « (.+?) » \((.+)\)\.$/u)
  if (match) {
    const changes = match[2].replace(/selling_price/gu, lang === 'ar' ? 'سعر البيع' : 'prix vente')
      .replace(/buying_price/gu, lang === 'ar' ? 'سعر الشراء' : 'prix achat')
      .replace(/min_stock/gu, lang === 'ar' ? 'الحد الأدنى للمخزون' : 'seuil stock')
    return lang === 'ar'
      ? `هل تؤكد تعديل المنتج «${match[1]}» (${changes})؟`
      : `Ndax nga dëggal soppi produit «${match[1]}» (${changes})?`
  }

  if (/^Créer la vente pour /u.test(summary)) {
    const localizedSummary = localizeSaleSummary(lang, summary)
    return lang === 'ar'
      ? `${localizedSummary} هل تؤكد تسجيل البيع؟`
      : `${localizedSummary} Ndax nga dëggal bind vente bi?`
  }

  return lang === 'ar'
    ? `الإجراء المقترح: ${summary || 'إجراء'}. هل تؤكد؟`
    : `Jëfandikoo bi: ${summary || 'jëfandikoo'}. Ndax nga dëggal?`
}

export function localizeConfirmedActionReply(language, operation, frenchReply = '') {
  const lang = LANGUAGES.has(language) ? language : 'fr'
  if (lang === 'fr') return frenchReply
  const change = String(frenchReply).match(/Monnaie à rendre\s*:\s*([\d\s\u00a0\u202f.,]+)/iu)?.[1]?.trim()
  if (operation === 'create_sale') {
    if (lang === 'ar') return `تم تسجيل البيع بنجاح.${change ? ` الباقي لإرجاعه: ${change}.` : ''}`
    return `Vente bi bind nañu ko.${change ? ` Xaalis bi ñuy delloo: ${change}.` : ''}`
  }
  if (lang === 'ar') {
    if (operation === 'create_product') return 'تمت إضافة المنتج بنجاح.'
    if (operation === 'update_product') return 'تم تعديل المنتج بنجاح.'
    return 'تم تأكيد الإجراء وتنفيذه بنجاح.'
  }
  if (operation === 'create_product') return 'Yokk nañu produit bi.'
  if (operation === 'update_product') return 'Soppi nañu produit bi.'
  return 'Dëggal nañu jëfandikoo bi te am na.'
}
