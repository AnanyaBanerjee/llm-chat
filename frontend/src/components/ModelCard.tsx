import { useEffect, useRef } from 'react'

export type Status = 'idle' | 'streaming' | 'done' | 'error'

interface Props {
  model: { id: string; label: string; color: string }
  text: string
  compareText: string
  status: Status
  compareStatus: Status
  error?: string
}

function StatusDot({ status, color }: { status: Status; color: string }) {
  if (status === 'streaming') {
    return (
      <span className="relative flex h-2 w-2">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: color }}
        />
      </span>
    )
  }
  if (status === 'done') {
    return <span className="text-xs text-slate-500">done</span>
  }
  if (status === 'error') {
    return <span className="text-xs text-red-400">error</span>
  }
  return null
}

export default function ModelCard({ model, text, compareText, status, compareStatus, error }: Props) {
  const textRef = useRef<HTMLDivElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (textRef.current && status === 'streaming') {
      textRef.current.scrollTop = textRef.current.scrollHeight
    }
  }, [text, status])

  useEffect(() => {
    if (compareRef.current && compareStatus === 'streaming') {
      compareRef.current.scrollTop = compareRef.current.scrollHeight
    }
  }, [compareText, compareStatus])

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-56">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: model.color }} />
          <span className="text-sm font-medium text-slate-200">{model.label}</span>
        </div>
        <StatusDot status={status} color={model.color} />
      </div>

      {/* Main response */}
      <div
        ref={textRef}
        className="flex-1 p-4 text-sm text-slate-300 leading-relaxed overflow-y-auto whitespace-pre-wrap"
        style={{ maxHeight: '280px', fontFamily: 'inherit' }}
      >
        {error ? (
          <span className="text-red-400 text-xs">{error}</span>
        ) : text ? (
          text
        ) : (
          <span className="text-slate-600 animate-pulse">Thinking…</span>
        )}
      </div>

      {/* Compare section */}
      {compareStatus !== 'idle' && (
        <>
          <div className="border-t border-slate-700/60 px-4 py-2 bg-slate-800/40 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500 uppercase tracking-wider">After comparing notes</span>
            <StatusDot status={compareStatus} color={model.color} />
          </div>
          <div
            ref={compareRef}
            className="p-4 text-sm text-slate-300 leading-relaxed overflow-y-auto whitespace-pre-wrap"
            style={{ maxHeight: '200px', fontFamily: 'inherit' }}
          >
            {compareText || <span className="text-slate-600 animate-pulse">Reading others…</span>}
          </div>
        </>
      )}
    </div>
  )
}
