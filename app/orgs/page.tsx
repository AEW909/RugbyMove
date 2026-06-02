import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'
import type { OrgRole } from '@/types/play'

const roleLabel: Record<OrgRole, string> = {
  head_coach: 'Head Coach',
  coach: 'Coach',
  player: 'Player',
}

export default async function OrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from('org_members')
    .select('role, organisations(id, name, description)')
    .eq('user_id', user.id)
    .order('joined_at')

  const orgs = (memberships ?? []).map((m) => ({
    role: m.role as OrgRole,
    org: m.organisations as unknown as { id: string; name: string; description: string | null } | null,
  })).filter((m) => m.org !== null)

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <AppHeader />
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-white">Organisations</h1>
          <Link
            href="/orgs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New org
          </Link>
        </div>

        <div className="mt-8">
          {orgs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-white/20" />
              <p className="text-sm font-semibold text-white/40">No organisations yet</p>
              <p className="mt-1 text-sm text-white/30">Create one to start managing a team.</p>
              <Link
                href="/orgs/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create organisation
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orgs.map(({ org, role }) => (
                <li key={org!.id}>
                  <Link
                    href={`/org/${org!.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{org!.name}</p>
                      {org!.description && (
                        <p className="mt-0.5 truncate text-sm text-white/40">{org!.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/50">
                      {roleLabel[role]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
