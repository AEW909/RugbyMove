'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, FolderOpen, Plus } from 'lucide-react'
import type { FormationSlot } from '@/lib/board/storage'

type CloudPlay = { id: string; title: string; category: string; updated_at: string }
type CloudPlaybook = { id: string; name: string }
type CloudFormation = { id: string; name: string; category: string; slots: FormationSlot[]; createdAt: string }

type Props = {
  cloudPlays: CloudPlay[]
  cloudPlaybooks: CloudPlaybook[]
  cloudFormations: CloudFormation[]
}

export default function HomeDashboard({ cloudPlays, cloudPlaybooks, cloudFormations }: Props) {
  const router = useRouter()

  const startFromFormation = (formation: CloudFormation) => {
    router.push(`/playbook/new?formation_id=${formation.id}`)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-6 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
            <Image src="/logo-icon.png" alt="RugbyMove" width={40} height={40} className="rounded-xl" />
            <Image src="/logo-text.png" alt="" width={120} height={30} className="hidden sm:block" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Account
            </Link>
            <Link
              href="/playbook/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New move
            </Link>
          </div>
        </header>

        {/* Quick actions */}
        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/playbook/new"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
          >
            <Plus className="h-5 w-5 text-blue-400" />
            <h2 className="mt-3 font-semibold text-white">Blank move</h2>
            <p className="mt-1 text-sm text-white/50">Fresh board, all tokens staged off-pitch.</p>
          </Link>
          <Link
            href="/playbooks"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
          >
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h2 className="mt-3 font-semibold text-white">Playbooks</h2>
            <p className="mt-1 text-sm text-white/50">Organise moves into shareable collections.</p>
          </Link>
        </section>

        {/* Main content grid */}
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left: moves */}
          <div className="space-y-6">

            {/* Cloud plays */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Your moves</h2>
                <span className="ml-auto text-sm text-white/40">{cloudPlays.length}</span>
              </div>
              {cloudPlays.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                  No saved moves yet.{' '}
                  <Link href="/playbook/new" className="font-semibold text-blue-400 hover:text-blue-300">
                    Start a new move
                  </Link>{' '}
                  and save it to your account.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {cloudPlays.map((play) => (
                    <Link
                      key={play.id}
                      href={`/playbook/${play.id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white">{play.title}</h3>
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-white/50">
                          {play.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
                          new Date(play.updated_at),
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">

            {/* Playbooks */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Playbooks</h2>
                <Link
                  href="/playbooks/new"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  + New
                </Link>
              </div>
              {cloudPlaybooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  No playbooks yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {cloudPlaybooks.map((pb) => (
                    <Link
                      key={pb.id}
                      href={`/playbooks/${pb.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition hover:bg-white/[0.08]"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-blue-400" />
                      <span className="truncate text-sm font-medium text-white">{pb.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Formations */}
            <div>
              <h2 className="mb-1 text-lg font-semibold text-white">Formations</h2>
              <p className="mb-3 text-xs text-white/50">
                Saved starting positions. Click to open a new move pre-arranged.
              </p>
              {cloudFormations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  No formations saved yet. Arrange players on the board then save.
                </div>
              ) : (
                <div className="grid gap-2">
                  {cloudFormations.map((cloudFormation) => (
                    <button
                      type="button"
                      key={cloudFormation.id}
                      onClick={() => startFromFormation(cloudFormation)}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition hover:bg-white/[0.08] text-left w-full"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white/90">{cloudFormation.name}</span>
                        {cloudFormation.category && (
                          <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                            {cloudFormation.category}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
