'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Download, Globe, Layers, Loader2, Lock, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FORMATION_CATEGORIES } from '@/lib/board/storage'
import type { Formation, FormationSlot } from '@/lib/board/storage'
import { createClient } from '@/lib/supabase/client'
import type { PlayCategory, PlayerPosition } from '@/types/play'
import { PLAY_CATEGORIES } from '@/types/play'
import FormationLoadDialog from '@/components/board/FormationLoadDialog'
import { SCRUM_FORMATION, LINEOUT_FORMATION } from '@/lib/board/defaults'

function formationSummary(slots: FormationSlot[]): string {
  const attackCount = slots.filter((s) => s.side === 'attack').length
  const defendCount = slots.filter((s) => s.side === 'defend').length
  const hasBall = slots.some((s) => s.side === 'ball')
  const parts: string[] = []
  if (attackCount > 0) parts.push(`${attackCount} att`)
  if (defendCount > 0) parts.push(`${defendCount} def`)
  if (hasBall) parts.push('ball')
  return parts.join(' · ') || 'No players'
}

type Playbook = {
  id: string
  name: string
}

type PlayItem = {
  id: string
  title: string
  category: string
}

export type PanelTab = 'formations' | 'playbooks' | 'save'

type Props = {
  isOpen: boolean
  onClose: () => void
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
  formations: Formation[]
  playbooks: Playbook[]
  onLoadFormation: (players: PlayerPosition[]) => void
  onOpenSaveFormation: () => void
  playCategory?: PlayCategory
  onSaveToPlaybook: (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) => void
  onSaveAsCopy: (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) => void
  onLoadPlay: (playId: string) => void
  onExport: () => void
  isExporting: boolean
  initialTitle: string
  initialDescription?: string | null
  initialIsPublic?: boolean
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
  playCategory,
  onSaveToPlaybook,
  onSaveAsCopy,
  onLoadPlay,
  onExport,
  isExporting,
  initialTitle,
  initialDescription,
  initialIsPublic = false,
  saveStatus,
}: Props) {
  const [saveTitle, setSaveTitle] = useState(initialTitle)
  const [saveDescription, setSaveDescription] = useState(initialDescription ?? '')
  const [saveIsPublic, setSaveIsPublic] = useState(initialIsPublic)
  const [saveCategory, setSaveCategory] = useState<PlayCategory>(playCategory ?? 'Other')
  const [selectedPlaybook, setSelectedPlaybook] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FORMATION_CATEGORIES),
  )
  const [selectedPlaybookId, setSelectedPlaybookId] = useState('')
  const [playbookPlays, setPlaybookPlays] = useState<PlayItem[]>([])
  const [playsLoading, setPlaysLoading] = useState(false)
  const [loadingFormation, setLoadingFormation] = useState<Formation | null>(null)
  const prevSaveStatus = useRef(saveStatus)
  useEffect(() => {
    if (saveStatus !== prevSaveStatus.current) {
      setIsSaving(false)
      setIsCopying(false)
      prevSaveStatus.current = saveStatus
    }
  }, [saveStatus])

  useEffect(() => {
    setSaveTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    setSaveDescription(initialDescription ?? '')
  }, [initialDescription])

  useEffect(() => {
    setSaveIsPublic(initialIsPublic ?? false)
  }, [initialIsPublic])

  useEffect(() => {
    if (playCategory) setSaveCategory(playCategory)
  }, [playCategory])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handlePlaybookSelect = async (id: string) => {
    setSelectedPlaybookId(id)
    setPlaybookPlays([])
    if (!id) return
    setPlaysLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('playbook_plays')
      .select('play_id, sort_order, plays(id, title, category)')
      .eq('playbook_id', id)
      .order('sort_order')
    setPlaybookPlays(
      (data ?? [])
        .map((row) => {
          const p = row.plays as unknown as PlayItem | null
          return p ? { id: p.id, title: p.title, category: p.category } : null
        })
        .filter((p): p is PlayItem => p !== null),
    )
    setPlaysLoading(false)
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
              { id: 'playbooks', label: 'Playbooks', Icon: BookOpen },
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

              {/* Built-in formations */}
              <div className="overflow-hidden rounded-xl border border-emerald-500/20">
                <div className="bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  Built-in
                </div>
                {[SCRUM_FORMATION, LINEOUT_FORMATION].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLoadingFormation(f)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-white/5"
                  >
                    <span>
                      <span className="block font-medium text-white/80">{f.name}</span>
                      <span className="text-xs text-white/35">{formationSummary(f.slots)}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-emerald-400">Load →</span>
                  </button>
                ))}
              </div>

              {formations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  No saved formations yet. Arrange your players then click &ldquo;Save current&rdquo;.
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
                              onClick={() => setLoadingFormation(f)}
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-white/5"
                            >
                              <span>
                                <span className="block font-medium text-white/80">{f.name}</span>
                                <span className="text-xs text-white/35">{formationSummary(f.slots)}</span>
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-blue-400">
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

          {/* ── Playbooks tab ── */}
          {activeTab === 'playbooks' && (
            <div className="flex flex-col gap-4 p-4">
              {playbooks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  <a href="/playbooks/new" className="font-semibold text-blue-400 hover:text-blue-300">
                    Create a playbook
                  </a>{' '}
                  first.
                </div>
              ) : (
                <>
                  <select
                    value={selectedPlaybookId}
                    onChange={(e) => handlePlaybookSelect(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 [&>option]:bg-zinc-900"
                  >
                    <option value="">Select a playbook…</option>
                    {playbooks.map((pb) => (
                      <option key={pb.id} value={pb.id}>{pb.name}</option>
                    ))}
                  </select>

                  {playsLoading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                    </div>
                  )}

                  {!playsLoading && selectedPlaybookId && playbookPlays.length === 0 && (
                    <p className="text-sm text-white/40">No moves in this playbook yet.</p>
                  )}

                  {!playsLoading && playbookPlays.length > 0 && (
                    <ul className="space-y-1.5">
                      {playbookPlays.map((play) => (
                        <li key={play.id}>
                          <button
                            type="button"
                            onClick={() => { onLoadPlay(play.id); onClose() }}
                            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                          >
                            <span>
                              <span className="block font-medium text-white">{play.title}</span>
                              <span className="text-xs text-white/40">{play.category}</span>
                            </span>
                            <span className="text-xs font-semibold text-blue-400">Open →</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
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

              <label className="block text-sm font-semibold text-white/80">
                Description
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Optional notes about this move…"
                  rows={2}
                  maxLength={2000}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              </label>

              <label className="block text-sm font-semibold text-white/80">
                Category
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as PlayCategory)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm font-normal text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 [&>option]:bg-zinc-900"
                >
                  {PLAY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-white/80">
                Description{' '}
                <span className="font-normal text-white/30">(optional)</span>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Brief description of this move…"
                  rows={2}
                  maxLength={2000}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-white/80">Visibility</legend>
                <div className="mt-2 flex gap-2">
                  {([
                    { value: false, label: 'Private', Icon: Lock },
                    { value: true,  label: 'Public',  Icon: Globe },
                  ] as const).map(({ value, label, Icon }) => (
                    <label
                      key={label}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                        saveIsPublic === value
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        className="sr-only"
                        checked={saveIsPublic === value}
                        onChange={() => setSaveIsPublic(value)}
                      />
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

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
                  onClick={() => { setIsSaving(true); onSaveToPlaybook(selectedPlaybook, saveTitle.trim(), saveCategory, saveDescription.trim(), saveIsPublic) }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSaving ? 'Saving…' : 'Save to playbook'}
                </button>
                <button
                  type="button"
                  disabled={!selectedPlaybook || !saveTitle.trim() || isCopying}
                  onClick={() => { setIsCopying(true); onSaveAsCopy(selectedPlaybook, saveTitle.trim(), saveCategory, saveDescription.trim(), saveIsPublic) }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                >
                  {isCopying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCopying ? 'Saving…' : 'Save as copy'}
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
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download GIF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {loadingFormation && (
        <FormationLoadDialog
          formation={loadingFormation}
          onLoad={(players: PlayerPosition[]) => {
            onLoadFormation(players)
            setLoadingFormation(null)
            onClose()
          }}
          onClose={() => setLoadingFormation(null)}
        />
      )}
    </>
  )
}
