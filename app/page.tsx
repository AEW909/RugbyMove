import Link from 'next/link'
import { ClipboardList, PlayCircle } from 'lucide-react'
import TacticalBoard from '@/components/TacticalBoard'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-emerald-900/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">RugbySlate</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Build Rugby Union patterns with draggable players, keyframes, and smooth playback.
            </p>
          </div>
          <Link
            href="/playbook/demo"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <PlayCircle className="h-4 w-4" />
            Open demo play
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <TacticalBoard />
          <aside className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar">
            <ClipboardList className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Coach notes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Drag players into shape, capture frames, and play the sequence back as a tactical animation.
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}
