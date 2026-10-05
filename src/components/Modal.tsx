import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="card mt-8 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Sluiten">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
