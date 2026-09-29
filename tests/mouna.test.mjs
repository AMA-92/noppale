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
import {
  getMounaErrorMessage,
  getMounaGreeting,
  getMounaProgressMessage,
} from '../src/utils/mouna-ui.mjs'
import { getProductIntakeNextStep } from '../supabase/functions/mouna/product-intake.mjs'
import { nextSaleIntakeQuestion } from '../supabase/functions/mouna/sale-intake.mjs'
import { createMounaProviders } from '../supabase/functions/mouna/provider-config.mjs'

const saleTools = ['list_customers', 'list_products', 'list_sales', 'create_sale', 'record_sale_payment']

test('GLM est le cerveau principal, CodeCraft le second, et GLM garde son URL /v4', () => {
  const values = {
    GLM_API_KEY: 'test-glm-key',
    GLM_BASE_URL: 'https://api.z.ai/api/paas/v4',
    GLM_MODEL: 'glm-5.3-flash',
    CODECRAFT_API_KEY: 'test-codecraft-key',
  }
  const providers = createMounaProviders((name) => values[name])

  assert.deepEqual(providers.map(({ name }) => name), ['GLM', 'CodeCraft'])
  assert.equal(providers[0].baseUrl, 'https://api.z.ai/api/paas/v4')
  assert.equal(providers[0].model, 'glm-5.3-flash')
  assert.equal(providers[1].model, 'claude-sonnet-5')
})

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

test('les formulations simples de modification produit et les réponses après clarification sont routées', () => {
  assert.deepEqual(selectMounaToolNames('Je veux modifier un produit.', []), ['list_products', 'update_product'])
  assert.deepEqual(selectMounaToolNames('Sucre', [], { operationState: ['list_products', 'delete_product'] }), ['list_products', 'delete_product'])
  assert.deepEqual(selectMounaToolNames('Affiche le catalogue des produits.', []), ['list_products'])
  assert.deepEqual(selectMounaToolNames('Ajoute 5 au stock du produit Sucre.', []), ['list_products', 'adjust_stock'])
  assert.deepEqual(selectMounaToolNames('raconte-moi une blague', [{ role: 'user', content: 'Supprime un produit' }]), [])
})

test('la saisie produit conserve les champs connus et reprend sur une réponse courte', () => {
  const state = { name: 'Sucre', buying_price: 100 }
  assert.deepEqual(getProductIntakeNextStep(state), {
    kind: 'question',
    field: 'selling_price',
    question: 'Quel est son prix de vente ?',
  })
  assert.deepEqual(getProductIntakeNextStep({ name: 'Sucre', buying_price: 100, selling_price: 300, stock: 20 }), {
    kind: 'question',
    field: 'min_stock',
    question: 'Quel est son seuil de stock minimal ?',
  })
  assert.deepEqual(getProductIntakeNextStep({ name: 'Sucre', buying_price: 100, selling_price: 300, stock: 20, min_stock: 2 }), { kind: 'ready' })
  assert.deepEqual(makeMounaRequestBody({ message: '300 FCFA', productState: state }).product_state, state)
  assert.deepEqual(selectMounaToolNames('300 FCFA', [], { hasProductState: true }), ['create_product'])
})

test('une suppression reste routée vers les produits même après la question du nom', () => {
  const operationState = ['list_products', 'delete_product']
  assert.deepEqual(selectMounaToolNames('Sucre', [], { operationState }), operationState)
})

test('le panier terminé annonce son total puis demande le mode de paiement', () => {
  const question = nextSaleIntakeQuestion({
    customer_name: 'Awa',
    items: [{ product_name: 'Sucre', quantity: 2 }],
    items_complete: true,
    total: 6000,
    currency_code: 'FCFA',
  })
  assert.match(question, /6 000/u)
  assert.match(question, /Quel mode de paiement/u)
  assert.match(question, /Wave.*Orange Money.*Mobile Money.*carte bancaire.*crédit/u)
  assert.match(localizeMounaReply('ar', question), /إجمالي.*Wave/u)
  assert.match(localizeMounaReply('wo', question), /Total bi.*Orange Money/u)
  assert.equal(nextSaleIntakeQuestion({ customer_name: 'Awa', items: [{ product_name: 'Sucre', quantity: 2 }], items_complete: false }), 'Quel autre produit voulez-vous ajouter ?')
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

test('la confirmation française récapitule clairement la création, la modification et la suppression', () => {
  assert.match(localizePendingConfirmation('fr', { summary: 'Créer le produit « Sucre » — prix de vente 300, prix d’achat 100, stock initial 20, alerte à 2.' }), /Confirmez-vous l’ajout/u)
  assert.match(localizePendingConfirmation('fr', { summary: 'Modifier le produit « Sucre » (prix de vente : 400 FCFA).' }), /Confirmez-vous la modification/u)
  assert.match(localizePendingConfirmation('fr', { summary: 'Supprimer le produit « Sucre » (stock actuel : 20).' }), /Confirmez-vous la suppression/u)
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
  assert.deepEqual(makeMounaRequestBody({ message: 'Sucre', operationState: { tools: ['list_products', 'delete_product'] } }).operation_state.tools, ['list_products', 'delete_product'])
  assert.match(body.request_id, /^[0-9a-f-]{36}$/i)
  assert.equal(Object.hasOwn(makeMounaRequestBody({ message: 'Bonjour' }), 'sale_state'), false)
})

test('les salutations personnalisées et prises en charge sont localisées', () => {
  assert.equal(getMounaGreeting('fr', 'Awa'), 'Bonjour, Awa, je suis Mouna. Que puis-je faire pour vous ?')
  assert.match(getMounaGreeting('ar', 'Awa'), /Awa/u)
  assert.match(getMounaGreeting('wo', 'Awa'), /Awa/u)
  assert.match(getMounaProgressMessage('ar'), /أتحقق/u)
  assert.match(getMounaProgressMessage('wo'), /seet/u)
})

test('une erreur de fournisseur montre le diagnostic non sensible au lieu du message générique', () => {
  const error = {
    status: 503,
    message: 'Mouna est temporairement indisponible : aucun fournisseur IA n’a accepté la requête (CodeCraft: erreur réseau, Gemini: 400).',
  }
  const result = getMounaErrorMessage('fr', error)
  assert.match(result, /CodeCraft/u)
  assert.match(result, /Gemini: 400/u)
  assert.match(getMounaErrorMessage('ar', { status: 401 }), /سجّل الدخول/u)
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
