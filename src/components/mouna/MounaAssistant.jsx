import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, X, Sparkles, Volume2, VolumeX } from 'lucide-react'

const API_ENDPOINT = import.meta.env.VITE_MOUNA_API_URL || '/api/mouna'

function MounaAssistant() {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour, je suis Mouna. Dis-moi ce que tu veux faire dans Noppalé.' }
  ])
  const [busy, setBusy] = useState(false)
  const recognitionRef = useRef(null)

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 1
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages((m) => [...m, { role: 'assistant', content: "La reconnaissance vocale n'est pas disponible dans ce navigateur. Utilise Chrome/Android ou le champ texte." }])
      return
    }

    if (recognitionRef.current) recognitionRef.current.abort()
    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
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

  useEffect(() => () => {
    recognitionRef.current?.abort?.()
    window.speechSynthesis?.cancel?.()
  }, [])

  const sendMessage = async (forcedText) => {
    const text = (forcedText ?? input).trim()
    if (!text || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10)
        })
      })

      if (!response.ok) throw new Error(`Mouna API: ${response.status}`)
      const data = await response.json()
      const reply = data.reply || 'Je n’ai pas reçu de réponse exploitable.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      speak(reply)
    } catch (error) {
      const message = 'Mouna est bien installée, mais son moteur IA n’est pas encore connecté. Consulte le guide MOUNA-GUIDE.md pour configurer le serveur IA.'
      setMessages((m) => [...m, { role: 'assistant', content: message }])
      console.error(error)
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
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
          </div>

          <div className="h-80 space-y-3 overflow-y-auto p-4 bg-slate-50">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
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
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Parle à Mouna…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400" />
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
        <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 font-bold text-white shadow-2xl shadow-indigo-500/30 transition hover:scale-105" aria-label="Ouvrir Mouna">
          <Sparkles size={20} /> Mouna
        </button>
      )}
    </>
  )
}

export default MounaAssistant
