import { useState, useRef } from 'react'

interface Props {
  onSubmit: (task: string) => void
  disabled: boolean
}

export default function TaskInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

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
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Ask the council anything… (⌘↵ to submit)"
        rows={2}
        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-500 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="px-5 py-3 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap h-[68px]"
      >
        Ask Council
      </button>
    </div>
  )
}
