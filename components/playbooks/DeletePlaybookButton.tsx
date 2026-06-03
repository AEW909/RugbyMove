'use client'

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deletePlaybook } from '@/app/actions/playbooks'

export default function DeletePlaybookButton({
  playbookId,
  playbookName,
}: {
  playbookId: string
  playbookName: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const confirmed = value.toLowerCase() === 'delete'

  const handleOpen = () => {
    setValue('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-white">Delete playbook?</h2>
            <p className="mt-2 text-sm text-white/50">
              <span className="font-semibold text-white/80">&ldquo;{playbookName}&rdquo;</span> and
              all its member access will be permanently deleted. The moves themselves won&rsquo;t be
              deleted.
            </p>
            <p className="mt-4 text-sm text-white/50">
              Type <span className="font-mono font-bold text-white">delete</span> to confirm.
            </p>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmed) {
                  const form = e.currentTarget.closest('form')
                  form?.requestSubmit()
                }
              }}
              placeholder="delete"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
            />

            <form action={deletePlaybook} className="mt-5 flex gap-3">
              <input type="hidden" name="id" value={playbookId} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!confirmed}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
