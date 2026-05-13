interface Model {
  id: string
  label: string
  color: string
}

interface Props {
  models: Model[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled: boolean
}

export default function ModelSelector({ models, selected, onChange, disabled }: Props) {
  const toggle = (id: string) => {
    if (disabled) return
    if (selected.includes(id)) {
      if (selected.length === 1) return
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-1 select-none">
        Models
      </span>
      {models.map(m => {
        const active = selected.includes(m.id)
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            disabled={disabled}
            title={active ? `Remove ${m.label}` : `Add ${m.label}`}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'transition-all duration-150 cursor-pointer select-none',
              'border disabled:cursor-not-allowed disabled:opacity-60',
            ].join(' ')}
            style={
              active
                ? { backgroundColor: m.color + '12', borderColor: m.color + '50', color: m.color }
                : { backgroundColor: 'transparent', borderColor: '#E2E8F0', color: '#94A3B8' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
              style={{ backgroundColor: active ? m.color : '#CBD5E1' }}
            />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
