import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPlaybook } from '@/app/actions/playbooks'

type PageProps = {
  searchParams: { error?: string }
}

export default async function NewPlaybookPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-lg">
        <Link href="/playbooks" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Playbooks
        </Link>
        <h1 className="mt-4 text-2xl font-bold">New playbook</h1>

        {searchParams.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchParams.error}
          </p>
        )}

        <form action={createPlaybook} className="mt-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Pre-season attack patterns"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
              Description{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="A short note about this collection…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold text-slate-700">Visibility</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  { value: 'private', label: 'Private', desc: 'Only you' },
                  { value: 'team', label: 'Team', desc: 'Members you invite' },
                  { value: 'public', label: 'Public', desc: 'Anyone with the link' },
                ] as const
              ).map(({ value, label, desc }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    defaultChecked={value === 'private'}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-slate-500">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create playbook
            </button>
            <Link
              href="/playbooks"
              className="rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
