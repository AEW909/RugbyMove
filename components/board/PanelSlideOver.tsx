'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Download, Layers, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FORMATION_CATEGORIES } from '@/lib/board/storage'
import type { Formation, SavedMove } from '@/lib/board/storage'
import type { Frame } from '@/types/play'

type SavedPlay = SavedMove

type Playbook = {
  id: string
  name: string
}

export type PanelTab = 'formations' | 'plays' | 'save'

type Props = {
  isOpen: boolean
  onClose: () => void
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  formations: Formation[]
  savedPlays: SavedPlay[]
  playbooks: Playbook[]
  onLoadFormation: (formation: Formation) => void
  onOpenSaveFormation: () => void
  onLoadPlay: (play: SavedPlay) => void
  onSaveToPlaybook: (playbookId: string, title: string) => void
  onSaveLocally: (title: string) => void
  onExport: () => void
  initialTitle: string
  saveStatus: string
  isGuest?: boolean
}


export default function PanelSlideOver({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  formations,
  savedPlays,
  playbooks,
  onLoadFormation,
  onOpenSaveFormation,
  onLoadPlay,
  onSaveToPlaybook,
  onSaveLocally,
  onExport,
  initialTitle,
  saveStatus,
  isGuest = false,
}: Props) {
  const [saveTitle, setSaveTitle] = useState(initialTitle)
  const [selectedPlaybook, setSelectedPlaybook] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FORMATION_CATEGORIES),
  )

  useEffect(() => {
    setSaveTitle(initialTitle)
  }, [initialTitle])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const GuestOverlay = () => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-white/90 p-6 text-center backdrop-blur-[2px]">
      <p className="text-sm font-semibold text-slate-700">
        Log in or create an account to save your work.
      </p>
      <div className="flex gap-3">
        <a
          href="/login"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Log in
        </a>
        <a
          href="/signup"
          className="rounded-lg border-2 border-slate-950 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
        >
          Create account
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Play panel"
      >
        {/* Tab bar */}
        <div className="flex shrink-0 items-stretch border-b border-slate-200">
          {(
            [
              { id: 'formations', label: 'Formations', Icon: Layers },
              { id: 'plays', label: 'Plays', Icon: BookOpen },
              { id: 'save', label: 'Save', Icon: Save },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition',
                activeTab === id
                  ? 'border-b-2 border-emerald-700 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="px-3 text-slate-400 transition hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Formations tab ── */}
          {activeTab === 'formations' && (
            <div className="flex flex-col gap-3 p-4">
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">Load a saved starting position.</p>
                {isGuest ? (
                  <div className="group relative">
                    <button
                      type="button"
                      disabled
                      className="shrink-0 rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400"
                    >
                      + Save current
                    </button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block">
                      <p className="text-xs text-slate-600">
                        <a href="/login" className="font-semibold text-emerald-700">Log in</a> or{' '}
                        <a href="/signup" className="font-semibold text-emerald-700">create an account</a> to save formations.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSaveFormation}
                    className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    + Save current
                  </button>
                )}
              </div>

              {formations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No formations yet. Arrange your players then click &ldquo;Save current&rdquo;.
                </div>
              ) : (
                FORMATION_CATEGORIES.map((cat) => {
                  const items = formations.filter((f) => f.category === cat)
                  if (items.length === 0) return null
                  const expanded = expandedCategories.has(cat)
                  return (
                    <div key={cat} className="overflow-hidden rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <span>
                          {cat}
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            ({items.length})
                          </span>
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      {expanded && (
                        <div className="divide-y divide-slate-100">
                          {items.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                onLoadFormation(f)
                                onClose()
                              }}
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-emerald-50"
                            >
                              <span className="font-medium text-slate-800">{f.name}</span>
                              <span className="text-xs font-semibold text-emerald-700">
                                Load →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── Plays tab ── */}
          {activeTab === 'plays' && (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm text-slate-500">
                Load a previously saved play onto the board.
              </p>
              {savedPlays.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No saved plays yet. Use the Save tab to store your current move.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {savedPlays.map((play) => (
                    <button
                      key={play.id}
                      type="button"
                      onClick={() => {
                        onLoadPlay(play)
                        onClose()
                      }}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{play.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {play.frames.length} frame{play.frames.length !== 1 ? 's' : ''} ·{' '}
                          {new Date(play.updatedAt).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-emerald-700">
                        Load →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Save tab ── */}
          {activeTab === 'save' && (
            <div className="relative flex flex-col gap-4 p-4">
              {isGuest && <GuestOverlay />}
              <label className="block text-sm font-semibold text-slate-700">
                Title
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Untitled move"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-700"
                />
              </label>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Save to playbook</p>
                <select
                  value={selectedPlaybook}
                  onChange={(e) => setSelectedPlaybook(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-700"
                >
                  <option value="">Select a playbook…</option>
                  {playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
                {playbooks.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    <a
                      href="/playbooks/new"
                      className="font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      Create a playbook
                    </a>{' '}
                    first.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!selectedPlaybook || !saveTitle.trim()}
                  onClick={() => onSaveToPlaybook(selectedPlaybook, saveTitle.trim())}
                  className="mt-3 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                >
                  Save to playbook
                </button>
              </div>

              <button
                type="button"
                disabled={!saveTitle.trim()}
                onClick={() => onSaveLocally(saveTitle.trim())}
                className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Save locally only
              </button>

              {saveStatus && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {saveStatus}
                </p>
              )}

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Export
                </p>
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download SVG
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
