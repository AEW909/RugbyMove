import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PlaybookOrganiser from '@/components/playbooks/PlaybookOrganiser'

type PageProps = { params: { id: string } }

export default async function OrganisePage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  // Only owner can organise
  if (playbook.owner_id !== user.id) redirect(`/playbooks/${params.id}`)

  const { data: playbookPlaysRows } = await supabase
    .from('playbook_plays')
    .select('play_id, sort_order, plays(id, title, category)')
    .eq('playbook_id', params.id)
    .order('sort_order')

  const orderedPlays = (playbookPlaysRows ?? [])
    .map((row) => {
      const p = row.plays as unknown as { id: string; title: string; category: string } | null
      return p ? { id: p.id, title: p.title, category: p.category } : null
    })
    .filter((p): p is { id: string; title: string; category: string } => p !== null)

  const playbookPlayIds = new Set(orderedPlays.map((p) => p.id))

  const { data: allUserPlays } = await supabase
    .from('plays')
    .select('id, title, category')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const availablePlays = (allUserPlays ?? [])
    .filter((p) => !playbookPlayIds.has(p.id))
    .map((p) => ({ id: p.id, title: p.title, category: p.category as string }))

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href={`/playbooks/${params.id}`}
          className="text-sm font-medium text-white/40 transition-colors hover:text-white"
        >
          ← {playbook.name}
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Organise playbook
            </h1>
            <p className="mt-0.5 text-sm text-white/50">
              Drag to reorder. Click + to add, × to remove.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <PlaybookOrganiser
            playbookId={params.id}
            orderedPlays={orderedPlays}
            availablePlays={availablePlays}
          />
        </div>
      </div>
    </main>
  )
}
