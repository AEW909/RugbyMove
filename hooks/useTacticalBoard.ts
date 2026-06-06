import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay, saveFormation as saveFormationAction } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import type { Formation, FormationCategory, FormationSlot } from '@/lib/board/storage'
import type { Frame, Line, PlayerPosition, Zone, PlayCategory } from '@/types/play'
import type { PanelTab } from '@/components/board/PanelSlideOver'
import { tokens, defaultFrame, inferActivePlayers } from '@/lib/board/defaults'
import { exportGif } from '@/lib/board/exportGif'
import { usePlayback } from '@/hooks/usePlayback'
export { tokens, defaultFrame } from '@/lib/board/defaults'
export type { Token } from '@/lib/board/defaults'
export { SCRUM_FORMATION, LINEOUT_FORMATION } from '@/lib/board/defaults'

// ── Constants ──────────────────────────────────────────────────────────────────

export const DEFAULT_DURATION = 900
export const MIN_DURATION = 200
export const MAX_DURATION = 3000

// ── Pure helpers ───────────────────────────────────────────────────────────────

function normalizeFrame(frame: Partial<Frame> | undefined): Frame {
  return {
    players: Array.isArray(frame?.players) ? frame.players : defaultFrame.players,
    zones: Array.isArray(frame?.zones) ? frame.zones : [],
    lines: Array.isArray(frame?.lines) ? frame.lines : [],
  }
}

function normalizeFrames(nextFrames: Partial<Frame>[] | undefined): Frame[] {
  if (!Array.isArray(nextFrames) || nextFrames.length === 0) {
    return [defaultFrame]
  }
  return nextFrames.map(normalizeFrame)
}

export function normalizeDurations(raw: number[] | undefined, frameCount: number): number[] {
  const needed = Math.max(0, frameCount - 1)
  const base = Array.isArray(raw) ? raw : []
  return Array.from({ length: needed }, (_, i) =>
    Math.min(MAX_DURATION, Math.max(MIN_DURATION, base[i] ?? DEFAULT_DURATION)),
  )
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

function rotatePitchCoords<T extends { x: number; y: number }>(p: T): T {
  return { ...p, x: p.y, y: p.x }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type TacticalBoardProps = {
  initialFrames?: Frame[]
  initialDurations?: number[]
  initialPitchPortrait?: boolean
  initialActivePlayers?: string[]
  playId?: string
  mode?: 'fresh' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playCategory?: PlayCategory
  onFramesChange?: (frames: Frame[]) => void
  viewOnly?: boolean
}

export type UseTacticalBoardReturn = {
  frames: Frame[]
  durations: number[]
  totalDuration: number
  activeFrameIndex: number
  activeFrame: Frame
  visibleZones: Zone[]
  playerById: Map<string, PlayerPosition>
  isPlaying: boolean
  formations: Formation[]
  formationName: string
  setFormationName: (name: string) => void
  formationCategory: FormationCategory
  setFormationCategory: (cat: FormationCategory) => void
  saveStatus: string
  isDirty: boolean
  snapGrid: boolean
  setSnapGrid: Dispatch<SetStateAction<boolean>>
  showFormationModal: boolean
  setShowFormationModal: (show: boolean) => void
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  panelTab: PanelTab
  setPanelTab: (tab: PanelTab) => void
  playbooks: { id: string; name: string }[]
  tool: 'pointer' | 'select' | 'draw'
  setTool: (t: 'pointer' | 'select' | 'draw') => void
  lineColor: string
  lineDashed: boolean
  setLineColor: (color: string) => void
  setLineDashed: (dashed: boolean) => void
  activePlayers: string[]
  addPlayers: (ids: string[]) => void
  addZone: (x: number, y: number) => void
  moveZone: (id: string, x: number, y: number) => void
  resizeZone: (id: string, r: number) => void
  deleteZone: (id: string) => void
  updateZoneLabel: (id: string, label: string) => void
  addLine: (line: Line) => void
  deleteLine: (lineId: string) => void
  selectedPlayerIds: Set<string>
  setSelectedPlayerIds: Dispatch<SetStateAction<Set<string>>>
  setActiveFrameIndex: Dispatch<SetStateAction<number>>
  movePlayer: (id: string, rawX: number, rawY: number) => void
  captureFrame: () => void
  deleteFrame: (index: number) => void
  resetBoard: () => void
  saveFormation: () => void
  loadFormation: (players: PlayerPosition[]) => void
  exportMove: () => void
  isExporting: boolean
  setDuration: (segIndex: number, ms: number) => void
  scrubTo: (timeMs: number) => void
  handleSaveToPlaybook: (playbookId: string, title: string, category: PlayCategory, description: string) => Promise<void>
  handleSaveAsCopy: (playbookId: string, title: string, category: PlayCategory, description: string) => Promise<void>
  pitchPortrait: boolean
  togglePitchPortrait: () => void
  playFrames: () => void
  stopPlayback: () => void
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTacticalBoard({
  initialFrames,
  initialDurations,
  initialPitchPortrait = false,
  initialActivePlayers,
  playId,
  mode = 'saved',
  playTitle = 'rugbymove-move',
  playCategory = 'Other',
}: TacticalBoardProps): UseTacticalBoardReturn {

  // ── State ──────────────────────────────────────────────────────────────────

  const [frames, setFrames] = useState<Frame[]>(() => normalizeFrames(initialFrames))
  const [durations, setDurations] = useState<number[]>(() =>
    normalizeDurations(initialDurations, normalizeFrames(initialFrames).length),
  )
  const [activeFrameIndex, setActiveFrameIndex] = useState(0)
  const [formations, setFormations] = useState<Formation[]>([])
  const [formationName, setFormationName] = useState('')
  const [formationCategory, setFormationCategory] = useState<FormationCategory>('Open Play')
  const [saveStatus, setSaveStatus] = useState('')
  const [snapGrid, setSnapGrid] = useState(false)
  const [showFormationModal, setShowFormationModal] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('formations')
  const [playbooks, setPlaybooks] = useState<{ id: string; name: string }[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [tool, setTool] = useState<'pointer' | 'select' | 'draw'>('pointer')
  const [pitchPortrait, setPitchPortrait] = useState(initialPitchPortrait)
  const [lineColor, setLineColor] = useState('#f8fafc')
  const [lineDashed, setLineDashed] = useState(false)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    if (mode === 'fresh') return []
    if (initialActivePlayers && initialActivePlayers.length > 0) return initialActivePlayers
    if (initialFrames && initialFrames.length > 0) return inferActivePlayers(normalizeFrame(initialFrames[0]))
    return []
  })

  // ── Playback ───────────────────────────────────────────────────────────────

  const { displayPlayers, displayZones, isPlaying, playFrames, stopPlayback, scrubTo } =
    usePlayback({ frames, durations, setActiveFrameIndex })

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalDuration = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations])
  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame
  const visiblePlayers = displayPlayers ?? activeFrame.players
  const visibleZones = displayZones ?? activeFrame.zones ?? []
  const playerById = useMemo(
    () => new Map(visiblePlayers.map((p) => [p.id, p])),
    [visiblePlayers],
  )

  // ── Effects ────────────────────────────────────────────────────────────────

  // Track dirty state after initial render
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      return
    }
    setIsDirty(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, durations])

  // Warn on browser close when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'g' || e.key === 'G') setTool('select')
      if (e.key === 'd' || e.key === 'D') setTool('draw')
      if (e.key === 'p' || e.key === 'P') { setTool('pointer'); setSelectedPlayerIds(new Set()) }
      if (e.key === 'Escape') { setTool('pointer'); setSelectedPlayerIds(new Set()) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Reset to a fresh blank board when mode === 'fresh'
  useEffect(() => {
    if (mode === 'fresh') {
      setFrames([defaultFrame])
      setDurations([])
      setActiveFrameIndex(0)
    }
  }, [mode])

  // Load user data: playbooks and formations
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (!user) return

      supabase
        .from('playbooks')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name')
        .then(({ data }) => setPlaybooks(data ?? []))

      supabase
        .from('formations')
        .select('id,name,category,slots,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(24)
        .then(({ data }) => {
          if (!data) return
          setFormations(data.map((f) => ({
            id: f.id,
            name: f.name,
            category: f.category as FormationCategory,
            slots: f.slots as FormationSlot[],
            createdAt: f.updated_at,
          })))
        })
    })
  }, [])

  // ── Frame operations ───────────────────────────────────────────────────────

  const captureFrame = useCallback(() => {
    setFrames((currentFrames) => {
      const source = currentFrames[activeFrameIndex] ?? defaultFrame
      const nextFrames = [
        ...currentFrames.slice(0, activeFrameIndex + 1),
        {
          players: source.players.map((p) => ({ ...p })),
          zones: (source.zones ?? []).map((z) => ({ ...z })),
          lines: source.lines.map((l) => ({ ...l })),
        },
        ...currentFrames.slice(activeFrameIndex + 1),
      ]
      return normalizeFrames(nextFrames)
    })
    setDurations((prev) => [
      ...prev.slice(0, activeFrameIndex + 1),
      DEFAULT_DURATION,
      ...prev.slice(activeFrameIndex + 1),
    ])
    setActiveFrameIndex((i) => i + 1)
  }, [activeFrameIndex])

  const deleteFrame = useCallback(
    (indexToDelete: number) => {
      stopPlayback()
      if (frames.length <= 1) {
        setFrames([defaultFrame])
        setDurations([])
        setActiveFrameIndex(0)
        return
      }
      const nextFrames = normalizeFrames(frames.filter((_, i) => i !== indexToDelete))
      setFrames(nextFrames)
      setDurations((prev) => {
        const next = prev.filter((_, i) => i !== indexToDelete)
        return normalizeDurations(next, nextFrames.length)
      })
      setActiveFrameIndex((cur) => {
        if (cur > indexToDelete) return cur - 1
        if (cur === indexToDelete) return Math.max(0, cur - 1)
        return Math.min(cur, nextFrames.length - 1)
      })
    },
    [frames, stopPlayback],
  )

  const setDuration = useCallback((segIndex: number, ms: number) => {
    setDurations((prev) => {
      const next = [...prev]
      next[segIndex] = Math.min(MAX_DURATION, Math.max(MIN_DURATION, ms))
      return next
    })
  }, [])

  const resetBoard = useCallback(() => {
    stopPlayback()
    setFrames([defaultFrame])
    setDurations([])
    setActiveFrameIndex(0)
  }, [stopPlayback])

  // ── Player operations ──────────────────────────────────────────────────────

  const movePlayer = useCallback(
    (id: string, rawX: number, rawY: number) => {
      if (isPlaying) return
      const newX = clamp(rawX)
      const newY = clamp(rawY)
      setFrames((currentFrames) =>
        normalizeFrames(
          currentFrames.map((frame, index) => {
            if (index !== activeFrameIndex) return frame
            const dragged = frame.players.find((p) => p.id === id)
            if (tool === 'select' && selectedPlayerIds.has(id) && selectedPlayerIds.size > 1 && dragged) {
              const dx = newX - dragged.x
              const dy = newY - dragged.y
              return {
                ...frame,
                players: frame.players.map((p) =>
                  selectedPlayerIds.has(p.id)
                    ? { ...p, x: clamp(p.x + dx), y: clamp(p.y + dy) }
                    : p,
                ),
              }
            }
            return {
              ...frame,
              players: frame.players.map((p) => (p.id === id ? { ...p, x: newX, y: newY } : p)),
            }
          }),
        ),
      )
    },
    [activeFrameIndex, isPlaying, snapGrid, tool, selectedPlayerIds],
  )

  const addPlayers = useCallback((ids: string[]) => {
    setActivePlayers((prev) => {
      const next = [...(prev ?? [])]
      for (const id of ids) {
        if (!next.includes(id)) next.push(id)
      }
      return next
    })
    setIsDirty(true)
  }, [])

  // ── Zone operations ────────────────────────────────────────────────────────

  const addZone = useCallback((x: number, y: number) => {
    const id = crypto.randomUUID()
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({
        ...frame,
        zones: [...(frame.zones ?? []), { id, x, y, r: 8, label: 'Zone' }],
      })),
    )
  }, [])

  const moveZone = useCallback(
    (id: string, x: number, y: number) => {
      if (isPlaying) return
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) => {
          if (index !== activeFrameIndex) return frame
          return { ...frame, zones: (frame.zones ?? []).map((z) => (z.id === id ? { ...z, x, y } : z)) }
        }),
      )
    },
    [activeFrameIndex, isPlaying],
  )

  const resizeZone = useCallback(
    (id: string, r: number) => {
      if (isPlaying) return
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) => {
          if (index !== activeFrameIndex) return frame
          return { ...frame, zones: (frame.zones ?? []).map((z) => (z.id === id ? { ...z, r } : z)) }
        }),
      )
    },
    [activeFrameIndex, isPlaying],
  )

  const deleteZone = useCallback((id: string) => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({ ...frame, zones: (frame.zones ?? []).filter((z) => z.id !== id) })),
    )
  }, [])

  const updateZoneLabel = useCallback((id: string, label: string) => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({
        ...frame,
        zones: (frame.zones ?? []).map((z) => (z.id === id ? { ...z, label } : z)),
      })),
    )
  }, [])

  // ── Line operations ────────────────────────────────────────────────────────

  const addLine = useCallback(
    (line: Line) => {
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) =>
          index !== activeFrameIndex ? frame : { ...frame, lines: [...frame.lines, line] },
        ),
      )
    },
    [activeFrameIndex],
  )

  const deleteLine = useCallback(
    (lineId: string) => {
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) =>
          index !== activeFrameIndex
            ? frame
            : { ...frame, lines: frame.lines.filter((l) => l.id !== lineId) },
        ),
      )
    },
    [activeFrameIndex],
  )

  // ── Formation operations ───────────────────────────────────────────────────

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName || !userId) return

    const slots: FormationSlot[] = activeFrame.players
      .filter((p) => p.id === 'ball' || activePlayers.includes(p.id))
      .map((p) => {
        const side: FormationSlot['side'] = p.id === 'ball' ? 'ball' : p.id.startsWith('attack-') ? 'attack' : 'defend'
        const pos = pitchPortrait ? rotatePitchCoords(p) : p
        return { side, x: pos.x, y: pos.y }
      })

    saveFormationAction({ name: trimmedName, category: formationCategory, slots })
      .then((data) => {
        if (data) {
          setFormations((prev) =>
            [
              {
                id: data.id,
                name: data.name,
                category: data.category as FormationCategory,
                slots: data.slots as FormationSlot[],
                createdAt: data.updated_at,
              },
              ...prev,
            ].slice(0, 24),
          )
        }
      })
      .catch(() => setSaveStatus('Formation save failed.'))

    setFormationName('')
    setShowFormationModal(false)
  }, [activeFrame.players, activePlayers, formationCategory, formationName, pitchPortrait, userId])

  const loadFormation = useCallback(
    (players: PlayerPosition[]) => {
      stopPlayback()
      const incomingIds = players.filter((p) => p.id !== 'ball').map((p) => p.id)
      if (incomingIds.length > 0) {
        setActivePlayers((prev) => {
          const next = [...(prev ?? [])]
          for (const id of incomingIds) {
            if (!next.includes(id)) next.push(id)
          }
          return next
        })
      }
      setFrames((currentFrames) =>
        normalizeFrames(
          currentFrames.map((frame, index) => {
            if (index !== activeFrameIndex) return frame
            return {
              ...frame,
              players: frame.players.map((player) => {
                const resolved = players.find((p) => p.id === player.id)
                if (!resolved) return player
                return pitchPortrait ? rotatePitchCoords(resolved) : resolved
              }),
            }
          }),
        ),
      )
    },
    [activeFrameIndex, pitchPortrait, stopPlayback],
  )

  // ── Pitch orientation ──────────────────────────────────────────────────────

  const togglePitchPortrait = useCallback(() => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({
        players: frame.players.map(rotatePitchCoords),
        zones: (frame.zones ?? []).map((z) => ({ ...z, x: z.y, y: z.x })),
        lines: frame.lines.map((line) => ({
          ...line,
          from: rotatePitchCoords(line.from),
          to: rotatePitchCoords(line.to),
        })),
      })),
    )
    setPitchPortrait((p) => !p)
  }, [])

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportMove = useCallback(() => {
    if (isExporting) return
    setIsExporting(true)
    exportGif(normalizeFrames(frames), durations, playTitle).finally(() => setIsExporting(false))
  }, [frames, durations, isExporting, playTitle])

  // ── Save to playbook ───────────────────────────────────────────────────────

  const handleSaveToPlaybook = useCallback(
    async (playbookId: string, title: string, category: PlayCategory, description: string) => {
      const normalizedFrames = normalizeFrames(frames)
      try {
        const play = await savePlay({
          id:
            playId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playId)
              ? playId
              : undefined,
          title,
          description: description.trim() || null,
          category: category ?? 'Other',
          animation_data: { frames: normalizedFrames, durations, pitchPortrait: pitchPortrait || undefined, activePlayers },
        })
        const supabase = createClient()
        await supabase
          .from('playbook_plays')
          .upsert({ playbook_id: playbookId, play_id: play.id }, { onConflict: 'playbook_id,play_id' })
        setSaveStatus('Saved to playbook.')
        setIsDirty(false)
      } catch {
        setSaveStatus('Save failed. Please try again.')
      }
    },
    [playId, frames, durations, pitchPortrait, activePlayers],
  )

  const handleSaveAsCopy = useCallback(
    async (playbookId: string, title: string, category: PlayCategory, description: string) => {
      const normalizedFrames = normalizeFrames(frames)
      try {
        const play = await savePlay({
          title,
          description: description.trim() || null,
          category: category ?? 'Other',
          animation_data: { frames: normalizedFrames, durations, pitchPortrait: pitchPortrait || undefined, activePlayers },
        })
        const supabase = createClient()
        await supabase
          .from('playbook_plays')
          .upsert({ playbook_id: playbookId, play_id: play.id }, { onConflict: 'playbook_id,play_id' })
        setSaveStatus('Saved as new copy.')
        setIsDirty(false)
      } catch {
        setSaveStatus('Save failed. Please try again.')
      }
    },
    [frames, durations, pitchPortrait, activePlayers],
  )

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    frames,
    durations,
    totalDuration,
    activeFrameIndex,
    activeFrame,
    visibleZones,
    playerById,
    isPlaying,
    formations,
    formationName,
    setFormationName,
    formationCategory,
    setFormationCategory,
    saveStatus,
    isDirty,
    snapGrid,
    setSnapGrid,
    showFormationModal,
    setShowFormationModal,
    panelOpen,
    setPanelOpen,
    panelTab,
    setPanelTab,
    playbooks,
    tool,
    setTool,
    lineColor,
    lineDashed,
    setLineColor,
    setLineDashed,
    activePlayers,
    addPlayers,
    addZone,
    moveZone,
    resizeZone,
    deleteZone,
    updateZoneLabel,
    addLine,
    deleteLine,
    selectedPlayerIds,
    setSelectedPlayerIds,
    setActiveFrameIndex,
    movePlayer,
    captureFrame,
    deleteFrame,
    resetBoard,
    saveFormation,
    loadFormation,
    exportMove,
    isExporting,
    setDuration,
    scrubTo,
    handleSaveToPlaybook,
    handleSaveAsCopy,
    pitchPortrait,
    togglePitchPortrait,
    playFrames,
    stopPlayback,
  }
}
