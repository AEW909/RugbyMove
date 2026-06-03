'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Layers, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FORMATION_CATEGORIES } from '@/lib/board/storage'
import type { Formation } from '@/lib/board/storage'

type Playbook = {
  id: string
  name: string
}

export type PanelTab = 'formations' | 'save'

type Props = {
  isOpen: boolean
  onClose: () => void
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  formations: Formation[]
  playbooks: Playbook[]
  onLoadFormation: (formation: Formation) => void
  onOpenSaveFormation: () => void
  onSaveToPlaybook: (playbookId: string, title: string) => void
  onExport: () => void
  initialTitle: string
  saveStatus: string
}

export default function PanelSlideOver({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  formations,
  playbooks,
  onLoadFormation,
  onOpenSaveFormation,
  onSaveToPlaybook,
  onExport,
  initialTitle,
  saveStatus,
}: Props) {
  const [saveTitle, setSaveTitle] = useState(initialTitle)
  const [selectedPlaybook, setSelectedPlaybook] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FORMATION_CATEGORIES),
  )
  const prevSaveStatus = useRef(saveStatus)
  useEffect(() => {
    if (saveStatus !== prevSaveStatus.current) {
      setIsSaving(false)
      prevSaveStatus.current = saveStatus
    }
  }, [saveStatus])

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Play panel"
      >
        {/* Tab bar */}
        <div className="flex shrink-0 items-stretch border-b border-white/10">
          {(
            [
              { id: 'formations', label: 'Formations', Icon: Layers },
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
                  ? 'border-b-2 border-blue-400 text-blue-400'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="px-3 text-white/30 transition hover:text-white/70"
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
                <p className="text-sm text-white/50">Load a saved starting position.</p>
                <button
                  type="button"
                  onClick={onOpenSaveFormation}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                >
                  + Save current
                </button>
              </div>

              {formations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  No formations yet. Arrange your players then click &ldquo;Save current&rdquo;.
                </div>
              ) : (
                FORMATION_CATEGORIES.map((cat) => {
                  const items = formations.filter((f) => f.category === cat)
                  if (items.length === 0) return null
                  const expanded = expandedCategories.has(cat)
                  return (
                    <div key={cat} className="overflow-hidden rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="flex w-full items-center justify-between bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        <span>
                          {cat}
                          <span className="ml-1.5 text-xs font-normal text-white/40">
                            ({items.length})
                          </span>
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        )}
                      </button>
                      {expanded && (
                        <div className="divide-y divide-white/5">
                          {items.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                onLoadFormation(f)
                                onClose()
                              }}
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-white/5"
                            >
                              <span className="font-medium text-white/80">{f.name}</span>
                              <span className="text-xs font-semibold text-blue-400">
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

          {/* ── Save tab ── */}
          {activeTab === 'save' && (
            <div className="relative flex flex-col gap-4 p-4">
              <label className="block text-sm font-semibold text-white/80">
                Title
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Untitled move"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              </label>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-white/80">Save to playbook</p>
                <select
                  value={selectedPlaybook}
                  onChange={(e) => setSelectedPlaybook(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 [&>option]:bg-zinc-900"
                >
                  <option value="">Select a playbook…</option>
                  {playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
                {playbooks.length === 0 && (
                  <p className="mt-2 text-xs text-white/40">
                    <a
                      href="/playbooks/new"
                      className="font-semibold text-blue-400 hover:text-blue-300"
                    >
                      Create a playbook
                    </a>{' '}
                    first.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!selectedPlaybook || !saveTitle.trim() || isSaving}
                  onClick={() => { setIsSaving(true); onSaveToPlaybook(selectedPlaybook, saveTitle.trim()) }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSaving ? 'Saving…' : 'Save to playbook'}
                </button>
              </div>

              {saveStatus && (
                <p className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  saveStatus.toLowerCase().includes('failed') || saveStatus.toLowerCase().includes('error')
                    ? 'border-red-500/20 bg-red-500/10 text-red-300'
                    : 'border-green-500/20 bg-green-500/10 text-green-300'
                }`}>
                  {saveStatus}
                </p>
              )}

              <div className="border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/30">
                  Export
                </p>
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
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
