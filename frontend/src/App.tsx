import { useState, useRef, useCallback, useEffect } from 'react'
import ModeSelector, { type Mode } from './components/ModeSelector'
import ModelSelector from './components/ModelSelector'
import ModelCard, { type Status } from './components/ModelCard'
import TaskInput from './components/TaskInput'
import DebateThread, { type DebateMsg } from './components/DebateThread'

const MODELS = [
  { id: 'claude',   label: 'Claude',   color: '#B45309' },
  { id: 'gpt4o',    label: 'GPT-4o',   color: '#0D9488' },
  { id: 'deepseek', label: 'DeepSeek', color: '#4F46E5' },
  { id: 'grok',     label: 'Grok',     color: '#DB2777' },
]

type CardState = { text: string; status: Status; error?: string }
type Phase = 'idle' | 'running' | 'done'
type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const BACKEND = 'ws://127.0.0.1:8765/ws/council'

export default function App() {
  const [mode, setMode]         = useState<Mode>('compare')
  const [selected, setSelected] = useState<string[]>(MODELS.map(m => m.id))
  const [wsStatus, setWsStatus]       = useState<WsStatus>('disconnected')
  const [verbosity, setVerbosity]     = useState<'short' | 'medium' | 'none'>('none')

  const [compareCards, setCompareCards] = useState<Record<string, CardState>>({})
  const [comparePhase, setComparePhase] = useState<Phase>('idle')

  const [debateMsgs, setDebateMsgs]   = useState<DebateMsg[]>([])
  const [debatePhase, setDebatePhase] = useState<Phase>('idle')
  const [maxTurns, setMaxTurns]       = useState(6)

  const [prCards, setPrCards] = useState<Record<string, CardState>>({})
  const [prPhase, setPrPhase] = useState<Phase>('idle')
  const [prDiff, setPrDiff]   = useState('')

  const wsRef         = useRef<WebSocket | null>(null)
  const activeModeRef = useRef<Mode>('compare')

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const getWs = useCallback((): WebSocket => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current

    setWsStatus('connecting')
    const ws = new WebSocket(BACKEND)

    ws.onopen  = () => setWsStatus('connected')
    ws.onerror = () => setWsStatus('error')
    ws.onclose = () => setWsStatus('disconnected')

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as {
        type: string; model: string; turn?: number; text?: string; error?: string
      }
      const cm = activeModeRef.current
      const setCards = cm === 'pr_review' ? setPrCards : setCompareCards

      switch (msg.type) {
        case 'chunk':
          setCards(prev => ({
            ...prev,
            [msg.model]: { ...prev[msg.model], text: (prev[msg.model]?.text ?? '') + (msg.text ?? ''), status: 'streaming' },
          }))
          break
        case 'done':
          setCards(prev => ({ ...prev, [msg.model]: { ...prev[msg.model], status: 'done' } }))
          break
        case 'error':
          if (cm !== 'debate') {
            setCards(prev => ({ ...prev, [msg.model]: { ...prev[msg.model], status: 'error', error: msg.error } }))
          } else {
            setDebateMsgs(prev => {
              const next = [...prev]
              // update the existing streaming turn in-place rather than adding a duplicate
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].model === msg.model && next[i].streaming) {
                  next[i] = { ...next[i], streaming: false, error: msg.error }
                  return next
                }
              }
              // no streaming turn found — add a standalone error entry
              return [...next, { model: msg.model, turn: 0, text: '', streaming: false, error: msg.error }]
            })
          }
          break
        case 'debate_turn_start':
          setDebateMsgs(prev => [...prev, { model: msg.model, turn: msg.turn!, text: '', streaming: true }])
          break
        case 'debate_chunk':
          setDebateMsgs(prev => {
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].model === msg.model && next[i].turn === msg.turn) {
                next[i] = { ...next[i], text: next[i].text + (msg.text ?? '') }
                break
              }
            }
            return next
          })
          break
        case 'debate_turn_done':
          setDebateMsgs(prev => {
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].model === msg.model && next[i].turn === msg.turn) {
                next[i] = { ...next[i], streaming: false }
                break
              }
            }
            return next
          })
          break
        case 'debate_done':
          setDebatePhase('done')
          break
      }
    }

    wsRef.current = ws
    return ws
  }, [])

  // ── Phase completion ──────────────────────────────────────────────────────
  useEffect(() => {
    if (comparePhase !== 'running' || !Object.keys(compareCards).length) return
    if (selected.every(id => compareCards[id]?.status === 'done' || compareCards[id]?.status === 'error'))
      setComparePhase('done')
  }, [compareCards, comparePhase, selected])

  useEffect(() => {
    if (prPhase !== 'running' || !Object.keys(prCards).length) return
    if (selected.every(id => prCards[id]?.status === 'done' || prCards[id]?.status === 'error'))
      setPrPhase('done')
  }, [prCards, prPhase, selected])

  // ── Submitters ────────────────────────────────────────────────────────────
  const send = (payload: object) => {
    const ws = getWs()
    const str = JSON.stringify(payload)
    if (ws.readyState === WebSocket.OPEN) ws.send(str)
    else ws.onopen = () => { ws.send(str); setWsStatus('connected') }
  }

  const submitCompare = useCallback((task: string) => {
    activeModeRef.current = 'compare'
    const fresh: Record<string, CardState> = {}
    selected.forEach(id => { fresh[id] = { text: '', status: 'streaming' } })
    setCompareCards(fresh)
    setComparePhase('running')
    send({ type: 'compare', task, models: selected, verbosity })
  }, [selected]) // eslint-disable-line

  const submitDebate = useCallback((topic: string) => {
    activeModeRef.current = 'debate'
    setDebateMsgs([])
    setDebatePhase('running')
    send({ type: 'debate', topic, models: selected, max_turns: maxTurns, verbosity })
  }, [selected, maxTurns]) // eslint-disable-line

  const submitPR = useCallback(() => {
    if (!prDiff.trim()) return
    activeModeRef.current = 'pr_review'
    const fresh: Record<string, CardState> = {}
    selected.forEach(id => { fresh[id] = { text: '', status: 'streaming' } })
    setPrCards(fresh)
    setPrPhase('running')
    send({ type: 'pr_review', diff: prDiff, models: selected, verbosity })
  }, [selected, prDiff]) // eslint-disable-line

  const busy  = comparePhase === 'running' || debatePhase === 'running' || prPhase === 'running'
  const cols  = Math.min(selected.length, 4)
  const isEmpty =
    (mode === 'compare'   && comparePhase === 'idle') ||
    (mode === 'debate'    && debatePhase  === 'idle') ||
    (mode === 'pr_review' && prPhase      === 'idle')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
                <circle cx="4" cy="8" r="2.5" fill="currentColor" opacity="0.6"/>
                <circle cx="12" cy="4" r="2.5" fill="currentColor" opacity="0.8"/>
                <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                <path d="M6 7.5L10 5M6 8.5L10 11" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900">Model Syndicate</span>
            </div>
          </div>

          {/* WS status */}
          <div className="flex items-center gap-2">
            <span
              className={[
                'w-1.5 h-1.5 rounded-full',
                wsStatus === 'connected'    ? 'bg-emerald-500' :
                wsStatus === 'connecting'   ? 'bg-amber-400 animate-pulse' :
                wsStatus === 'error'        ? 'bg-red-500' :
                                              'bg-slate-300',
              ].join(' ')}
            />
            <span className="text-xs text-slate-400 capitalize">{wsStatus}</span>
          </div>
        </div>
      </header>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-8 py-3 flex items-center gap-6 flex-wrap">
          <ModeSelector mode={mode} onChange={setMode} disabled={busy} />
          <div className="w-px h-5 bg-slate-200" />
          <ModelSelector models={MODELS} selected={selected} onChange={setSelected} disabled={busy} />
          <div className="w-px h-5 bg-slate-200" />
          {/* Verbosity picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider select-none">Length</span>
            <div className="flex gap-0.5">
              {([['short', 'Short'], ['medium', 'Medium'], ['none', 'No limit']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => !busy && setVerbosity(val)}
                  disabled={busy}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    verbosity === val
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-8 py-6 flex flex-col gap-6">

        {/* Per-mode input panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          {mode === 'compare' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Task</label>
              <TaskInput
                onSubmit={submitCompare}
                disabled={busy}
                placeholder="Give all selected models the same task and compare their outputs… (⌘↵)"
                submitLabel="Compare"
              />
            </div>
          )}

          {mode === 'debate' && (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Max turns
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={maxTurns}
                    onChange={e => setMaxTurns(Number(e.target.value))}
                    disabled={busy}
                    className="w-32 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-slate-800 tabular-nums w-5 text-right">{maxTurns}</span>
                    <span className="text-xs text-slate-400">
                      turns · ~{Math.ceil(maxTurns / Math.max(selected.length, 1))} per model
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Topic</label>
                <TaskInput
                  onSubmit={submitDebate}
                  disabled={busy}
                  placeholder="Enter a debate topic for the selected models… (⌘↵)"
                  submitLabel="Start Debate"
                />
              </div>
            </div>
          )}

          {mode === 'pr_review' && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                PR Diff
              </label>
              <textarea
                value={prDiff}
                onChange={e => setPrDiff(e.target.value)}
                disabled={busy}
                placeholder="Paste a unified diff here…"
                rows={8}
                className={[
                  'w-full bg-slate-50 border rounded-xl px-4 py-3 font-code',
                  'text-sm text-slate-700 placeholder-slate-400 leading-relaxed',
                  'resize-y focus:outline-none transition-all duration-150',
                  'border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                ].join(' ')}
              />
              <button
                onClick={submitPR}
                disabled={busy || !prDiff.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review PR
              </button>
            </div>
          )}
        </div>

        {/* ── Output ───────────────────────────────────────────────────── */}
        {!isEmpty ? (
          <>
            {/* Compare */}
            {mode === 'compare' && comparePhase !== 'idle' && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {selected.map(id => {
                  const model = MODELS.find(m => m.id === id)!
                  const s = compareCards[id]
                  return <ModelCard key={id} model={model} text={s?.text ?? ''} status={s?.status ?? 'idle'} error={s?.error} />
                })}
              </div>
            )}

            {/* Debate */}
            {mode === 'debate' && debatePhase !== 'idle' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-6 max-w-3xl mx-auto w-full">
                <DebateThread messages={debateMsgs} models={MODELS} />
                {debatePhase === 'done' && (
                  <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">Debate concluded</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}
              </div>
            )}

            {/* PR Review */}
            {mode === 'pr_review' && prPhase !== 'idle' && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {selected.map(id => {
                  const model = MODELS.find(m => m.id === id)!
                  const s = prCards[id]
                  return <ModelCard key={id} model={model} text={s?.text ?? ''} status={s?.status ?? 'idle'} error={s?.error} />
                })}
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {mode === 'debate' ? (
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                ) : mode === 'pr_review' ? (
                  <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">
              {mode === 'compare'   && 'Compare model outputs'}
              {mode === 'debate'    && 'Start a debate'}
              {mode === 'pr_review' && 'Review a pull request'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {mode === 'compare'   && 'Give all selected models the same task and see their answers side by side'}
              {mode === 'debate'    && 'Set a topic and let the selected models argue it out turn by turn'}
              {mode === 'pr_review' && 'Paste a unified diff and get independent reviews from each model'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
