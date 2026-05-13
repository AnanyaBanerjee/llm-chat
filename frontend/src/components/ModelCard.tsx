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
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-52 transition-shadow hover:shadow-md">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: model.color }}
          />
          <span className="text-sm font-semibold text-slate-800">{model.label}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          {status === 'streaming' && (
            <>
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ backgroundColor: model.color }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: model.color }}
                />
              </span>
              <span className="text-xs text-slate-400">Generating</span>
            </>
          )}
          {status === 'done' && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Done
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-500 font-medium">Error</span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div
        ref={ref}
        className="flex-1 p-4 text-sm text-slate-700 leading-relaxed overflow-y-auto whitespace-pre-wrap"
        style={{ maxHeight: '380px' }}
      >
        {error ? (
          <span className="text-red-500 text-xs">{error}</span>
        ) : text ? (
          text
        ) : (
          <span className="text-slate-400 animate-pulse">Thinking…</span>
        )}
      </div>
    </div>
  )
}
