import { useEffect, useRef } from 'react'

export type Status = 'idle' | 'streaming' | 'done' | 'error'

interface Props {
  model: { id: string; label: string; color: string }
  text: string
  status: Status
  error?: string
}

export default function ModelCard({ model, text, status, error }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && status === 'streaming') {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [text, status])

  return (
    <div className="card-enter flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-px">

      {/* Colored accent bar */}
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: model.color }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: model.color }}
          >
            {model.label[0]}
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">{model.label}</span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          {status === 'streaming' && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: model.color + '15', color: model.color }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: model.color }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: model.color }} />
              </span>
              Generating
            </span>
          )}
          {status === 'done' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Done
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 4v3M6 8.5v.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Error
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        ref={ref}
        className="flex-1 p-4 text-sm text-slate-700 leading-relaxed overflow-y-auto"
        style={{ maxHeight: '380px' }}
      >
        {error ? (
          <span className="text-red-500 text-xs">{error}</span>
        ) : text ? (
          <span className="whitespace-pre-wrap">
            {text}
            {status === 'streaming' && <span className="cursor-blink" style={{ color: model.color }} />}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">Waiting for response…</span>
        )}
      </div>
    </div>
  )
}
