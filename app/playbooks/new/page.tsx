import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPlaybook } from '@/app/actions/playbooks'
import AppHeader from '@/components/AppHeader'

type PageProps = {
  searchParams: { error?: string; org_id?: string }
}

export default async function NewPlaybookPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const orgId = searchParams.org_id ?? null

  let orgName: string | null = null
  if (orgId) {
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single()
    orgName = org?.name ?? null
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-lg">
        <AppHeader backHref={orgId ? `/org/${orgId}` : '/playbooks'} backLabel={orgName ?? 'Playbooks'} />
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white">New playbook</h1>
        {orgName && (
          <p className="mt-1 text-sm text-white/60">Creating for <span className="font-semibold text-white/80">{orgName}</span></p>
        )}

        {searchParams.error && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {searchParams.error}
          </p>
        )}

        <form action={createPlaybook} className="mt-6 space-y-5">
          {orgId && <input type="hidden" name="org_id" value={orgId} />}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-white/60">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Pre-season attack patterns"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-sm transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-white/60">
              Description{' '}
              <span className="font-normal text-white/30">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="A short note about this collection…"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-sm transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold text-white/60">Visibility</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  { value: 'private', label: 'Private', desc: 'Only you and invited members' },
                  { value: 'public', label: 'Public', desc: 'Anyone with the link' },
                ] as const
              ).map(({ value, label, desc }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    defaultChecked={value === 'private'}
                    className="mt-0.5 accent-blue-500"
                  />
                  <span>
                    <span className="block font-semibold text-white">{label}</span>
                    <span className="block text-white/40">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              Create playbook
            </button>
            <Link
              href="/playbooks"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
