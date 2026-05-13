import { useEffect, useRef } from 'react'

export interface DebateMsg {
  model: string
  turn: number
  text: string
  streaming: boolean
  error?: string
}

interface Model {
  id: string
  label: string
  color: string
}

interface Props {
  messages: DebateMsg[]
  models: Model[]
}

export default function DebateThread({ messages, models }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.text.length])

  if (messages.length === 0) return null

  return (
    <div className="space-y-1">
      {messages.map((msg, i) => {
        const model = models.find(m => m.id === msg.model)
        if (!model) return null
        const isLast = i === messages.length - 1
        const isError = !!msg.error

        return (
          <div key={i} className="relative flex gap-3 py-4">
            {/* Connector line */}
            {!isLast && (
              <div className="absolute left-[17px] top-[52px] bottom-0 w-px bg-slate-200" />
            )}

            {/* Avatar */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{
                  background: isError
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${model.color}dd, ${model.color})`,
                }}
              >
                {model.label[0]}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold tracking-tight"
                  style={{ color: isError ? '#94A3B8' : model.color }}
                >
                  {model.label}
                </span>
                {!isError && (
                  <span className="text-xs text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-md">
                    Turn {msg.turn}
                  </span>
                )}
                {msg.streaming && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: model.color }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: model.color }} />
                  </span>
                )}
              </div>

              {/* Bubble */}
              {isError ? (
                <div className="inline-flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 max-w-lg">
                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M7 4.5v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span>{msg.error}</span>
                </div>
              ) : (
                <div
                  className="rounded-2xl rounded-tl-sm px-4 py-3 border text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
                  style={{
                    backgroundColor: model.color + '08',
                    borderColor: model.color + '20',
                  }}
                >
                  {msg.text || <span className="text-slate-400 italic text-xs">Thinking…</span>}
                  {msg.streaming && msg.text && (
                    <span className="cursor-blink" style={{ color: model.color }} />
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
