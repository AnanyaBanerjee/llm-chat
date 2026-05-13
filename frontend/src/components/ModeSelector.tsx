export type Mode = 'compare' | 'debate' | 'pr_review'

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: 'compare',   label: 'Compare Output', description: 'All models answer the same task simultaneously' },
  { id: 'debate',    label: 'Debate',         description: 'Models argue a topic back and forth' },
  { id: 'pr_review', label: 'PR Review',      description: 'Models independently review a code diff' },
]

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
  disabled: boolean
}

export default function ModeSelector({ mode, onChange, disabled }: Props) {
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-lg gap-0.5">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => !disabled && onChange(m.id)}
          disabled={disabled}
          title={m.description}
          className={[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer',
            'disabled:cursor-not-allowed disabled:opacity-60',
            mode === m.id
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-500 hover:text-slate-700',
          ].join(' ')}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
