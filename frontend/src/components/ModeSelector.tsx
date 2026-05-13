export type Mode = 'compare' | 'debate' | 'pr_review'

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'compare',
    label: 'Compare',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="3" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 6h2M4 8h2M4 10h2M10 6h2M10 8h2M10 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'debate',
    label: 'Debate',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h7a1 1 0 011 1v4a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M14 7h-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M10 9v1a1 1 0 001 1h1l3 2V8a1 1 0 00-1-1h-1" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'pr_review',
    label: 'PR Review',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
        <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M9.5 1.5V5.5H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M5.5 9.5l1.5 1.5-1.5 1.5M8.5 11h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
  disabled: boolean
}

export default function ModeSelector({ mode, onChange, disabled }: Props) {
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-0.5">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => !disabled && onChange(m.id)}
          disabled={disabled}
          title={m.label}
          className={[
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold',
            'transition-all duration-150 cursor-pointer select-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            mode === m.id
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  )
}
