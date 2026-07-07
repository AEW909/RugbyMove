import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Key, Lock, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'
import {
  Badge,
  Banner,
  Collapsible,
  FormField,
  Input,
  Select,
  SubmitButton,
  Textarea,
  buttonVariants,
} from '@/components/ui'
import {
  addMember,
  removeMember,
  setPlaybookJoinCode,
  updatePlaybook,
} from '@/app/actions/playbooks'
import DeletePlaybookButton from '@/components/playbooks/DeletePlaybookButton'
import PlaybookMovesSection from '@/components/playbooks/PlaybookMovesSection'
import type { PlayCategory } from '@/types/play'
import { PLAY_CATEGORIES } from '@/types/play'

type PageProps = {
  params: { id: string }
  searchParams: { message?: string; error?: string; category?: string }
}

const CATEGORY_LABEL: Record<PlayCategory, string> = {
  Scrum: 'Scrum',
  Lineout: 'Lineout',
  'Open Play': 'Open Play',
  Penalty: 'Penalty',
  'Kick Off': 'Kick Off',
  Other: 'Other',
}

const visibilityOptions = [
  { value: 'private', label: 'Private', desc: 'Only you', Icon: Lock },
  { value: 'team',    label: 'Team',    desc: 'Members you invite', Icon: Users },
] as const

export default async function PlaybookDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const activeCategory = PLAY_CATEGORIES.includes(searchParams.category as PlayCategory)
    ? (searchParams.category as PlayCategory)
    : null

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  const isOwner = playbook.owner_id === user.id

  const { data: members } = await supabase
    .from('playbook_members')
    .select('id, user_id, role, profiles(username)')
    .eq('playbook_id', params.id)
    .order('joined_at')

  const currentMember = members?.find((m) => m.user_id === user.id)
  const canManage = isOwner || currentMember?.role === 'editor'

  const { data: playbookPlaysRows } = await supabase
    .from('playbook_plays')
    .select('play_id, sort_order, plays(id, title, category)')
    .eq('playbook_id', params.id)
    .order('sort_order')

  const playbookPlayIds = new Set((playbookPlaysRows ?? []).map((r) => r.play_id))

  const { data: allUserPlays } = canManage
    ? await supabase
        .from('plays')
        .select('id, title, category')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const availablePlays = (allUserPlays ?? []).filter((p) => !playbookPlayIds.has(p.id))

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <AppHeader backHref="/playbooks" backLabel="Playbooks" />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-7 w-7 shrink-0 text-blue-400" />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{playbook.name}</h1>
              {playbook.description && (
                <p className="mt-1 text-sm text-white/60">{playbook.description}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/portal/${params.id}`} className={buttonVariants('secondary')}>
              Player view
            </Link>
            {isOwner && (
              <Link href={`/playbooks/${params.id}/organise`} className={buttonVariants('secondary')}>
                Organise
              </Link>
            )}
          </div>
        </div>

        {searchParams.message && (
          <Banner tone="success" className="mt-4">{searchParams.message}</Banner>
        )}
        {searchParams.error && (
          <Banner tone="error" className="mt-4">{searchParams.error}</Banner>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Left column: moves */}
          <PlaybookMovesSection
            playbookId={params.id}
            plays={(playbookPlaysRows ?? [])
              .map((row) => {
                const p = row.plays as unknown as { id: string; title: string; category: string } | null
                return p ? { id: p.id, title: p.title, category: p.category } : null
              })
              .filter((p): p is { id: string; title: string; category: string } => p !== null)}
            canManage={canManage}
            availablePlays={availablePlays.map((p) => ({ id: p.id, title: p.title, category: p.category as string }))}
            activeCategory={activeCategory}
            categories={PLAY_CATEGORIES}
            categoryLabel={CATEGORY_LABEL}
          />

          {/* Right column: collapsible panels */}
          <aside className="space-y-3">

            {/* Members panel */}
            <Collapsible
              summary={
                <>
                  Members
                  {members && members.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-white/40">{members.length + 1}</span>
                  )}
                </>
              }
            >
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-white">{isOwner ? 'You' : '(owner)'}</span>
                  <Badge tone="blue">owner</Badge>
                </li>

                {members?.map((m) => {
                  const profile = m.profiles as unknown as { username: string | null } | null
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-white/80">
                        {profile?.username ?? m.user_id.slice(0, 8)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge>{m.role}</Badge>
                        {canManage && (
                          <form action={removeMember}>
                            <input type="hidden" name="playbook_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button
                              type="submit"
                              aria-label="Remove member"
                              className="rounded-lg p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  )
                })}

                {(!members || members.length === 0) && (
                  <li className="text-sm text-white/40">No members yet.</li>
                )}
              </ul>

              {canManage && (
                <form action={addMember} className="mt-5 space-y-3 border-t border-white/10 pt-4">
                  <input type="hidden" name="playbook_id" value={params.id} />
                  <FormField htmlFor="username" label="Add by username">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="e.g. coach_jones"
                    />
                  </FormField>
                  <FormField htmlFor="role" label="Role">
                    <Select id="role" name="role">
                      <option value="viewer">Player (view only)</option>
                      <option value="editor">Coach (can edit)</option>
                    </Select>
                  </FormField>
                  <SubmitButton pendingLabel="Adding…" className="w-full">
                    Add member
                  </SubmitButton>
                </form>
              )}

              {isOwner && (
                <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                    Join code
                  </p>
                  <p className="text-xs text-white/40">
                    Anyone with this code can join as a viewer from{' '}
                    <Link href="/join" className="font-semibold text-blue-400 hover:text-blue-300">
                      /join
                    </Link>
                    .
                  </p>
                  {playbook.join_code ? (
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-mono font-bold tracking-widest text-white/70">
                        {playbook.join_code}
                      </code>
                      <form action={setPlaybookJoinCode}>
                        <input type="hidden" name="playbook_id" value={params.id} />
                        <button type="submit" className="text-xs text-white/40 transition hover:text-white/70">
                          Regenerate
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={setPlaybookJoinCode}>
                      <input type="hidden" name="playbook_id" value={params.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Generate join code
                      </button>
                    </form>
                  )}
                </div>
              )}
            </Collapsible>

            {/* Settings panel (owner only) */}
            {isOwner && (
              <Collapsible summary="Settings">
                <form action={updatePlaybook} className="space-y-4">
                  <input type="hidden" name="id" value={params.id} />

                  <FormField htmlFor="name" label="Name">
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      maxLength={120}
                      defaultValue={playbook.name}
                    />
                  </FormField>

                  <FormField htmlFor="description" label="Description" optional>
                    <Textarea
                      id="description"
                      name="description"
                      rows={2}
                      maxLength={2000}
                      defaultValue={playbook.description ?? ''}
                    />
                  </FormField>

                  <fieldset>
                    <legend className="block text-sm font-semibold text-white/80">
                      Visibility
                    </legend>
                    <div className="mt-2 space-y-2">
                      {visibilityOptions.map(({ value, label, desc, Icon }) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={value}
                            defaultChecked={playbook.visibility === value}
                            className="mt-0.5 accent-blue-500"
                          />
                          <span>
                            <span className="flex items-center gap-1 font-semibold text-white">
                              <Icon className="h-3 w-3" />
                              {label}
                            </span>
                            <span className="block text-white/40">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="flex items-center gap-3 pt-1">
                    <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                    <DeletePlaybookButton
                      playbookId={params.id}
                      playbookName={playbook.name}
                    />
                  </div>
                </form>
              </Collapsible>
            )}

          </aside>
        </div>
      </div>
    </main>
  )
}
