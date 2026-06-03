'use client'

import { Trash2 } from 'lucide-react'
import { deletePlay } from '@/app/actions/plays'

export default function DeleteMoveButton({ playId }: { playId: string }) {
  return (
    <form
      action={deletePlay}
      onSubmit={(e) => {
        if (!confirm('Delete this move permanently? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={playId} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
      >
        <Trash2 className="h-4 w-4" />
        Delete move
      </button>
    </form>
  )
}
