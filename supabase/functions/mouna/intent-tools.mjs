const SALE_TOOLS = Object.freeze([
  'list_customers',
  'list_products',
  'list_sales',
  'create_sale',
  'record_sale_payment',
])

const normalizeLatin = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670]/gu, '')
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .toLowerCase()

export function selectMounaToolNames(message, history = [], { hasSaleState = false, hasProductState = false, operationState = [] } = {}) {
  const recent = ''
  const raw = `${String(message || '')} ${recent}`.normalize('NFKC').replace(/[\u064B-\u065F\u0670]/gu, '')
  const text = normalizeLatin(raw)

  const stockMutation = /\b(ajout(?:e|er|ez)?|augmente|diminue|retire|corrige)\b/.test(text)
    && /\b(?:au|dans le|du)\s+stock\b/.test(text)
  if (stockMutation) return ['list_products', 'adjust_stock']

  const stockQuestion = /\b(stock (?:de|du|d'|pour)|reste|restant|quantite|combien.*(sucre|produit|unite))\b/.test(text)
    || /(?:كم بقي|كم المتبقي|ما كمية|كمية المنتج|ما هو المخزون|كم وحدة متاحة)/u.test(raw)
  if (stockQuestion) return ['get_product_stock']

  if (/(chiffre d'affaires|chiffre affaire|recette|ventes? aujourd|ventes? du mois|tableau de bord|indicateurs)/.test(text)
    || /(?:إيرادات|المبيعات اليوم|لوحة التحكم)/u.test(raw)) return ['read_dashboard']
  if (/(rapport|bilan|periode|entre le)/.test(text)
    || /\bdu\s+\d{1,2}\b.*\bau\s+\d{1,2}\b/u.test(text)
    || /(?:تقرير|ملخص الفترة|من .* إلى)/u.test(raw)) return ['read_period_summary']

  const hasProduct = /\b(produit|produits|article|articles|marchandise|reference)\b/.test(text)
    || /(?:منتج|المنتج|المنتجات|سلعة|بضاعة)/u.test(raw)
  const updateAction = /\b(modif(?:ie|ier|ication)?|change(?:r)?|prix|met(?:tre)?|mise a jour|maj|soppi|soppiwaat|modifier|stock)\b/.test(text)
    || /(?:عدّل|عدل|غيّر|غير|تعديل|تحديث|سعر|ثمن|مخزون|تغيير)/u.test(raw)
  const createAction = /\b(ajout(?:e|er|ez)?|cree(?:r|z)?|enregistr(?:e|er)|rentr(?:e|er)|integr(?:e|er)|nouveau|nouvelle|yokk(?:al|el|e)?|jox)\b/.test(text)
    || /(?:أضف|اضف|أضيف|اضيف|إضافة|اضافة|أنشئ|انشئ|إنشاء|انشاء|جديد|جديدة)/u.test(raw)
  const deleteAction = /\b(supprim(?:e|er|ez)|effac(?:e|er)|delete)\b/.test(text)
    || /\b(enleve|retire)\b/.test(text)
    || /(?:احذف|حذف|إزالة|ازالة)/u.test(raw)
  const adjustStockAction = /\b(ajout(?:e|er)?|augmente|diminue|retire|ajuster|corrige)\b/.test(text)
    || /(?:زد|زِد|أنقص|انقص|عدّل المخزون|عدل المخزون)/u.test(raw)

  // “Prix de vente” is a product-price field, not a request to record a sale.
  const isPriceChange = hasProduct && updateAction
    && (/(prix|selling_price|buying_price)/.test(text) || /(?:سعر|ثمن)/u.test(raw))
  if (hasProduct && createAction) return ['create_product']
  if (hasProduct && isPriceChange) return ['list_products', 'update_product']
  if (hasProduct && updateAction && /\b(stock|inventaire)\b/.test(text)
    && !/\b(seuil|minimum|min_stock)\b/.test(text)) return ['list_products', 'adjust_stock']
  if (hasProduct && updateAction) return ['list_products', 'update_product']
  if (hasProduct && deleteAction) return ['list_products', 'delete_product']
  if (hasProduct && adjustStockAction) return ['list_products', 'adjust_stock']

  const explicitSale = /\b(vendre|vends?|vendu|panier|paiement|payer|encaisser|wave|orange money|mobile money|credit|especes|enregistrer (?:une )?vente|faire une vente|realiser une vente|nouvelle vente|vente pour|vente de)\b/.test(text)
    || /(?:أبيع|ابيع|بيع|بعت|البيع|سجّل البيع|سجل البيع|تسجيل البيع|أريد بيع|اريد بيع|جاay|jaay|jaayal|jaayee)/iu.test(raw)
  const pricePhrase = /\bprix de vente\b/.test(text) || /(?:سعر البيع|ثمن البيع)/u.test(raw)
  if (hasSaleState || (explicitSale && !(pricePhrase && hasProduct))) return [...SALE_TOOLS]

  if (/\b(client|clients)\b/.test(text) || /(?:عميل|العميل|زبون|زبائن)/u.test(raw)) {
    return ['list_customers', ...(createAction || updateAction || deleteAction
      ? ['create_customer', 'update_customer', 'delete_customer']
      : [])]
  }
  if (/\b(depense|depenses|frais|charge)\b/.test(text) || /(?:مصروف|مصاريف|نفقات)/u.test(raw)) {
    return ['list_expenses', ...(createAction || updateAction || deleteAction
      ? ['create_expense', 'update_expense', 'delete_expense']
      : [])]
  }
  if (/\b(boutique|magasin|coordonnees|adresse|telephone|email)\b/.test(text)
    || /(?:المتجر|المحل|العنوان|الهاتف|البريد الإلكتروني)/u.test(raw)) {
    return ['read_shop_settings', ...(updateAction ? ['update_shop_settings'] : [])]
  }
  if (/\b(preference|preferences|langue|devise|notification|theme)\b/.test(text)
    || /(?:التفضيلات|اللغة|العملة|الإشعارات|المظهر)/u.test(raw)) {
    return ['read_preferences', ...(updateAction ? ['update_preferences'] : [])]
  }
  if (hasProductState) return ['create_product']
  if (Array.isArray(operationState) && operationState.length) return operationState
  if (hasProduct) return ['list_products']
  return []
}
