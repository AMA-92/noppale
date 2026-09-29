export const MOUNA_DB_LIMITS = Object.freeze({
  maxInteger: 2_147_483_647,
  productName: 200,
  productCategory: 100,
  productBarcode: 50,
  customerName: 200,
  customerPhone: 20,
  customerEmail: 255,
})

export function isValidMounaDate(value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysPerMonth[month - 1]
}

export function formatMounaStockReply(language, result, query = '') {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null
  const lang = ['fr', 'ar', 'wo'].includes(language) ? language : 'fr'
  const requested = String(query || '').trim().slice(0, MOUNA_DB_LIMITS.productName) || 'ce produit'

  if (result.ambiguous && Array.isArray(result.products) && result.products.length) {
    const names = result.products.slice(0, 5).map((product) => `« ${String(product.name || '').slice(0, MOUNA_DB_LIMITS.productName)} »`).join(', ')
    if (lang === 'ar') return `توجد عدة منتجات متشابهة: ${names}. أيّها تقصد؟`
    if (lang === 'wo') return `Am na ay produit yu bokk tur: ${names}. Ban bi nga bëgg?`
    return `Plusieurs produits correspondent : ${names}. Lequel ?`
  }

  if (result.found === false) {
    const candidate = Array.isArray(result.candidates) ? String(result.candidates[0] || '').trim() : ''
    if (candidate) {
      if (lang === 'ar') return `لم أجد «${requested}». هل تقصد «${candidate}»؟`
      if (lang === 'wo') return `Gisuma «${requested}». Ndax «${candidate}» nga laaj?`
      return `Je ne trouve pas «${requested}». Voulez-vous dire «${candidate}» ?`
    }
    if (lang === 'ar') return `لم أجد «${requested}» في قائمة المنتجات.`
    if (lang === 'wo') return `Gisuma «${requested}» ci listu produits bi.`
    return `Je ne trouve pas «${requested}» dans le catalogue.`
  }

  if (typeof result.name === 'string' && Number.isFinite(Number(result.stock))) {
    const name = result.name.slice(0, MOUNA_DB_LIMITS.productName)
    const stock = Math.max(0, Math.trunc(Number(result.stock)))
    if (lang === 'ar') return `المتبقي من «${name}»: ${stock}.`
    if (lang === 'wo') return `Des na ${stock} ci «${name}».`
    return stock === 0
      ? `Il ne reste aucune unité de «${name}».`
      : `Il reste ${stock} ${stock === 1 ? 'unité' : 'unités'} de «${name}».`
  }

  return null
}
