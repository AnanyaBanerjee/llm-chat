import { useState, useRef, useCallback, useEffect } from 'react'
import ModelCard, { type Status } from './components/ModelCard'
import TaskInput from './components/TaskInput'
import ModelSelector from './components/ModelSelector'

const MODELS = [
  { id: 'claude',   label: 'Claude',   color: '#D97706' },
  { id: 'gpt4o',    label: 'GPT-4o',   color: '#10A37F' },
  { id: 'deepseek', label: 'DeepSeek', color: '#6366F1' },
  { id: 'grok',     label: 'Grok',     color: '#EC4899' },
]

type ModelState = {
  text: string
  compareText: string
  status: Status
  compareStatus: Status
  error?: string
}

type Phase = 'idle' | 'asking' | 'done' | 'comparing' | 'compared'

const BACKEND = 'ws://127.0.0.1:8765/ws/council'

export default function App() {
  const [selected, setSelected] = useState<string[]>(MODELS.map(m => m.id))
  const [states, setStates] = useState<Record<string, ModelState>>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentTask, setCurrentTask] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  const getWs = useCallback((): WebSocket => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current

    const ws = new WebSocket(BACKEND)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as {
        type: string; model: string; text?: string; error?: string
      }

      setStates(prev => {
        const s = prev[msg.model] ?? { text: '', compareText: '', status: 'idle' as Status, compareStatus: 'idle' as Status }

        switch (msg.type) {
          case 'chunk':
            return { ...prev, [msg.model]: { ...s, text: s.text + (msg.text ?? ''), status: 'streaming' } }
          case 'done':
            return { ...prev, [msg.model]: { ...s, status: 'done' } }
          case 'compare_chunk':
            return { ...prev, [msg.model]: { ...s, compareText: s.compareText + (msg.text ?? ''), compareStatus: 'streaming' } }
          case 'compare_done':
            return { ...prev, [msg.model]: { ...s, compareStatus: 'done' } }
          case 'error':
            return { ...prev, [msg.model]: { ...s, status: 'error', error: msg.error } }
          default:
            return prev
        }
      })
    }

    ws.onerror = () => console.error('WebSocket error — is the backend running?')
    wsRef.current = ws
    return ws
  }, [])

  // phase: asking → done when all selected models finish
  useEffect(() => {
    if (phase !== 'asking' || Object.keys(states).length === 0) return
    const allDone = selected.every(id => states[id]?.status === 'done' || states[id]?.status === 'error')
    if (allDone) setPhase('done')
  }, [states, phase, selected])

  // phase: comparing → compared when compare phase finishes
  useEffect(() => {
    if (phase !== 'comparing' || Object.keys(states).length === 0) return
    const allDone = selected.every(id => states[id]?.compareStatus === 'done' || states[id]?.compareStatus === 'error')
    if (allDone) setPhase('compared')
  }, [states, phase, selected])

  const ask = useCallback((task: string) => {
    setCurrentTask(task)
    const fresh: Record<string, ModelState> = {}
    for (const id of selected) {
      fresh[id] = { text: '', compareText: '', status: 'streaming', compareStatus: 'idle' }
    }
    setStates(fresh)
    setPhase('asking')

    const ws = getWs()
    const payload = JSON.stringify({ type: 'ask', task, models: selected })
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
    else ws.onopen = () => ws.send(payload)
  }, [getWs, selected])

  const compare = useCallback(() => {
    setPhase('comparing')
    const responses: Record<string, string> = {}
    for (const id of selected) {
      if (states[id]?.text) responses[id] = states[id].text
    }
    setStates(prev => {
      const next = { ...prev }
      for (const id of selected) {
        next[id] = { ...next[id], compareText: '', compareStatus: 'streaming' }
      }
      return next
    })
    wsRef.current!.send(JSON.stringify({ type: 'compare', task: currentTask, responses, models: selected }))
  }, [states, selected, currentTask])

  const cols = Math.min(selected.length, 4)
  const busy = phase === 'asking' || phase === 'comparing'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 border-b border-slate-800/60">
        <h1 className="text-xl font-semibold tracking-tight">Model Council</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Ask multiple LLMs simultaneously and compare their answers
        </p>
      </header>

      {/* Controls */}
      <div className="px-6 py-4 space-y-3 border-b border-slate-800/60 flex-shrink-0">
        <ModelSelector models={MODELS} selected={selected} onChange={setSelected} disabled={busy} />
        <TaskInput onSubmit={ask} disabled={busy} />
      </div>

      {/* Cards */}
      {phase !== 'idle' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {selected.map(id => {
              const model = MODELS.find(m => m.id === id)!
              const s = states[id]
              return (
                <ModelCard
                  key={id}
                  model={model}
                  text={s?.text ?? ''}
                  compareText={s?.compareText ?? ''}
                  status={s?.status ?? 'idle'}
                  compareStatus={s?.compareStatus ?? 'idle'}
                  error={s?.error}
                />
              )
            })}
          </div>

          {/* Compare notes CTA */}
          {(phase === 'done' || phase === 'compared') && selected.length > 1 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={compare}
                disabled={phase === 'compared'}
                className="px-6 py-2.5 rounded-xl text-sm font-medium border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'compared' ? '✓ Notes Compared' : 'Compare Notes →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {phase === 'idle' && (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
          Select models above and ask a question to get started
        </div>
      )}
    </div>
  )
}
