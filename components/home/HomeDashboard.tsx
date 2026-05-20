'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen, ClipboardList, FolderOpen, Plus } from 'lucide-react'
import { storageKeys } from '@/lib/board/storage'
import type { Formation, SavedMove } from '@/lib/board/storage'

export default function HomeDashboard() {
  const [moves, setMoves] = useState<SavedMove[]>([])
  const [formations, setFormations] = useState<Formation[]>([])

  useEffect(() => {
    try {
      setMoves(JSON.parse(window.localStorage.getItem(storageKeys.moves) ?? '[]'))
      setFormations(JSON.parse(window.localStorage.getItem(storageKeys.formations) ?? '[]'))
    } catch {
      setMoves([])
      setFormations([])
    }
  }, [])

  const startFromFormation = (formation: Formation) => {
    window.localStorage.setItem(storageKeys.pendingFormation, JSON.stringify(formation))
  }

  const openSavedMove = (move: SavedMove) => {
    window.localStorage.setItem(storageKeys.pendingMove, JSON.stringify(move))
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-6 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo-wordmark.png" alt="RugbyMove" width={320} height={80} className="h-12 w-auto sm:h-16" priority />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
              Build moves from scratch, reuse starting formations, and keep variations for match-week planning.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Account
            </Link>
            <Link
              href="/playbook/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Start from scratch
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/playbook/new"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/[0.08]"
          >
            <Plus className="h-6 w-6 text-blue-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Blank move</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Open the board with every token staged off-pitch.</p>
          </Link>
          <Link
            href="/playbooks"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/[0.08]"
          >
            <BookOpen className="h-6 w-6 text-blue-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Playbooks</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Organise moves into shareable collections for your squad.</p>
          </Link>
          <Link
            href="/account"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/[0.08]"
          >
            <ClipboardList className="h-6 w-6 text-blue-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Account</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">View your saved moves and manage your account.</p>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Saved moves</h2>
            </div>
            <div className="grid gap-3">
              {moves.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                  No saved moves yet.
                </div>
              ) : (
                moves.map((move) => (
                  <Link
                    href="/playbook/local"
                    key={move.id}
                    onClick={() => openSavedMove(move)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                  >
                    <h3 className="font-semibold text-white">{move.title}</h3>
                    <p className="mt-1 text-sm text-white/60">
                      {move.frames.length} frame{move.frames.length === 1 ? '' : 's'} saved locally
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <aside>
            <h2 className="mb-1 text-xl font-semibold text-white">Formations</h2>
            <p className="mb-3 text-sm text-white/60">Saved starting positions. Click one to open a new move with players pre-arranged.</p>
            <div className="grid gap-3">
              {formations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                  Set up your players on the board, then use &ldquo;Save as formation&rdquo; to store starting positions for scrums, lineouts, and more.
                </div>
              ) : (
                formations.map((formation) => (
                  <Link
                    href="/playbook/new"
                    key={formation.id}
                    onClick={() => startFromFormation(formation)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-white">{formation.name}</h3>
                      {formation.category && (
                        <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                          {formation.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/60">Tap to start a new move from this position</p>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
