import { useRef, useState } from 'react'
import { FileAudio, Mic, MicOff, Sparkles, Square } from 'lucide-react'
import { useAI } from '../../hooks/useAI'
import { useAddConversation } from '../../hooks/useConversations'
import { cn } from '../../lib/cn'

// Web Speech API isn't in lib.dom.d.ts by default. Declare precise shapes
// so consumers don't reach for `as unknown as` ad-hoc in every call site.
interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (ev: SpeechRecognitionEventLike) => void
  onend: () => void
  onerror: (e: { error: string }) => void
  start: () => void
  stop: () => void
}
interface SpeechWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

function getSpeechWindow(): SpeechWindow {
  if (typeof window === 'undefined') return {}
  // Safe single cast: we've enumerated the exact fields we consume.
  return window as unknown as SpeechWindow
}

export function MeetingNotes(): React.JSX.Element {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => {
    const w = getSpeechWindow()
    return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition)
  })
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [title, setTitle] = useState('')
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const { state, start, cancel } = useAI()
  const savedNote = useAddConversation()
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const toggle = (): void => {
    const w = getSpeechWindow()
    const RecCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!RecCtor) return
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new RecCtor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (ev): void => {
      let final = ''
      let inter = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) final += r[0].transcript
        else inter += r[0].transcript
      }
      if (final) setTranscript((t) => (t ? t + ' ' + final.trim() : final.trim()))
      setInterim(inter)
    }
    rec.onend = (): void => {
      setListening(false)
      setInterim('')
    }
    rec.onerror = (e): void => {
      console.error('speech recognition error', e.error)
      setListening(false)
    }
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  const summarize = (): void => {
    if (!transcript.trim()) return
    void start({
      module: 'assistant',
      promptKey: 'assistant_default',
      messages: [
        {
          role: 'user',
          content: `Summarize this meeting transcript into:\n1. Top 5 key decisions\n2. Action items (owner/task/due if mentioned)\n3. Open questions\n4. 2-sentence tl;dr\n\nTRANSCRIPT:\n${transcript}`
        }
      ]
    })
  }

  const saveNote = (): void => {
    if (!transcript.trim() && !state.text) return
    savedNote.mutate(
      {
        module: 'assistant',
        provider: state.provider ?? 'unknown',
        model: state.model ?? undefined,
        title: title.trim() || `Meeting ${new Date().toLocaleString()}`,
        messages: [
          { role: 'user', content: `Meeting transcript:\n\n${transcript}` },
          ...(state.text ? [{ role: 'assistant' as const, content: state.text }] : [])
        ]
      },
      {
        onSuccess: () => {
          setSavedMsg('Saved to conversations')
          setTimeout(() => setSavedMsg(null), 2500)
        }
      }
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-[12px] outline-none"
        />
        <button
          onClick={toggle}
          disabled={!supported}
          className={cn(
            'flex items-center gap-1 rounded px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40',
            listening ? 'bg-[var(--color-neg)]' : 'bg-[var(--color-info)]'
          )}
        >
          {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          {listening ? 'Stop' : supported ? 'Start listening' : 'Not supported'}
        </button>
      </div>
      {!supported && (
        <div className="rounded bg-[var(--color-warn)]/10 p-2 text-[11px] text-[var(--color-warn)]">
          Browser Speech Recognition not available in this Electron build. Paste transcript manually
          below.
        </div>
      )}

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <FileAudio className="h-3 w-3" /> Transcript
        </div>
        <textarea
          value={transcript + (interim ? ' ' + interim : '')}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          placeholder="Start listening or paste a transcript…"
          className="w-full resize-y rounded bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[11px] leading-relaxed outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={summarize}
          disabled={!transcript.trim() || state.streaming}
          className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
        >
          <Sparkles className="h-3 w-3" /> Summarize with AI
        </button>
        {state.streaming && (
          <button
            onClick={cancel}
            className="flex items-center gap-1 rounded bg-[var(--color-neg)] px-3 py-1.5 text-[11px] font-medium text-white"
          >
            <Square className="h-3 w-3" /> Stop
          </button>
        )}
        <button
          onClick={saveNote}
          disabled={!transcript.trim()}
          className="rounded bg-[var(--color-pos)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
        >
          Save note
        </button>
        {savedMsg && <span className="text-[10px] text-[var(--color-pos)]">{savedMsg}</span>}
      </div>

      {state.text && (
        <div className="rounded-md border border-[var(--color-info)]/30 bg-[var(--color-info)]/5 p-3">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-info)]">
            <Sparkles className="h-3 w-3" /> AI Summary
          </div>
          <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{state.text}</div>
        </div>
      )}
      {state.error && (
        <div className="rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
          {state.error}
        </div>
      )}
    </div>
  )
}
