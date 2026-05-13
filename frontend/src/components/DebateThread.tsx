import { useEffect, useRef } from 'react'

export interface DebateMsg {
  model: string
  turn: number
  text: string
  streaming: boolean
  error?: string        // set when this is an error entry
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
    <div className="space-y-0">
      {messages.map((msg, i) => {
        const model = models.find(m => m.id === msg.model)
        if (!model) return null
        const isLast = i === messages.length - 1
        const isError = !!msg.error

        return (
          <div key={i} className="group relative flex gap-4 py-5">
            {/* Timeline connector */}
            {!isLast && (
              <div
                className="absolute left-[19px] top-[52px] bottom-0 w-px"
                style={{ backgroundColor: '#E2E8F0' }}
              />
            )}

            {/* Avatar */}
            <div
              className={[
                'relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                'text-white text-xs font-bold shadow-sm z-10',
                isError ? 'opacity-50' : '',
              ].join(' ')}
              style={{ backgroundColor: isError ? '#94A3B8' : model.color }}
            >
              {model.label[0]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isError ? '#94A3B8' : model.color }}
                >
                  {model.label}
                </span>
                {!isError && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                    Turn {msg.turn}
                  </span>
                )}
                {msg.streaming && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: model.color }}
                    />
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: model.color }}
                    />
                  </span>
                )}
              </div>

              {/* Error pill */}
              {isError ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {msg.error}
                </div>
              ) : (
                <div className="bg-white rounded-xl rounded-tl-sm border border-slate-200 px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {msg.text || <span className="text-slate-400 animate-pulse">Thinking…</span>}
                  </p>
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
