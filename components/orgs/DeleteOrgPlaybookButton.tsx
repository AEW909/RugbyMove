'use client'

import { Trash2 } from 'lucide-react'
import { deleteOrgPlaybook } from '@/app/actions/orgs'

type Props = {
  orgId: string
  playbookId: string
  playbookName: string
}

export default function DeleteOrgPlaybookButton({ orgId, playbookId, playbookName }: Props) {
  return (
    <form
      action={deleteOrgPlaybook}
      onSubmit={(e) => {
        if (!confirm(`Delete "${playbookName}"? This cannot be undone.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="playbook_id" value={playbookId} />
      <button
        type="submit"
        aria-label="Delete playbook"
        className="rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}
