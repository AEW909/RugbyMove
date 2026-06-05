'use client'

import { useTransition } from 'react'
import { Copy } from 'lucide-react'
import { duplicatePlay } from '@/app/actions/plays'

type Props = {
  playId: string
  playbookId: string
}

export default function DuplicateMoveButton({ playId, playbookId }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(() => duplicatePlay(new FormData(e.currentTarget)))
      }}
    >
      <input type="hidden" name="play_id" value={playId} />
      <input type="hidden" name="playbook_id" value={playbookId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Duplicate move"
        title="Duplicate move"
        className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-40"
      >
        <Copy className="h-4 w-4" />
      </button>
    </form>
  )
}
