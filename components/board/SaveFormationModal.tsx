'use client'

import { X } from 'lucide-react'
import { FORMATION_CATEGORIES } from '@/lib/board/storage'
import type { FormationCategory } from '@/lib/board/storage'

type Props = {
  name: string
  onNameChange: (name: string) => void
  category: FormationCategory
  onCategoryChange: (cat: FormationCategory) => void
  onSave: () => void
  onClose: () => void
}

export default function SaveFormationModal({ name, onNameChange, category, onCategoryChange, onSave, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Save formation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-white/50">
          Saves this frame&apos;s player positions as a starting point for new moves.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-white/80">
            Name
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Tight scrum left"
              autoFocus
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
            />
          </label>
          <label className="block text-sm font-semibold text-white/80">
            Category
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as FormationCategory)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
            >
              {FORMATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!name.trim()}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-50"
          >
            Save formation
          </button>
        </div>
      </div>
    </div>
  )
}
