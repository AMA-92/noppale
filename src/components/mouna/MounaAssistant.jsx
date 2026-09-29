import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, X, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../../supabase/config'
import { appStorage } from '../../utils/storage'
import { useUserPreferencesRealtime } from '../../hooks/useRealtime'
import {
  classifyMounaConfirmation,
  getMounaPendingConfirmation,
  makeMounaConfirmationBody,
  makeMounaRequestBody
} from '../../utils/mounaConversation.mjs'
import {
  getMounaErrorMessage,
  getMounaGreeting,
  getMounaProgressMessage
} from '../../utils/mouna-ui.mjs'

const MOUNA_LANGUAGES = {
  fr: { name: 'Français', speechLocale: 'fr-FR' },
  ar: { name: 'العربية', speechLocale: 'ar-SA' },
  wo: { name: 'Wolof', speechLocale: 'wo-SN' }
}

const CONFIRMATION_LABELS = {
  fr: { title: 'Action en attente de confirmation', confirm: 'Confirmer', cancel: 'Annuler', yes: 'Je confirme.', no: 'J’annule.' },
  ar: { title: 'إجراء بانتظار التأكيد', confirm: 'تأكيد', cancel: 'إلغاء', yes: 'أؤكد.', no: 'أُلغي.' },
  wo: { title: 'Jëfandikoo bi dafay xaar dëggal', confirm: 'Dëggal', cancel: 'Nekkal', yes: 'Dëggal naa.', no: 'Nekk na.' }
}

const PENDING_ACTION_NOTICE = {
  fr: 'Confirme ou annule l’action en attente avant une autre demande.',
  ar: 'يرجى تأكيد العملية المعلّقة أو إلغاؤها قبل طلب شيء آخر.',
  wo: 'Dëggal walla nekkal jëfandikoo bi bala nga laaj beneen lu.'
}

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

function MounaAssistant() {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [mounaLanguage, setMounaLanguage] = useState('fr')
  const [accountName, setAccountName] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour.' }
  ])
  const [busy, setBusy] = useState(false)
  const [inputMode, setInputMode] = useState('text')
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [saleState, setSaleState] = useState(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  const refreshMounaLanguage = useCallback(async () => {
    try {
      const [preferences, sessionResult] = await Promise.all([
        appStorage.getUserPreferences(),
        supabase.auth.getSession()
      ])
      const nextLanguage = ['fr', 'ar', 'wo'].includes(preferences?.mouna_language)
        ? preferences.mouna_language
        : 'fr'
      const user = sessionResult?.data?.session?.user
      const nextAccountName = String(user?.user_metadata?.name || user?.user_metadata?.full_name || '').trim().slice(0, 60)
      setMounaLanguage(nextLanguage)
      setAccountName(nextAccountName)
      setMessages((current) => current.length === 1 && current[0]?.role === 'assistant'
        ? [{ role: 'assistant', content: getMounaGreeting(nextLanguage, nextAccountName) }]
        : current)
      return { language: nextLanguage, accountName: nextAccountName }
    } catch (error) {
      console.error('Erreur de chargement de la langue de Mouna:', error)
      return null
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
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
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

  const speak = async (text, languageOverride = mounaLanguage) => {
    if (typeof window === 'undefined') return
    const raw = String(text || '').trim()
    if (!raw) return

    stopSpeech()
    const language = ['fr', 'ar', 'wo'].includes(languageOverride) ? languageOverride : 'fr'
    const locale = MOUNA_LANGUAGES[language]?.speechLocale || 'fr-FR'
    const shortText = raw.split(/(?<=[.!?؟])\s+/).find(Boolean) || raw
    const spokenText = (language === 'fr' ? makeSpeechFriendlyText(shortText) : stripEmojiAndNoise(shortText)).slice(0, 600)
    if (!spokenText) {
      setSpeaking(false)
      return
    }

    // Use the browser voice first: it starts immediately and does not wait for the remote TTS service.
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      speakInBrowser(spokenText, locale)
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

  const runPendingAction = async (confirm, isVoiceInput = false, userMessageAdded = false) => {
    const pending = pendingConfirmation
    if (!pending?.id || busy) return

    const labels = CONFIRMATION_LABELS[mounaLanguage] || CONFIRMATION_LABELS.fr
    if (!userMessageAdded) {
      setMessages((m) => [...m, { role: 'user', content: confirm ? labels.yes : labels.no }])
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('mouna', {
        body: makeMounaConfirmationBody(pending.id, confirm)
      })
      if (error) {
        let serviceMessage = ''
        if (error.context instanceof Response) {
          try {
            const payload = await error.context.clone().json()
            serviceMessage = payload?.error || ''
          } catch {
            // L’erreur localisée ci-dessous suffit si le serveur ne renvoie pas de JSON.
          }
        }
        const failure = new Error(serviceMessage || error.message || 'Erreur réseau')
        failure.status = error.context?.status
        throw failure
      }

      const reply = data?.reply || (confirm
        ? (mounaLanguage === 'ar' ? 'تم تنفيذ الإجراء.' : mounaLanguage === 'wo' ? 'Jëfandikoo bi am na.' : 'Action confirmée et effectuée.')
        : (mounaLanguage === 'ar' ? 'أُلغيت العملية.' : mounaLanguage === 'wo' ? 'Nekk na.' : 'Action annulée.'))
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      setPendingConfirmation(null)
      setSaleState(null)
      void speak(reply)
    } catch (error) {
      const message = getMounaErrorMessage(mounaLanguage, error)
      setMessages((m) => [...m, { role: 'assistant', content: message }])
      void speak(message)
      console.error('Erreur de confirmation Mouna:', error)
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async (forcedText) => {
    const text = (forcedText ?? input).trim()
    if (!text || busy) return

    const source = forcedText ? 'voice' : 'text'
    const isVoiceInput = source === 'voice'
    setInputMode(isVoiceInput ? 'voice' : 'text')

    if (isGreeting(text)) {
      setInput('')
      const greeting = getMounaGreeting(mounaLanguage, accountName)
      setMessages((m) => [...m, { role: 'assistant', content: greeting }])
      void speak(greeting)
      return
    }

    if (pendingConfirmation) {
      setInput('')
      setMessages((m) => [...m, { role: 'user', content: text }])
      const decision = classifyMounaConfirmation(text, mounaLanguage)
      if (decision) return runPendingAction(decision === 'confirm', isVoiceInput, true)
      const notice = PENDING_ACTION_NOTICE[mounaLanguage] || PENDING_ACTION_NOTICE.fr
      setMessages((m) => [...m, { role: 'assistant', content: notice }])
      void speak(notice)
      return
    }

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    const progressId = globalThis.crypto?.randomUUID?.() || `mouna-${Date.now()}`
    const progressMessage = getMounaProgressMessage(mounaLanguage)
    setMessages((m) => [...m, { id: progressId, role: 'assistant', content: progressMessage }])
    void speak(progressMessage, mounaLanguage)
    setBusy(true)

    try {
      const { data, error } = await supabase.functions.invoke('mouna', {
        body: makeMounaRequestBody({
          message: text,
          history: messages,
          saleState
        })
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
        const failure = new Error(serviceMessage || `Mouna API: ${status || error.message || 'erreur réseau'}`)
        failure.status = status
        throw failure
      }

      const reply = data.reply || 'Je n’ai pas reçu de réponse exploitable.'
      const pending = getMounaPendingConfirmation(data)
      setPendingConfirmation(pending)
      if (data?.sale_state && typeof data.sale_state === 'object' && !Array.isArray(data.sale_state)) {
        setSaleState(data.sale_state)
      } else if (pending) {
        setSaleState(null)
      }
      setMessages((m) => m.map((message) => message.id === progressId
        ? { ...message, content: reply }
        : message))
      handleAction(data.action)

      if (/télécharger|telecharger/i.test(text)) {
        handleDownloadText('rapport-mouna.txt', `${reply}\n\nGénéré par Mouna.`)
      }

      const whatsappMatch = text.match(/whatsapp\s*(\d+)/i) || text.match(/(?:numero|numéro)\s*(\d+)/i)
      if (whatsappMatch) {
        handleWhatsAppShare(whatsappMatch[1], reply)
      }

      void speak(reply)
    } catch (error) {
      const message = getMounaErrorMessage(mounaLanguage, error)
      setMessages((m) => m.map((item) => item.id === progressId
        ? { ...item, content: message }
        : item))
      void speak(message)
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
              <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div dir="auto" lang={message.role === 'assistant' ? mounaLanguage : undefined} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-500">Mouna réfléchit…</div>}
            {pendingConfirmation && (
              <div className="mx-1 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <div dir="auto" lang={mounaLanguage} className="mb-2 text-xs font-medium text-amber-900">
                  {(CONFIRMATION_LABELS[mounaLanguage] || CONFIRMATION_LABELS.fr).title}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => void runPendingAction(true)} disabled={busy} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {(CONFIRMATION_LABELS[mounaLanguage] || CONFIRMATION_LABELS.fr).confirm}
                  </button>
                  <button onClick={() => void runPendingAction(false)} disabled={busy} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                    {(CONFIRMATION_LABELS[mounaLanguage] || CONFIRMATION_LABELS.fr).cancel}
                  </button>
                </div>
              </div>
            )}
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
        <button onClick={() => {
          setOpen(true)
          const greeting = getMounaGreeting(mounaLanguage, accountName)
          setMessages((current) => current.length === 1 && current[0]?.role === 'assistant'
            ? [{ role: 'assistant', content: greeting }]
            : [...current, { role: 'assistant', content: greeting }])
          void speak(greeting, mounaLanguage)
        }} className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 font-bold text-white shadow-2xl shadow-indigo-500/30 transition hover:scale-105" aria-label="Ouvrir Mouna">
          <Sparkles size={20} /> Mouna
        </button>
      )}
    </>
  )
}

export default MounaAssistant
