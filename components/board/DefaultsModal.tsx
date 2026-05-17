'use client'

import { useState } from 'react'
import { setupDefaults } from '@/app/actions/teams'

type Item = { id: string; name: string }

type Props = {
  teams: Item[]
  playbooks: Item[]
  onComplete: (teamId: string, playbookId: string) => void
  onSkip: () => void
}

export default function DefaultsModal({ teams, playbooks, onComplete, onSkip }: Props) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [newTeamName, setNewTeamName] = useState('')
  const [playbookId, setPlaybookId] = useState(playbooks[0]?.id ?? '')
  const [newPlaybookName, setNewPlaybookName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const useNewTeam = teamId === '__new__'
  const useNewPlaybook = playbookId === '__new__'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await setupDefaults({
      teamId: useNewTeam ? undefined : teamId || undefined,
      teamName: useNewTeam ? newTeamName : undefined,
      playbookId: useNewPlaybook ? undefined : playbookId || undefined,
      playbookName: useNewPlaybook ? newPlaybookName : undefined,
    })

    setSubmitting(false)

    if (!result.success) {
      setError(result.error ?? 'Something went wrong.')
      return
    }

    onComplete(result.teamId!, result.playbookId!)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700">
          <span className="text-sm font-black text-white">RM</span>
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-950">Set up your workspace</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a team and playbook to save your moves into. You can create new ones right here.
        </p>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* Team */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Team
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-700"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="__new__">+ Create new team…</option>
              </select>
            </label>
            {useNewTeam && (
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                required
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-700"
              />
            )}
          </div>

          {/* Playbook */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Playbook
              <select
                value={playbookId}
                onChange={(e) => setPlaybookId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-700"
              >
                {playbooks.map((pb) => (
                  <option key={pb.id} value={pb.id}>
                    {pb.name}
                  </option>
                ))}
                <option value="__new__">+ Create new playbook…</option>
              </select>
            </label>
            {useNewPlaybook && (
              <input
                value={newPlaybookName}
                onChange={(e) => setNewPlaybookName(e.target.value)}
                placeholder="Playbook name"
                required
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-700"
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-slate-400 transition hover:text-slate-600"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (!teamId && !newTeamName.trim()) ||
                (!playbookId && !newPlaybookName.trim())
              }
              className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Get started'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
