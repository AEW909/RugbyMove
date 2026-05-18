'use client'

import { deletePlaybook } from '@/app/actions/playbooks'

export default function DeletePlaybookButton({
  playbookId,
  playbookName,
}: {
  playbookId: string
  playbookName: string
}) {
  return (
    <form
      action={deletePlaybook}
      onSubmit={(e) => {
        if (!confirm(`Delete "${playbookName}"? This cannot be undone.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={playbookId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        Delete playbook
      </button>
    </form>
  )
}
