import React, { useEffect, useRef, useState } from 'react'
import { Check, Mic, X } from 'lucide-react'
import { supabase } from '../supabase/config'
import { appStorage, appCache } from '../utils/storage'
import { getProductSellingPrice } from '../utils/helpers'
import { useI18n } from '../hooks/useI18n.jsx'

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

const initial = { flow: '', step: '', data: {} }

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim()

const numberWords = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, cent: 100
}

const parseNumber = (value) => {
  const text = normalize(value).replace(/-/g, ' ')
  if (!text) return 0
  const digits = text.match(/\d[\d .]*/)?.[0]
  if (digits) return Number(digits.replace(/[ .]/g, '')) || 0
  let total = 0; let current = 0
  text.split(' ').forEach((token) => {
    if (/^\d+$/.test(token)) current += Number(token)
    else if (numberWords[token] !== undefined) current += numberWords[token]
    else if (token === 'mille') { total += (current || 1) * 1000; current = 0 }
    else if (token === 'million' || token === 'millions') { total += (current || 1) * 1000000; current = 0 }
  })
  return total + current
}

const isYes = (text) => /^(oui|oui c est bon|confirme|confirmer|valide|valider|d accord|exact|yes|waaw|waaw degg)$/i.test(normalize(text))
const isNo = (text) => /^(non|annule|annuler|recommence|recommencer|pas du tout|deedeet|deedeet)$/i.test(normalize(text))
const isGreeting = (text) => {
  const value = normalize(text)
  return /\b(bonjour|bonsoir|salut|coucou|hello|bon matin|nanga def|jamm rekk|salaam aleekum)\b/i.test(value) || /[\u0600-\u06ff]/.test(text) && /(مرحبا|اهلا|أهلا|السلام عليكم|سلام)/.test(text)
}
const isAddProductCommand = (text) => {
  const value = normalize(text)
  return /\b(ajouter|ajoute|ajout|acheter|achete|achat|creer|cree|cr[eé]ation|nouveau|nouvelle)\b.*\b(produit|article|marchandise)\b/.test(value) || /\b(produit|article|marchandise)\b.*\b(ajouter|ajoute|ajout|acheter|achete|achat|creer|cree|cr[eé]ation)\b/.test(value)
}
const isUpdateProductCommand = (text) => {
  const value = normalize(text)
  return /\b(mettre a jour|mise a jour|modifier|modifie|actualiser|actualise|changer|change|augmenter|augmente|diminuer|diminue)\b/.test(value) && /\b(produit|article|stock|quantite|prix)\b/.test(value)
}
const today = (value) => { const date = new Date(value); const now = new Date(); return date.toDateString() === now.toDateString() }
const moneyDefault = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`

function VoiceSaleAssistant({ products: suppliedProducts = [], sales: suppliedSales = [], expenses: suppliedExpenses = [], formatCurrency, onApply, onConfirm, onProductCreate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [products, setProducts] = useState(suppliedProducts)
  const [sales, setSales] = useState(suppliedSales)
  const [expenses, setExpenses] = useState(suppliedExpenses)
  const { currency, formatCurrency: contextFormatCurrency } = useI18n()
  const stateRef = useRef(initial)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const speechSessionRef = useRef(0)
  const conversationRef = useRef([])
  const languageRef = useRef('fr-FR')
  const keepListeningRef = useRef(false)
  const processingRef = useRef(false)
  const restartTimerRef = useRef(null)
  const money = formatCurrency || contextFormatCurrency || moneyDefault
  const detectLanguage = (text) => {
    const value = normalize(text)
    if (/\b(hello|hi|good morning|good afternoon|how are you|how much|today|sold|expense|profit|stock)\b/.test(value)) return 'en-US'
    if (/\b(ca va|ça va|nanga def|naa nga def|jamm|dama|yow|waaw|deedeet|ndank|xam nga)\b/.test(value)) return 'wo-SN'
    if (/[\u0600-\u06ff]/.test(text)) return 'ar-SA'
    return 'fr-FR'
  }

  const languageLabel = (code) => code.startsWith('en') ? 'anglais' : code.startsWith('wo') ? 'wolof' : code.startsWith('ar') ? 'arabe' : 'français'

  const spokenMoney = (value) => {
    const labels = { FCFA: 'francs CFA', EUR: 'euros', USD: 'dollars', GBP: 'livres sterling', CHF: 'francs suisses', XOF: 'francs CFA' }
    const label = labels[currency] || currency || 'francs CFA'
    return `${Number(value || 0).toLocaleString('fr-FR')} ${label}`
  }

  useEffect(() => { setProducts(suppliedProducts); setSales(suppliedSales); setExpenses(suppliedExpenses) }, [suppliedProducts, suppliedSales, suppliedExpenses])
  useEffect(() => () => { keepListeningRef.current = false; window.clearTimeout(restartTimerRef.current); recognitionRef.current?.stop(); audioRef.current?.pause(); window.speechSynthesis?.cancel() }, [])

  const refreshData = async () => {
    const [nextProducts, nextSales, nextExpenses] = await Promise.all([appStorage.getProducts(), appStorage.getSales(), appStorage.getExpenses()])
    setProducts(nextProducts); setSales(nextSales); setExpenses(nextExpenses)
    return { products: nextProducts, sales: nextSales, expenses: nextExpenses }
  }

  const speak = async (text, listenAfter = false) => {
    if (!text) return
    const session = speechSessionRef.current
    window.speechSynthesis?.cancel(); audioRef.current?.pause()
    // Écoute immédiate : l’utilisateur peut couper la voix de l’assistant et parler sans attendre.
    if (listenAfter) { keepListeningRef.current = true; window.setTimeout(() => { if (speechSessionRef.current === session) listenOnce() }, 80) }
    try {
      const { data, error: ttsError } = await supabase.functions.invoke('tts', { body: { text, language: languageRef.current } })
      if (!ttsError && data?.audio_base64 && speechSessionRef.current === session) {
        const audio = new Audio(`data:${data.mime_type || 'audio/wav'};base64,${data.audio_base64}`)
        audioRef.current = audio; audio.onended = () => { if (keepListeningRef.current) listenOnce() }; await audio.play(); return
      }
    } catch (ttsError) { console.warn('TTS indisponible, voix navigateur utilisée', ttsError) }
    if (!('speechSynthesis' in window) || speechSessionRef.current !== session) return
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = languageRef.current; utterance.rate = 0.94
    const voices = window.speechSynthesis.getVoices()
    const languagePrefix = languageRef.current.toLowerCase().split('-')[0]
    utterance.voice = voices.find((voice) => voice.lang?.toLowerCase().startsWith(languagePrefix)) || voices.find((voice) => voice.lang?.toLowerCase().startsWith('fr')) || null
    utterance.onend = () => { if (keepListeningRef.current) listenOnce() }
    window.speechSynthesis.speak(utterance)
  }

  const sayAndListen = (text, step, data = stateRef.current.data) => {
    stateRef.current = { ...stateRef.current, step, data }; setPhase(step); setStatus(text); speak(text, true)
  }

  const reset = () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); conversationRef.current = []; stateRef.current = initial; setPhase('idle'); setStatus(''); setError('') }
  const close = () => { speechSessionRef.current += 1; keepListeningRef.current = false; processingRef.current = false; window.clearTimeout(restartTimerRef.current); recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); audioRef.current?.pause(); audioRef.current = null; setIsOpen(false); reset() }

  function listenOnce() {
    if (!SpeechRecognition) { setError('La reconnaissance vocale nécessite Chrome ou Edge.'); return }
    if (!keepListeningRef.current || recognitionRef.current || processingRef.current) return
    setError(''); setPhase(stateRef.current.step || 'command')
    const recognition = new SpeechRecognition(); recognition.lang = languageRef.current === 'wo-SN' ? 'fr-FR' : languageRef.current; recognition.continuous = true; recognition.interimResults = false; recognition.maxAlternatives = 3
    recognition.onstart = () => setPhase('listening')
    recognition.onresult = (event) => { const result = event.results[event.results.length - 1]; const answer = result?.[0]?.transcript?.trim(); if (answer) { window.speechSynthesis?.cancel(); audioRef.current?.pause(); processingRef.current = true; recognition.stop(); handleAnswer(answer).finally(() => { processingRef.current = false }) } }
    recognition.onerror = (event) => { if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { keepListeningRef.current = false; setError('Autorisez le microphone dans votre navigateur.') } else if (event.error === 'audio-capture') { setError('Aucun microphone n’est détecté. Branchez ou autorisez un microphone, puis réessayez.') } else if (event.error !== 'aborted' && event.error !== 'no-speech') setError(`Erreur de reconnaissance : ${event.error}`); setPhase(stateRef.current.step || 'command') }
    recognition.onend = () => { recognitionRef.current = null; setPhase((current) => current === 'listening' ? (stateRef.current.step || 'command') : current); if (keepListeningRef.current && !processingRef.current) { window.clearTimeout(restartTimerRef.current); restartTimerRef.current = window.setTimeout(() => listenOnce(), 180) } }
    recognitionRef.current = recognition
    try { recognition.start() } catch (error) { recognitionRef.current = null; if (keepListeningRef.current) restartTimerRef.current = window.setTimeout(() => listenOnce(), 250) }
  }

  const findProduct = (answer, list = products) => {
    const text = normalize(answer)
    return list.find((product) => text === normalize(product.name)) || list.find((product) => text.includes(normalize(product.name)) || normalize(product.name).includes(text))
  }

  const query = async (answer) => {
    const data = await refreshData(); const text = normalize(answer); const salesToday = data.sales.filter((sale) => today(sale.createdAt || sale.created_at)); const expensesToday = data.expenses.filter((expense) => today(expense.date || expense.createdAt || expense.created_at))
    if (/rupture|en rupture|produit manque|stock zero/.test(text)) { const count = data.products.filter((p) => Number(p.stock || 0) === 0).length; return `Il y a ${count} produit${count > 1 ? 's' : ''} en rupture de stock.` }
    if (/depense|depenses|sorti aujourd hui|charges/.test(text)) { const total = expensesToday.reduce((sum, item) => sum + Number(item.amount || 0), 0); return `Vous avez réalisé ${spokenMoney(total)} de dépenses aujourd’hui.` }
    if (/benefice|benefices|profit|gagne aujourd hui|marge/.test(text)) {
      const revenue = salesToday.reduce((sum, sale) => sum + Number(sale.total || 0), 0); const cost = salesToday.reduce((sum, sale) => sum + (sale.items || []).reduce((s, item) => { const p = data.products.find((product) => product.id === item.productId); return s + Number(item.quantity || 0) * Number(p?.buying_price || 0) }, 0), 0); const expensesTotal = expensesToday.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      return `Votre bénéfice estimé aujourd’hui est de ${money(revenue - cost - expensesTotal)} : chiffre d’affaires ${spokenMoney(revenue)}, coût des produits ${spokenMoney(cost)} et dépenses ${spokenMoney(expensesTotal)}.`
    }
    if (/dette|dettes|doit|credit|cr[eé]dit/.test(text)) { const total = data.sales.filter((sale) => (sale.paymentMethod || sale.payment_method) === 'credit').reduce((sum, sale) => sum + Math.max(0, Number(sale.remainingAmount ?? sale.remaining_amount ?? (sale.total - (sale.paidAmount || sale.paid_amount || 0)))), 0); return `Le montant total des dettes en cours s’élève à ${spokenMoney(total)}.` }
    if (/vendu|ventes|chiffre d affaires|recette|recettes|vente aujourd hui/.test(text)) { const total = salesToday.reduce((sum, sale) => sum + Number(sale.total || 0), 0); return `Vous avez vendu ${spokenMoney(total)} aujourd’hui, en ${salesToday.length} vente${salesToday.length > 1 ? 's' : ''}.` }
    return null
  }

  const startFlow = (flow) => {
    stateRef.current = { flow, step: '', data: {} }
    if (flow === 'sale') return sayAndListen('Très bien. Quel produit voulez-vous vendre ?', 'saleProduct')
    if (flow === 'expense') return sayAndListen('D’accord. Quelle est la description de la dépense ?', 'expenseDescription')
    if (flow === 'addProduct') return sayAndListen('Quel est le nom du nouveau produit ?', 'productName')
    if (flow === 'updateProduct') return sayAndListen('Quel produit voulez-vous mettre à jour ?', 'updateProductName')
  }

  const confirmAction = (message, data) => { stateRef.current = { ...stateRef.current, step: 'confirm', data }; setPhase('confirm'); setStatus(message); speak(message, true) }

  const execute = async () => {
    const { flow, data } = stateRef.current
    if (flow === 'expense') { await appStorage.addExpense({ description: data.description, amount: parseNumber(data.amount), category: data.category || 'Générale', date: new Date().toISOString().split('T')[0], notes: 'Enregistrée par assistant vocal' }); await refreshData(); setPhase('done'); setStatus('La dépense a été enregistrée avec succès.'); speak('La dépense a été enregistrée avec succès.'); return }
    if (flow === 'addProduct') { const payload = { name: data.name, sellingPrice: parseNumber(data.sellingPrice), buyingPrice: parseNumber(data.buyingPrice), stock: parseNumber(data.stock), minStock: parseNumber(data.minStock), category: data.category || '', barcode: '', description: 'Ajouté par assistant vocal', image: '' }; if (onProductCreate) await onProductCreate(payload); else await appStorage.addProduct(payload); await refreshData(); setPhase('done'); setStatus(`Le produit ${data.name} a été ajouté avec succès.`); speak(`Le produit ${data.name} a été ajouté avec succès.`); return }
    if (flow === 'updateProduct') { const product = findProduct(data.productName); if (!product) throw new Error('Je ne trouve pas ce produit dans votre catalogue.'); const updates = { name: product.name, category: product.category || '', stock: data.field === 'stock' ? parseNumber(data.value) : product.stock, minStock: product.min_stock || 0, barcode: product.barcode || '', description: product.description || '', image: product.image || '' }; if (data.field === 'sellingPrice') updates.sellingPrice = parseNumber(data.value); if (data.field === 'buyingPrice') updates.buyingPrice = parseNumber(data.value); await appStorage.updateProduct(product.id, updates); await refreshData(); setPhase('done'); setStatus(`Le produit ${product.name} a été mis à jour.`); speak(`Le produit ${product.name} a été mis à jour.`); return }
    if (flow === 'sale') { const product = findProduct(data.product); if (!product) throw new Error('Je ne trouve pas ce produit dans votre catalogue.'); const quantity = parseNumber(data.quantity) || 1; const unitPrice = getProductSellingPrice(product); const sale = { customerName: data.customer || 'Client comptant', customerPhone: '', items: [{ productId: product.id, productName: product.name, quantity, unitPrice, totalPrice: quantity * unitPrice }], total: quantity * unitPrice, paymentMethod: data.paymentMethod || 'especes', initialPayment: data.paymentMethod === 'credit' ? parseNumber(data.amount) : 0, notes: 'Enregistrée par assistant vocal' }; if (onConfirm) await onConfirm(sale); else await appStorage.addSale(sale); await refreshData(); setPhase('done'); setStatus(`La vente de ${quantity} ${product.name} a été enregistrée.`); speak(`La vente de ${quantity} ${product.name} a été enregistrée.`) }
  }

  const askAssistant = async (answer) => {
    const { data: { session } = {} } = await supabase.auth.getSession()
    if (!session) throw new Error('Veuillez vous connecter à Noppalé avant d’utiliser l’assistant vocal.')
    const messages = [...conversationRef.current, { role: 'user', content: answer }]
    const { data, error } = await supabase.functions.invoke('assistant', { body: { messages, currency } })
    if (error) throw new Error(data?.error || error.message || 'Erreur de connexion avec l’assistant IA.')
    if (!data?.text) throw new Error('Réponse vide de l’assistant IA.')
    conversationRef.current = [...messages, { role: 'assistant', content: data.text }].slice(-12)
    if (data.language) languageRef.current = data.language === 'anglais' ? 'en-US' : data.language === 'wolof' ? 'wo-SN' : data.language === 'arabe' ? 'ar-SA' : 'fr-FR'
    return data.text
  }

  const handleCommand = async (answer) => {
    const text = normalize(answer)
    try {
      if (isAddProductCommand(text)) return startFlow('addProduct')
      if (isUpdateProductCommand(text)) return startFlow('updateProduct')
      if (/\b(vente|vendre|encaisser|transaction)\b/.test(text) && /\b(veux|veut|fais|faire|enregistre|enregistrer|effectue|effectuer|realise|realiser|nouvelle|une)\b/.test(text)) return startFlow('sale')
      if (/\b(depense|depenses|charge|charges)\b/.test(text) && /\b(veux|veut|fais|faire|enregistre|enregistrer|effectue|effectuer|realise|realiser|ajoute|ajouter|une)\b/.test(text)) return startFlow('expense')
      let result = null
      try { result = await query(answer) } catch (queryError) { console.warn('Lecture locale indisponible, relais vers l’assistant IA', queryError) }
      if (result) { stateRef.current = { flow: 'query', step: 'command', data: {} }; setPhase('command'); setStatus(result); speak(result, true); return }
      const response = await askAssistant(answer)
      stateRef.current = { flow: 'query', step: 'command', data: {} }; setPhase('command'); setStatus(response); speak(response, true)
    } catch (e) { const message = e.message || 'Une erreur est survenue.'; setError(message); setPhase('command'); speak(message) }
  }

  const handleAnswer = async (answer) => {
    setError(''); const { flow, step, data } = stateRef.current
    if (flow === 'greeting' && step === 'greeting') {
      if (isGreeting(answer)) {
        languageRef.current = detectLanguage(answer)
        const responses = { 'en-US': 'Hello, how can I help you today?', 'wo-SN': 'Nanga def ? Lan laa mën defal la ?', 'ar-SA': 'مرحباً، كيف يمكنني مساعدتك؟', 'fr-FR': 'Bonjour, que puis-je faire pour vous ?' }
        const response = responses[languageRef.current] || responses['fr-FR']
        stateRef.current = { flow: '', step: 'command', data: {} }; setPhase('command'); setStatus(response); speak(response, true)
      } else {
        const response = 'Je vous écoute. Dites simplement bonjour pour commencer.'
        setStatus(response); speak(response, true)
      }
      return
    }
    if (!flow || step === 'command' || phase === 'idle') return handleCommand(answer)
    if (step === 'confirm') { if (isYes(answer)) { try { await execute() } catch (e) { setError(e.message); setPhase('command'); speak(e.message) } } else if (isNo(answer)) { reset(); setStatus('Opération annulée.'); speak('Opération annulée.') } else speak('Dites oui pour confirmer ou non pour annuler.', true); return }
    if (flow === 'sale') {
      if (step === 'saleProduct') return sayAndListen('Combien d’unités voulez-vous vendre ?', 'saleQuantity', { ...data, product: answer })
      if (step === 'saleQuantity') return sayAndListen('Le paiement est-il en espèces, par Mobile Money, par carte ou à crédit ?', 'salePayment', { ...data, quantity: answer })
      if (step === 'salePayment') { const payment = /mobile|wave|orange money|free money/.test(normalize(answer)) ? 'mobile_money' : /carte/.test(normalize(answer)) ? 'carte_bancaire' : /credit|cr[eé]dit/.test(normalize(answer)) ? 'credit' : 'especes'; return sayAndListen('Quel est le nom du client ? Dites anonyme si nécessaire.', 'saleCustomer', { ...data, paymentMethod: payment }) }
      if (step === 'saleCustomer') { const product = findProduct(data.product); if (!product) { setError('Je ne trouve pas ce produit dans votre catalogue.'); return sayAndListen('Quel est le nom exact du produit ?', 'saleProduct', data) } const total = (parseNumber(data.quantity) || 1) * getProductSellingPrice(product); return confirmAction(`Je vais enregistrer une vente de ${data.quantity} ${product.name} pour ${spokenMoney(total)}, au nom de ${answer}. Est-ce correct ?`, { ...data, customer: /anonyme|aucun/.test(normalize(answer)) ? 'Client comptant' : answer }) }
    }
    if (flow === 'expense') {
      if (step === 'expenseDescription') return sayAndListen('Quel est le montant de la dépense ?', 'expenseAmount', { ...data, description: answer })
      if (step === 'expenseAmount') return sayAndListen('Quelle est la catégorie ? Dites générale si vous ne souhaitez pas préciser.', 'expenseCategory', { ...data, amount: answer })
      if (step === 'expenseCategory') return confirmAction(`Je vais enregistrer la dépense « ${data.description} » de ${spokenMoney(parseNumber(data.amount))}, catégorie ${answer}. Est-ce correct ?`, { ...data, category: /generale|aucune/.test(normalize(answer)) ? 'Générale' : answer })
    }
    if (flow === 'addProduct') {
      if (step === 'productName') return sayAndListen('Quel est le prix de vente ?', 'productSellingPrice', { ...data, name: answer })
      if (step === 'productSellingPrice') return sayAndListen('Quel est le prix d’achat ?', 'productBuyingPrice', { ...data, sellingPrice: answer })
      if (step === 'productBuyingPrice') return sayAndListen('Combien d’unités sont actuellement en stock ?', 'productStock', { ...data, buyingPrice: answer })
      if (step === 'productStock') return sayAndListen('Quel est le seuil minimum de stock ?', 'productMinStock', { ...data, stock: answer })
      if (step === 'productMinStock') return confirmAction(`Je vais ajouter le produit ${data.name}, vendu ${money(parseNumber(data.sellingPrice))}, acheté ${money(parseNumber(data.buyingPrice))}, avec ${data.stock} unités en stock. Est-ce correct ?`, { ...data, minStock: answer })
    }
    if (flow === 'updateProduct') {
      if (step === 'updateProductName') return sayAndListen('Que voulez-vous modifier : le stock, le prix de vente ou le prix d’achat ?', 'updateField', { ...data, productName: answer })
      if (step === 'updateField') { const field = /stock|quantite|quantité/.test(normalize(answer)) ? 'stock' : /vente/.test(normalize(answer)) ? 'sellingPrice' : 'buyingPrice'; return sayAndListen(field === 'stock' ? 'Quelle est la nouvelle quantité en stock ?' : 'Quel est le nouveau montant ?', 'updateValue', { ...data, field }) }
      if (step === 'updateValue') return confirmAction(`Je vais modifier ${data.field === 'stock' ? 'le stock' : 'le prix'} de ${data.productName} à ${answer}. Est-ce correct ?`, { ...data, value: answer })
    }
  }

  const chooseLanguage = async (code) => { languageRef.current = code; stateRef.current = { flow: 'greeting', step: 'greeting', data: {} }; setPhase('greeting'); setStatus(code === 'en-US' ? 'Say hello to begin.' : code === 'wo-SN' ? 'Dites bonjour pour commencer.' : code === 'ar-SA' ? 'قل مرحباً للبدء.' : 'Dites bonjour pour commencer.'); setError(''); window.setTimeout(() => listenOnce(), 80); try { await refreshData() } catch (e) { console.warn(e) } }
  const start = async () => { speechSessionRef.current += 1; setIsOpen(true); setPhase('language'); setStatus('Choisissez votre langue'); setError(''); try { await refreshData() } catch (e) { console.warn(e) } }

  if (isOpen && phase === 'language') return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#080912] px-5 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(91,33,182,.30),transparent_30%),radial-gradient(circle_at_12%_90%,rgba(14,165,233,.12),transparent_28%)]" /><div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-7 text-center shadow-2xl backdrop-blur-xl"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-950 shadow-xl"><Mic size={28} /></div><p className="mb-2 text-xs uppercase tracking-[.28em] text-indigo-300/75">Assistant Noppalé</p><h1 className="mb-7 text-2xl font-medium">Choisissez votre langue</h1><div className="grid gap-3"><button type="button" onClick={() => chooseLanguage('fr-FR')} className="rounded-2xl bg-white/10 px-5 py-4 text-left font-semibold transition hover:bg-white/20">Français<span className="ml-2 text-sm font-normal text-white/50">Bonjour</span></button><button type="button" onClick={() => chooseLanguage('wo-SN')} className="rounded-2xl bg-white/10 px-5 py-4 text-left font-semibold transition hover:bg-white/20">Wolof<span className="ml-2 text-sm font-normal text-white/50">Nanga def</span></button><button type="button" onClick={() => chooseLanguage('ar-SA')} className="rounded-2xl bg-white/10 px-5 py-4 text-left font-semibold transition hover:bg-white/20">العربية<span className="ml-2 text-sm font-normal text-white/50">مرحباً</span></button><button type="button" onClick={() => chooseLanguage('en-US')} className="rounded-2xl bg-white/10 px-5 py-4 text-left font-semibold transition hover:bg-white/20">English<span className="ml-2 text-sm font-normal text-white/50">Hello</span></button></div><button type="button" onClick={close} className="mt-6 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/10">Fermer</button></div></div>
  if (!isOpen) return <><style>{`@keyframes noppaleMoonFloat{0%,100%{transform:translateY(0) rotate(-8deg);box-shadow:0 0 18px rgba(125,211,252,.75),0 0 42px rgba(59,130,246,.45)}50%{transform:translateY(-5px) rotate(8deg);box-shadow:0 0 25px rgba(186,230,253,.95),0 0 58px rgba(37,99,235,.65)}} @keyframes noppaleStars{0%{transform:rotate(0deg) scale(1);opacity:.65}50%{transform:rotate(180deg) scale(1.08);opacity:1}100%{transform:rotate(360deg) scale(1);opacity:.65}}`}</style><button type="button" onClick={start} aria-label="Ouvrir l’assistance vocale" className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/50 bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-950 text-white shadow-2xl transition hover:scale-105"><span className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_28%_28%,white_0_1px,transparent_2px),radial-gradient(circle_at_70%_65%,#bae6fd_0_1px,transparent_2px),radial-gradient(circle_at_58%_18%,#e0f2fe_0_1px,transparent_2px)] bg-[length:19px_19px,23px_23px,29px_29px]" style={{animation:'noppaleStars 8s linear infinite'}} /><span className="relative h-9 w-9 rounded-full bg-gradient-to-br from-sky-50 via-sky-200 to-blue-500 shadow-inner" /></button></>

  return <div className="fixed inset-0 z-[100] overflow-hidden bg-[#080912] text-white"><style>{`@keyframes noppaleMoonFloat{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-8px) rotate(8deg)}} @keyframes noppaleStars{0%{transform:rotate(0deg) scale(1);opacity:.65}50%{transform:rotate(180deg) scale(1.12);opacity:1}100%{transform:rotate(360deg) scale(1);opacity:.65}}`}</style><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(91,33,182,.30),transparent_30%),radial-gradient(circle_at_12%_90%,rgba(14,165,233,.12),transparent_28%)]" /><div className="relative flex h-full flex-col"><header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500"><Mic size={18} /></div><div><p className="text-sm font-semibold">Assistant Noppalé</p><p className="text-[11px] text-white/45">Langue détectée automatiquement</p></div></div><button type="button" onClick={close} className="rounded-xl border border-white/10 p-2 text-white/65 hover:bg-white/10" aria-label="Fermer"><X size={19} /></button></header><main className="flex flex-1 flex-col items-center justify-center px-5 pb-32 pt-8"><div className="mb-8 text-center"><p className="mb-2 text-xs uppercase tracking-[.28em] text-indigo-300/75">{phase === 'listening' ? 'Je vous écoute' : phase === 'confirm' ? 'Confirmation requise' : 'Assistant vocal'}</p><h1 className="max-w-3xl text-2xl font-medium leading-tight text-white/95 sm:text-4xl">{status || 'Que souhaitez-vous faire ?'}</h1></div><div className="relative flex h-56 w-56 items-center justify-center"><div className={`absolute h-48 w-48 rounded-full bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-950 blur-3xl ${phase === 'listening' ? 'animate-pulse' : ''}`} /><div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-sky-200/50 bg-gradient-to-br from-sky-100 via-blue-500 to-indigo-950 shadow-[0_0_90px_rgba(56,189,248,.7)]" style={{animation:'noppaleMoonFloat 5s ease-in-out infinite'}}><span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_26%,white_0_1px,transparent_2px),radial-gradient(circle_at_72%_58%,#bae6fd_0_1px,transparent_2px),radial-gradient(circle_at_52%_80%,#e0f2fe_0_1px,transparent_2px)] bg-[length:23px_23px,31px_31px,37px_37px]" style={{animation:'noppaleStars 10s linear infinite'}} /><span className="relative h-28 w-28 rounded-full bg-gradient-to-br from-sky-50 via-sky-200 to-blue-500 shadow-inner"><Mic size={38} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-950/75" /></span></div></div>{error && <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}</main><div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/25 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl justify-end gap-2">{phase === 'confirm' && <><button type="button" onClick={() => handleAnswer('oui')} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold"><Check size={16} className="mr-2 inline" />Confirmer</button><button type="button" onClick={() => handleAnswer('non')} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold">Annuler</button></>}</div></div></div></div>
}

export default VoiceSaleAssistant
