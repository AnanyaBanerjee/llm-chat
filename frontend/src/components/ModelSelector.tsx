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
      if (selected.length === 1) return // keep at least one
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Council</span>
      {models.map(m => {
        const active = selected.includes(m.id)
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border disabled:cursor-not-allowed"
            style={
              active
                ? { backgroundColor: m.color + '20', borderColor: m.color + '60', color: m.color }
                : { backgroundColor: 'transparent', borderColor: '#334155', color: '#64748b' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: active ? m.color : '#334155' }}
            />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
