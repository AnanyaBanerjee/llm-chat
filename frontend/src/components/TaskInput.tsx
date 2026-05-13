import { useState } from 'react'

interface Props {
  onSubmit: (task: string) => void
  disabled: boolean
  placeholder?: string
  submitLabel?: string
}

export default function TaskInput({
  onSubmit,
  disabled,
  placeholder = 'Ask anything… (⌘↵ to submit)',
  submitLabel = 'Submit',
}: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    const task = value.trim()
    if (!task || disabled) return
    onSubmit(task)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex gap-3 items-end">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        className={[
          'flex-1 bg-white border rounded-xl px-4 py-3',
          'text-sm text-slate-800 placeholder-slate-400',
          'resize-none focus:outline-none transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
        ].join(' ')}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className={[
          'px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap h-[68px]',
          'transition-all duration-150 cursor-pointer',
          'bg-indigo-600 text-white hover:bg-indigo-700',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'shadow-sm hover:shadow-md',
        ].join(' ')}
      >
        {submitLabel}
      </button>
    </div>
  )
}
