import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, X, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../../supabase/config'
import { appStorage } from '../../utils/storage'
import { useUserPreferencesRealtime } from '../../hooks/useRealtime'

const MOUNA_LANGUAGES = {
  fr: { name: 'Français', speechLocale: 'fr-FR', greeting: 'Bonjour.' },
  ar: { name: 'العربية', speechLocale: 'ar-SA', greeting: 'مرحباً، كيف يمكنني مساعدتك؟' },
  wo: { name: 'Wolof', speechLocale: 'wo-SN', greeting: 'Naka nga def? Lan nga bëgg ma la dimbali?' }
}

const getGreeting = (language) => MOUNA_LANGUAGES[language]?.greeting || MOUNA_LANGUAGES.fr.greeting

const stripEmojiAndNoise = (text = '') => {
  return String(text)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[“”«»"'`]/g, ' ')
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/[*_#~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeMonetaryText = (text = '') => {
  let clean = String(text)

  clean = clean.replace(/\b(\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?)\s*(?:FCFA|XOF|CFA)\b/gi, (_, amount) => {
    const normalized = amount.replace(/\s+/g, '').replace(',', '.')
    return `${Number(normalized).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} francs CFA`
  })

  clean = clean.replace(/\b(\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?)\s*(?:€|EUR)\b/gi, (_, amount) => {
    const normalized = amount.replace(/\s+/g, '').replace(',', '.')
    return `${Number(normalized).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} euros`
  })

  clean = clean.replace(/\b(\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?)\s*(?:\$|USD)\b/gi, (_, amount) => {
    const normalized = amount.replace(/\s+/g, '').replace(',', '.')
    return `${Number(normalized).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} dollars`
  })

  return clean
}

const makeSpeechFriendlyText = (text = '') => {
  let clean = stripEmojiAndNoise(text)
  clean = normalizeMonetaryText(clean)

  clean = clean.replace(/\s*([;:])\s*/g, '. ')
  clean = clean.replace(/\s*[-–—]\s*/g, '. ')
  clean = clean.replace(/\s*\.\s*/g, '. ')
  clean = clean.replace(/\s*\?\s*/g, '. ')
  clean = clean.replace(/\s*!\s*/g, '. ')
  clean = clean.replace(/\s+,\s*/g, ', ')
  clean = clean.replace(/\b(\d+)\s+francs\s+CFA\b/gi, (_, value) => `${value} francs CFA`)
  clean = clean.replace(/\b(\d+)\s+euros\b/gi, (_, value) => `${value} euros`)
  clean = clean.replace(/\b(\d+)\s+dollars\b/gi, (_, value) => `${value} dollars`)
  clean = clean.replace(/\s+/g, ' ').trim()

  if (!clean) return 'Bonjour.'
  return clean
}

const isGreeting = (text = '') => /^(bonjour|salut|bonsoir|hello|hi|salam|salaam|assalamu(?:\s+alaykum)?|naka nga def|nanga def|السلام عليكم|مرحبا|مرحباً)$/i.test(String(text).trim())

const getGuidedFlow = (text = '') => {
  const value = String(text).toLowerCase().trim()
  if (!value) return null

  if (/ajout.*produit|cr[eé]e.*produit|cr[ée]er.*produit|nouveau produit|ajouter.*produit/i.test(value)) {
    return {
      type: 'add_product',
      questions: [
        'Quel est le nom du produit ?',
        'Dans quelle catégorie va-t-il ?',
        'Quel est le stock initial ?',
        'Quel est le prix d’achat ?',
        'Quel est le prix de vente ?',
        'Quel est le stock minimum ?',
      ],
      keys: ['name', 'category', 'stock', 'buying_price', 'selling_price', 'min_stock']
    }
  }

  if (/ajout.*d[eé]pense|ajoute.*d[eé]pense|nouvelle d[eé]pense|d[eé]pense/i.test(value)) {
    return {
      type: 'add_expense',
      questions: [
        'Quelle dépense veux-tu enregistrer ?',
        'Quel est le montant ?',
      ],
      keys: ['name', 'amount']
    }
  }

  if (/modif.*produit|modifier.*produit|change.*prix.*produit|met.*prix.*produit|maj.*produit|mise.*jour.*produit/i.test(value)) {
    return {
      type: 'update_product',
      questions: [
        'Quel est le produit à modifier ?',
        'Quel est le nouveau prix de vente ?',
      ],
      keys: ['name', 'selling_price']
    }
  }

  if (/ajout.*vente|ajoute.*vente|enregistre.*vente|vente.*produit|vend/i.test(value)) {
    return {
      type: 'add_sale',
      questions: [
        'Quel produit veux-tu vendre ?',
        'Quelle quantité ?',
      ],
      keys: ['name', 'quantity']
    }
  }

  return null
}

const parseFlowValue = (key, text) => {
  const normalized = String(text).trim()
  if (!normalized) return null

  if (key === 'stock' || key === 'buying_price' || key === 'selling_price' || key === 'min_stock' || key === 'amount' || key === 'quantity') {
    const match = normalized.match(/\d+(?:[.,]\d+)?/)
    return match ? Number(match[0].replace(',', '.')) : null
  }

  if (key === 'name' || key === 'category') {
    return normalized.replace(/^.*?(?:est|c'est|c est|est le|est la|le|la)\s+/i, '').trim()
  }

  return normalized
}

const buildFlowSentence = (type, values) => {
  if (type === 'add_product') {
    const name = values.name || 'produit'
    const category = values.category || 'général'
    const stock = values.stock || 0
    const buying = values.buying_price || 0
    const selling = values.selling_price || 0
    const minStock = values.min_stock || 0
    return `crée le produit ${name} dans la catégorie ${category} avec un stock initial de ${stock}, un prix d'achat de ${buying}, un prix de vente de ${selling} et un stock minimum de ${minStock}`
  }

  if (type === 'add_expense') {
    return `ajoute une dépense ${values.name || 'générale'} de ${values.amount || 0}`
  }

  if (type === 'update_product') {
    return `modifie le produit ${values.name || 'produit'} avec un prix de vente de ${values.selling_price || 0}`
  }

  if (type === 'add_sale') {
    return `vend ${values.quantity || 0} ${values.name || 'produit'}`
  }

  return 'aide-moi sur cette demande'
}

function MounaAssistant() {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [mounaLanguage, setMounaLanguage] = useState('fr')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour.' }
  ])
  const [busy, setBusy] = useState(false)
  const [inputMode, setInputMode] = useState('text')
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const guidedFlowRef = useRef(null)

  const refreshMounaLanguage = useCallback(async () => {
    try {
      const preferences = await appStorage.getUserPreferences()
      const nextLanguage = ['fr', 'ar', 'wo'].includes(preferences?.mouna_language)
        ? preferences.mouna_language
        : 'fr'
      setMounaLanguage(nextLanguage)
      setMessages((current) => current.length === 1 && current[0]?.role === 'assistant'
        ? [{ role: 'assistant', content: getGreeting(nextLanguage) }]
        : current)
      if (nextLanguage !== 'fr') guidedFlowRef.current = null
    } catch (error) {
      console.error('Erreur de chargement de la langue de Mouna:', error)
    }
  }, [])

  useEffect(() => {
    void refreshMounaLanguage()
  }, [refreshMounaLanguage])

  useUserPreferencesRealtime(() => {
    void refreshMounaLanguage()
  })

  const stopSpeech = () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel?.()
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
  }

  const speakInBrowser = (text, locale) => {
    if (!('speechSynthesis' in window)) {
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale
    utterance.rate = 0.86
    utterance.pitch = 1.08
    utterance.volume = 1
    const localePrefix = locale.split('-')[0].toLowerCase()
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang?.toLowerCase() === locale.toLowerCase())
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith(localePrefix))
      || null
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const speak = async (text) => {
    if (!open || typeof window === 'undefined') return
    const raw = String(text || '').trim()
    if (!raw) return

    stopSpeech()
    const locale = MOUNA_LANGUAGES[mounaLanguage]?.speechLocale || 'fr-FR'
    const shortText = raw.split(/(?<=[.!?؟])\s+/).find(Boolean) || raw
    const spokenText = (mounaLanguage === 'fr' ? makeSpeechFriendlyText(shortText) : stripEmojiAndNoise(shortText)).slice(0, 600)
    if (!spokenText) {
      setSpeaking(false)
      return
    }

    setSpeaking(true)
    try {
      const { data, error } = await supabase.functions.invoke('tts', {
        body: { text: spokenText, language: locale }
      })
      if (!error && data?.audio_base64) {
        const audio = new Audio(`data:${data.mime_type || 'audio/wav'};base64,${data.audio_base64}`)
        audioRef.current = audio
        audio.onended = () => {
          audioRef.current = null
          setSpeaking(false)
        }
        audio.onerror = () => {
          audioRef.current = null
          speakInBrowser(spokenText, locale)
        }
        try {
          await audio.play()
          return
        } catch {
          audioRef.current = null
        }
      }
    } catch (error) {
      console.warn('Synthèse vocale serveur indisponible; utilisation de la voix du navigateur.')
    }

    speakInBrowser(spokenText, locale)
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      const unavailableMessages = {
        fr: "La reconnaissance vocale n'est pas disponible dans ce navigateur. Utilise Chrome/Android ou le champ texte.",
        ar: 'التعرّف على الصوت غير متاح في هذا المتصفح. استخدم متصفحاً آخر أو اكتب رسالتك.',
        wo: 'Jàngat ci mikro bi amul ci navigateur bii. Jëfandikool beneen navigateur walla bind sa bataaxal.'
      }
      setMessages((m) => [...m, { role: 'assistant', content: unavailableMessages[mounaLanguage] || unavailableMessages.fr }])
      return
    }

    if (listening) {
      recognitionRef.current?.stop?.()
      setListening(false)
      stopSpeech()
      return
    }

    stopSpeech()
    if (recognitionRef.current) recognitionRef.current.abort()
    const recognition = new SpeechRecognition()
    recognition.lang = MOUNA_LANGUAGES[mounaLanguage]?.speechLocale || 'fr-FR'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || ''
      setInput(text)
      if (text.trim()) sendMessage(text.trim())
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.abort?.()
      setListening(false)
      stopSpeech()
    }
  }, [open])

  useEffect(() => () => {
    recognitionRef.current?.abort?.()
    stopSpeech()
  }, [])

  const handleAction = (action) => {
    if (!action) return

    if (action.type === 'invoice_followup') {
      const followUps = {
        fr: 'Tu peux répondre avec « télécharger » pour l’export PDF, ou « WhatsApp 221771234567 » pour l’envoyer directement.',
        ar: 'يمكنك الرد بكلمة «تنزيل» لتصدير PDF، أو «WhatsApp 221771234567» لإرساله مباشرة.',
        wo: 'Mën nga tontu « télécharger » ngir génne PDF, walla « WhatsApp 221771234567 » ngir yónnee ko.'
      }
      setMessages((m) => [...m, { role: 'assistant', content: followUps[mounaLanguage] || followUps.fr }])
    }

    if (action.type === 'report_followup') {
      const followUps = {
        fr: 'Je peux aussi préparer le rapport PDF ou le partager sur WhatsApp. Réponds par « télécharger » ou « WhatsApp 221771234567 ».',
        ar: 'يمكنني أيضاً إعداد التقرير بصيغة PDF أو مشاركته عبر WhatsApp. أجب «تنزيل» أو «WhatsApp 221771234567».',
        wo: 'Mën naa itam waajal raport PDF bi walla séddoo ko ci WhatsApp. Tontul « télécharger » walla « WhatsApp 221771234567 ».'
      }
      setMessages((m) => [...m, { role: 'assistant', content: followUps[mounaLanguage] || followUps.fr }])
    }
  }

  const handleWhatsAppShare = (phoneNumber, messageText) => {
    const clean = String(phoneNumber || '').replace(/\D/g, '')
    if (!clean) return
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadText = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const sendMessage = async (forcedText) => {
    const text = (forcedText ?? input).trim()
    if (!text || busy) return

    const source = forcedText ? 'voice' : 'text'
    const isVoiceInput = source === 'voice'
    setInputMode(isVoiceInput ? 'voice' : 'text')

    if (isGreeting(text)) {
      setInput('')
      const greeting = getGreeting(mounaLanguage)
      setMessages((m) => [...m, { role: 'assistant', content: greeting }])
      if (isVoiceInput) void speak(greeting)
      return
    }

    if (guidedFlowRef.current) {
      const flow = guidedFlowRef.current
      const key = flow.keys[flow.index]
      const value = parseFlowValue(key, text)

      if (value !== null && key) {
        flow.values[key] = value
      }

      flow.index += 1

      if (flow.index < flow.questions.length) {
        setInput('')
        const question = flow.questions[flow.index]
        setMessages((m) => [...m, { role: 'assistant', content: question }])
        if (isVoiceInput) void speak(question)
        return
      }

      const finalPrompt = buildFlowSentence(flow.type, flow.values)
      guidedFlowRef.current = null
      setInput('')
      setMessages((m) => [...m, { role: 'assistant', content: 'Je mets ça en ordre.' }])
      return sendMessage(finalPrompt)
    }

    const flow = mounaLanguage === 'fr' ? getGuidedFlow(text) : null
    if (flow) {
      guidedFlowRef.current = { ...flow, index: 0, values: {} }
      setInput('')
      setMessages((m) => [...m, { role: 'assistant', content: flow.questions[0] }])
      if (isVoiceInput) void speak(flow.questions[0])
      return
    }

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)

    try {
      const { data, error } = await supabase.functions.invoke('mouna', {
        body: {
          message: text,
          history: messages.slice(-10)
        }
      })
      if (error) {
        const status = error.context?.status
        let serviceMessage = ''
        if (error.context instanceof Response) {
          try {
            const payload = await error.context.clone().json()
            serviceMessage = payload?.error || ''
          } catch {
            // Le message générique ci-dessous suffit si la réponse n'est pas JSON.
          }
        }
        throw new Error(serviceMessage || `Mouna API: ${status || error.message || 'erreur réseau'}`)
      }
      const reply = data.reply || 'Je n’ai pas reçu de réponse exploitable.'
      handleAction(data.action)

      if (/télécharger|telecharger/i.test(text)) {
        handleDownloadText('rapport-mouna.txt', `${reply}\n\nGénéré par Mouna.`)
      }

      const whatsappMatch = text.match(/whatsapp\s*(\d+)/i) || text.match(/(?:numero|numéro)\s*(\d+)/i)
      if (whatsappMatch) {
        handleWhatsAppShare(whatsappMatch[1], reply)
      }

      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (isVoiceInput) speak(reply)
    } catch (error) {
      const errorMessages = {
        fr: 'Je n’arrive pas à joindre le moteur de Mouna. Vérifie ta connexion ou reconnecte-toi, puis réessaie.',
        ar: 'تعذّر على منى الاتصال بمحرك الذكاء الاصطناعي. تحقق من الاتصال أو سجّل الدخول مجدداً ثم حاول مرة أخرى.',
        wo: 'Mouna mënul jokkoo ak xel mu màndarga. Seetal sa jokkoo walla duggwaat, nga jéemaat.'
      }
      const message = errorMessages[mounaLanguage] || errorMessages.fr
      setMessages((m) => [...m, { role: 'assistant', content: message }])
      console.error('Erreur Edge Function Mouna:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-[60] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Sparkles size={19} /></div>
              <div><div className="font-bold">Mouna</div><div className="text-xs text-white/80">Assistant vocal de Noppalé</div></div>
            </div>
            <button onClick={() => {
              recognitionRef.current?.abort?.()
              setListening(false)
              stopSpeech()
              setOpen(false)
            }} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
          </div>

          <div className="h-80 space-y-3 overflow-y-auto p-4 bg-slate-50">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div dir="auto" lang={message.role === 'assistant' ? mounaLanguage : undefined} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-500">Mouna réfléchit…</div>}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <button onClick={startListening} disabled={busy} className={`rounded-xl p-3 text-white shadow ${listening ? 'bg-red-500' : 'bg-violet-600'} disabled:opacity-50`} aria-label="Parler">
                {listening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder={mounaLanguage === 'ar' ? 'تحدث إلى منى…' : mounaLanguage === 'wo' ? 'Wax ak Mouna…' : 'Parle à Mouna…'} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400" />
              <button onClick={() => sendMessage()} disabled={!input.trim() || busy} className="rounded-xl bg-slate-900 p-3 text-white disabled:opacity-40" aria-label="Envoyer"><Send size={18} /></button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{listening ? 'Écoute en cours…' : 'Micro disponible'}</span>
              <span className="flex items-center gap-1">{speaking ? <Volume2 size={13} /> : <VolumeX size={13} />} voix</span>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button onClick={() => { void refreshMounaLanguage(); setOpen(true) }} className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 font-bold text-white shadow-2xl shadow-indigo-500/30 transition hover:scale-105" aria-label="Ouvrir Mouna">
          <Sparkles size={20} /> Mouna
        </button>
      )}
    </>
  )
}

export default MounaAssistant
