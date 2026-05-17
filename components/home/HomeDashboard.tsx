'use client'

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
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-emerald-900/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">RugbyMove</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Build moves from scratch, reuse starting formations, and keep variations for match-week planning.
            </p>
          </div>
          <Link
            href="/playbook/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Start from scratch
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white"
          >
            Account
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/playbook/new"
            className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar transition hover:-translate-y-0.5"
          >
            <Plus className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Blank move</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the board with every token staged off-pitch.</p>
          </Link>
          <Link
            href="/playbooks"
            className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar transition hover:-translate-y-0.5"
          >
            <BookOpen className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Playbooks</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Organise moves into shareable collections for your squad.</p>
          </Link>
          <Link
            href="/account"
            className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar transition hover:-translate-y-0.5"
          >
            <ClipboardList className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">View your saved moves and manage your account.</p>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold">Saved moves</h2>
            </div>
            <div className="grid gap-3">
              {moves.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  No saved moves yet.
                </div>
              ) : (
                moves.map((move) => (
                  <Link
                    href="/playbook/local"
                    key={move.id}
                    onClick={() => openSavedMove(move)}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
                  >
                    <h3 className="font-semibold">{move.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {move.frames.length} frame{move.frames.length === 1 ? '' : 's'} saved locally
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <aside>
            <h2 className="mb-1 text-xl font-semibold">Formations</h2>
            <p className="mb-3 text-sm text-slate-500">Saved starting positions. Click one to open a new move with players pre-arranged.</p>
            <div className="grid gap-3">
              {formations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  Set up your players on the board, then use &ldquo;Save as formation&rdquo; to store starting positions for scrums, lineouts, and more.
                </div>
              ) : (
                formations.map((formation) => (
                  <Link
                    href="/playbook/new"
                    key={formation.id}
                    onClick={() => startFromFormation(formation)}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{formation.name}</h3>
                      {formation.category && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {formation.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Tap to start a new move from this position</p>
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
