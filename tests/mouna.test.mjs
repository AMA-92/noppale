import test from 'node:test'
import assert from 'node:assert/strict'
import { selectMounaToolNames } from '../supabase/functions/mouna/intent-tools.mjs'
import {
  localizeMounaReply,
  localizePendingConfirmation,
  localizeConfirmedActionReply,
} from '../supabase/functions/mouna/mouna-i18n.mjs'
import {
  classifyMounaConfirmation,
  getMounaPendingConfirmation,
  makeMounaConfirmationBody,
  makeMounaRequestBody,
} from '../src/utils/mounaConversation.mjs'

const saleTools = ['list_customers', 'list_products', 'list_sales', 'create_sale', 'record_sale_payment']

const scenarios = [
  ['fr', 'Ajoute le produit TEST Mouna Café, prix d’achat 1000, prix de vente 1500, stock 8, seuil 2.', ['create_product']],
  ['ar', 'أضف منتج TEST Mouna Café، سعر الشراء 1000، سعر البيع 1500، المخزون 8، والحد الأدنى 2.', ['create_product']],
  ['wo', 'Yokk produit TEST Mouna Café, prix achat 1000, prix vente 1500, stock 8, seuil 2.', ['create_product']],
  ['fr', 'Modifie le prix de vente du produit TEST Mouna Café à 1600.', ['list_products', 'update_product']],
  ['ar', 'غيّر سعر بيع المنتج TEST Mouna Café إلى 1600.', ['list_products', 'update_product']],
  ['wo', 'Soppi prix de vente produit TEST Mouna Café ba 1600.', ['list_products', 'update_product']],
  ['fr', 'Vends 2 unités du produit TEST Mouna Café au client TEST Client, paiement en espèces.', saleTools],
  ['ar', 'أريد بيع 2 من منتج TEST Mouna Café للعميل TEST Client نقدًا.', saleTools],
  ['wo', 'Jaay 2 produit TEST Mouna Café ci klient TEST Client, paiement espèces.', saleTools],
]

test('les neuf intentions de gestion sélectionnent les bons outils dans les trois langues', () => {
  for (const [language, message, expected] of scenarios) {
    const actual = selectMounaToolNames(message, [], { language })
    assert.deepEqual(actual, expected, `${language}: ${message}`)
  }
})

test('le langage de prix de vente reste une modification, pas une nouvelle vente', () => {
  assert.deepEqual(selectMounaToolNames('Modifie le prix de vente du produit TEST Mouna à 1600.'), ['list_products', 'update_product'])
})

test('un état de panier conserve les outils de vente après une question intermédiaire', () => {
  assert.deepEqual(selectMounaToolNames('Wave', [], { hasSaleState: true }), saleTools)
})

test('les questions directes de collecte produit sont localisées', () => {
  assert.equal(localizeMounaReply('ar', 'Quel est le nom du produit ?'), 'ما اسم المنتج؟')
  assert.equal(localizeMounaReply('wo', 'Quel est son prix de vente ?'), 'Ñaata lañu koy jaay?')
})

test('la confirmation d’ajout conserve les champs et valeurs du produit TEST', () => {
  const pending = { summary: 'Créer le produit « TEST Mouna Café » — prix de vente 1 500, prix d’achat 1 000, stock initial 8, alerte à 2.' }
  const arabic = localizePendingConfirmation('ar', pending)
  const wolof = localizePendingConfirmation('wo', pending)
  for (const text of [arabic, wolof]) {
    assert.match(text, /TEST Mouna Café/)
    assert.match(text, /1 500/)
    assert.match(text, /1 000/)
    assert.match(text, /stock|المخزون/u)
  }
})

test('la confirmation de modification et de vente affiche le détail et la question dans la langue choisie', () => {
  const update = localizePendingConfirmation('ar', { summary: 'Modifier le produit « TEST Mouna Café » (selling_price : 1 600).' })
  assert.match(update, /TEST Mouna Café/)
  assert.match(update, /1 600/)
  assert.match(update, /تؤكد/u)

  const sale = localizePendingConfirmation('wo', { summary: 'Créer la vente pour TEST Client. Récapitulatif : le client TEST Client a acheté 2 × TEST Mouna Café à 1 600; total 3 200; paiement espèces.' })
  assert.match(sale, /TEST Client/)
  assert.match(sale, /TEST Mouna Café/)
  assert.match(sale, /3 200/)
  assert.match(sale, /dëggal/u)
})

test('les réponses de confirmation produit/vente sont localisées après action', () => {
  assert.equal(localizeConfirmedActionReply('ar', 'create_product', ''), 'تمت إضافة المنتج بنجاح.')
  assert.equal(localizeConfirmedActionReply('wo', 'update_product', ''), 'Soppi nañu produit bi.')
  assert.match(localizeConfirmedActionReply('ar', 'create_sale', 'Vente enregistrée. Monnaie à rendre : 800.'), /800/u)
})

test('le frontend transporte le panier sans inventer d’état et limite l’historique', () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ role: 'user', content: String(index) }))
  const saleState = { customer_name: 'TEST Client', items: [{ product_name: 'TEST Mouna', quantity: 2 }] }
  const body = makeMounaRequestBody({ message: 'Wave', history, saleState })
  assert.equal(body.message, 'Wave')
  assert.equal(body.history.length, 10)
  assert.equal(body.history[0].content, '2')
  assert.deepEqual(body.sale_state, saleState)
  assert.equal(Object.hasOwn(makeMounaRequestBody({ message: 'Bonjour' }), 'sale_state'), false)
})

test('une confirmation serveur utilise l’UUID de l’action, pas un nouveau message de vente', () => {
  const id = '2c2f8fe2-c1b7-4f78-bd2a-123456789abc'
  assert.deepEqual(makeMounaConfirmationBody(id, true), { confirm_action_id: id })
  assert.deepEqual(makeMounaConfirmationBody(id, false), { cancel_action_id: id })
  assert.throws(() => makeMounaConfirmationBody('not-an-id'), /Identifiant de confirmation/)
  assert.deepEqual(getMounaPendingConfirmation({ pending_confirmation: { id, summary: 'TEST' } }), { id, summary: 'TEST' })
  assert.equal(getMounaPendingConfirmation({ pending_confirmation: { id: 'bad' } }), null)
})

test('les confirmations vocales sont comprises en français, arabe et wolof', () => {
  assert.equal(classifyMounaConfirmation('Oui, je confirme.', 'fr'), 'confirm')
  assert.equal(classifyMounaConfirmation('Non, annule.', 'fr'), 'cancel')
  assert.equal(classifyMounaConfirmation('نعم، أؤكد', 'ar'), 'confirm')
  assert.equal(classifyMounaConfirmation('لا، ألغِ', 'ar'), 'cancel')
  assert.equal(classifyMounaConfirmation('Waaw, dëggal.', 'wo'), 'confirm')
  assert.equal(classifyMounaConfirmation('Deedeet, nekkal.', 'wo'), 'cancel')
})
