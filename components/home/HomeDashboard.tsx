'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardList, FolderOpen, Plus, Rows3 } from 'lucide-react'
import type { Frame, PlayerPosition } from '@/types/play'

type SavedMove = {
  id: string
  title: string
  frames: Frame[]
  updatedAt: string
}

type Formation = {
  id: string
  name: string
  players: PlayerPosition[]
  createdAt: string
}

const movesStorageKey = 'rugbyslate.moves.v1'
const formationsStorageKey = 'rugbyslate.formations.v1'
const pendingFormationStorageKey = 'rugbyslate.pendingFormation.v1'
const pendingMoveStorageKey = 'rugbyslate.pendingMove.v1'

export default function HomeDashboard() {
  const [moves, setMoves] = useState<SavedMove[]>([])
  const [formations, setFormations] = useState<Formation[]>([])

  useEffect(() => {
    try {
      setMoves(JSON.parse(window.localStorage.getItem(movesStorageKey) ?? '[]'))
      setFormations(JSON.parse(window.localStorage.getItem(formationsStorageKey) ?? '[]'))
    } catch {
      setMoves([])
      setFormations([])
    }
  }, [])

  const startFromFormation = (formation: Formation) => {
    window.localStorage.setItem(pendingFormationStorageKey, JSON.stringify(formation))
  }

  const openSavedMove = (move: SavedMove) => {
    window.localStorage.setItem(pendingMoveStorageKey, JSON.stringify(move))
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-emerald-900/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">RugbySlate</h1>
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

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/playbook/new"
            className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar transition hover:-translate-y-0.5"
          >
            <Plus className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Blank move</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the board with every token staged off-pitch.</p>
          </Link>
          <Link
            href="/playbook/demo"
            className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar transition hover:-translate-y-0.5"
          >
            <ClipboardList className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Demo move</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the current two-frame attacking example.</p>
          </Link>
          <div className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-toolbar">
            <Rows3 className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold">Start from formation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Saved shapes appear here once created in the editor.</p>
          </div>
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
            <h2 className="mb-3 text-xl font-semibold">Formations</h2>
            <div className="grid gap-3">
              {formations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  Save formations from the board to start moves faster.
                </div>
              ) : (
                formations.map((formation) => (
                  <Link
                    href="/playbook/new"
                    key={formation.id}
                    onClick={() => startFromFormation(formation)}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
                  >
                    <h3 className="font-semibold">{formation.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">Use as starting positions</p>
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
