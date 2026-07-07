import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { saveFormation as saveFormationAction, savePlayToPlaybook } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import type { Formation, FormationCategory, FormationSlot } from '@/lib/board/storage'
import type { Frame, Line, PlayerPosition, Zone, PlayCategory } from '@/types/play'
import type { PanelTab } from '@/components/board/PanelSlideOver'
import { tokens, defaultFrame, playersMovedFromDefault } from '@/lib/board/defaults'
import {
  DEFAULT_DURATION,
  MIN_DURATION,
  MAX_DURATION,
  clamp,
  normalizeFrames,
  normalizeDurations,
  rotatePitchCoords,
  propagatePlayerMove,
  activeIndexAfterDelete,
} from '@/lib/board/frames'
import { exportGif } from '@/lib/board/exportGif'
import { usePlayback } from '@/hooks/usePlayback'
export { tokens, defaultFrame } from '@/lib/board/defaults'
export type { Token } from '@/lib/board/defaults'
export { SCRUM_FORMATION, LINEOUT_FORMATION } from '@/lib/board/defaults'
export { DEFAULT_DURATION, MIN_DURATION, MAX_DURATION, normalizeDurations } from '@/lib/board/frames'
import { resolveSavePlayId } from '@/lib/board/persistence'

export type TacticalBoardProps = {
  initialFrames?: Frame[]
  initialDurations?: number[]
  initialPitchPortrait?: boolean
  playId?: string
  mode?: 'fresh' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playIsPublic?: boolean
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
  visiblePlayers: PlayerPosition[]
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
  userId: string | null
  playbooks: { id: string; name: string }[]
  setPlaybooks: Dispatch<SetStateAction<{ id: string; name: string }[]>>
  tool: 'pointer' | 'select' | 'draw'
  setTool: (t: 'pointer' | 'select' | 'draw') => void
  lineColor: string
  lineDashed: boolean
  setLineColor: (color: string) => void
  setLineDashed: (dashed: boolean) => void
  addZone: (x: number, y: number) => void
  moveZone: (id: string, x: number, y: number) => void
  deleteZone: (id: string) => void
  updateZoneLabel: (id: string, label: string) => void
  updateZoneRadius: (id: string, r: number) => void
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
  handleSaveToPlaybook: (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) => Promise<void>
  handleSaveAsCopy: (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) => Promise<void>
  pitchPortrait: boolean
  togglePitchPortrait: () => void
  playFrames: () => void
  stopPlayback: () => void
  markUndoCheckpoint: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function useTacticalBoard({
  initialFrames,
  initialDurations,
  initialPitchPortrait = false,
  playId,
  mode = 'saved',
  playTitle = 'rugbymove-move',
  playDescription,
  playIsPublic = false,
  playCategory = 'Other',
}: TacticalBoardProps): UseTacticalBoardReturn {
  const originalFramesRef = useRef<Frame[] | null>(null)
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
  const initialLoadDone = useRef(false)

  // ── Undo / Redo ──
  type HistoryEntry = { frames: Frame[]; durations: number[] }
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<HistoryEntry[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const framesRef = useRef(frames)
  const durationsRef = useRef(durations)
  useEffect(() => { framesRef.current = frames }, [frames])
  useEffect(() => { durationsRef.current = durations }, [durations])

  const markUndoCheckpoint = useCallback(() => {
    const snap = framesRef.current
    const snapD = durationsRef.current
    undoStackRef.current = [
      ...undoStackRef.current.slice(-49),
      { frames: snap.map(f => ({ ...f, players: [...f.players], lines: [...f.lines] })), durations: [...snapD] },
    ]
    redoStackRef.current = []
    setUndoCount(undoStackRef.current.length)
    setRedoCount(0)
  }, [])

  const undo = useCallback(() => {
    const entry = undoStackRef.current.pop()
    if (!entry) return
    redoStackRef.current.push({ frames: framesRef.current.map(f => ({ ...f, players: [...f.players], lines: [...f.lines] })), durations: [...durationsRef.current] })
    setFrames(entry.frames)
    setDurations(entry.durations)
    setActiveFrameIndex(0)
    setUndoCount(undoStackRef.current.length)
    setRedoCount(redoStackRef.current.length)
  }, [])

  const redo = useCallback(() => {
    const entry = redoStackRef.current.pop()
    if (!entry) return
    undoStackRef.current.push({ frames: framesRef.current.map(f => ({ ...f, players: [...f.players], lines: [...f.lines] })), durations: [...durationsRef.current] })
    setFrames(entry.frames)
    setDurations(entry.durations)
    setActiveFrameIndex(0)
    setUndoCount(undoStackRef.current.length)
    setRedoCount(redoStackRef.current.length)
  }, [])

  // Stable refs so the keyboard handler (registered once) always calls the latest closures
  const undoRef = useRef(undo)
  const redoRef = useRef(redo)
  undoRef.current = undo
  redoRef.current = redo

  const totalDuration = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations])

  // Mark dirty when frames/durations change after initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      return
    }
    setIsDirty(true)
  }, [frames, durations])

  // Warn on browser close/refresh when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Stable refs so the keyboard handler can read latest values without re-registering
  const framesLenRef = useRef(0)
  useEffect(() => { framesLenRef.current = frames.length }, [frames])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'g' || e.key === 'G') setTool('select')
      if (e.key === 'd' || e.key === 'D') setTool('draw')
      if (e.key === 'p' || e.key === 'P') { setTool('pointer'); setSelectedPlayerIds(new Set()) }
      if (e.key === 'Escape') { setTool('pointer'); setSelectedPlayerIds(new Set()) }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveFrameIndex((i) => Math.max(0, i - 1))
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveFrameIndex((i) => Math.min(framesLenRef.current - 1, i + 1))
      }
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Initialise frames from pending move/formation or mode
  useEffect(() => {
    if (mode === 'fresh') {
      setFrames([defaultFrame])
      setDurations([])
      setActiveFrameIndex(0)
    }
  }, [mode])

  // Load user, playbooks, and formations from Supabase
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
          if (data) {
            setFormations(
              data.map((f) => ({
                id: f.id,
                name: f.name,
                category: f.category as FormationCategory,
                slots: f.slots as FormationSlot[],
                createdAt: f.updated_at,
              })),
            )
          }
        })
    })
  }, [])

  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame

  const {
    displayPlayers,
    displayZones,
    isPlaying,
    playFrames,
    stopPlayback,
    scrubTo,
  } = usePlayback({ frames, durations, setActiveFrameIndex })

  const visiblePlayers = displayPlayers ?? activeFrame.players
  const visibleZones = displayZones ?? activeFrame.zones ?? []

  const playerById = useMemo(() => {
    return new Map(visiblePlayers.map((player) => [player.id, player]))
  }, [visiblePlayers])

  const movePlayer = useCallback(
    (id: string, rawX: number, rawY: number) => {
      if (isPlaying) return
      const newX = clamp(rawX)
      const newY = clamp(rawY)
      const isGroupMove =
        tool === 'select' && selectedPlayerIds.has(id) && selectedPlayerIds.size > 1
      setFrames((currentFrames) =>
        propagatePlayerMove(currentFrames, activeFrameIndex, id, newX, newY, {
          isGroupMove,
          selectedPlayerIds,
        }),
      )
    },
    [activeFrameIndex, isPlaying, snapGrid, tool, selectedPlayerIds],
  )

  const captureFrame = useCallback(() => {
    markUndoCheckpoint()
    setFrames((currentFrames) => {
      const source = currentFrames[activeFrameIndex] ?? defaultFrame
      const nextFrames = [
        ...currentFrames.slice(0, activeFrameIndex + 1),
        {
          players: source.players.map((player) => ({ ...player })),
          zones: (source.zones ?? []).map((z) => ({ ...z })),
          lines: source.lines.map((line) => ({ ...line })),
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
  }, [activeFrameIndex, markUndoCheckpoint])

  const deleteFrame = useCallback(
    (indexToDelete: number) => {
      markUndoCheckpoint()
      stopPlayback()
      if (frames.length <= 1) {
        setFrames([defaultFrame])
        setDurations([])
        setActiveFrameIndex(0)
        return
      }
      const nextFrames = normalizeFrames(frames.filter((_, index) => index !== indexToDelete))
      setFrames(nextFrames)
      setDurations((prev) => {
        const next = prev.filter((_, i) => i !== indexToDelete)
        return normalizeDurations(next, nextFrames.length)
      })
      setActiveFrameIndex((currentIndex) =>
        activeIndexAfterDelete(currentIndex, indexToDelete, nextFrames.length),
      )
    },
    [frames, stopPlayback, markUndoCheckpoint],
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
    setFrames(originalFramesRef.current ?? [defaultFrame])
    setDurations(normalizeDurations(undefined, (originalFramesRef.current ?? [defaultFrame]).length))
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName || !userId) return

    // Build abstract slots from players moved off the tray (no player IDs stored)
    const movedIds = new Set(playersMovedFromDefault(activeFrame))
    const slots: FormationSlot[] = activeFrame.players
      .filter((p) => p.id === 'ball' || movedIds.has(p.id))
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
            ].slice(0, 12),
          )
        }
      })
      .catch((err) => {
        console.error('[useTacticalBoard] formation save failed:', err)
        setSaveStatus(err instanceof Error ? err.message : 'Formation save failed.')
      })

    setFormationName('')
    setShowFormationModal(false)
  }, [activeFrame, formationCategory, formationName, pitchPortrait, userId])

  // Accepts a pre-resolved list of {id, x, y} produced by FormationLoadDialog
  const loadFormation = useCallback(
    (players: PlayerPosition[]) => {
      stopPlayback()

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

  const togglePitchPortrait = useCallback(() => {
    // Transform all player positions and line endpoints across every frame
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

  const exportMove = useCallback(() => {
    if (isExporting) return
    setIsExporting(true)
    exportGif(normalizeFrames(frames), durations, playTitle)
      .finally(() => setIsExporting(false))
  }, [frames, durations, isExporting, playTitle])

  const persistToPlaybook = useCallback(
    async (
      playbookId: string,
      title: string,
      category: PlayCategory,
      description: string,
      isPublic: boolean,
      { asCopy }: { asCopy: boolean },
    ) => {
      const existingId = resolveSavePlayId(playId, asCopy)
      try {
        await savePlayToPlaybook(
          {
            id: existingId,
            title,
            description: description.trim() || null,
            category: category ?? 'Other',
            is_public: isPublic,
            animation_data: {
              frames: normalizeFrames(frames),
              durations,
              pitchPortrait: pitchPortrait || undefined,
            },
          },
          playbookId,
        )
        setSaveStatus(asCopy ? 'Saved as new copy.' : 'Saved to playbook.')
        setIsDirty(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed. Please try again.'
        console.error('[useTacticalBoard] save failed:', err)
        setSaveStatus(message)
      }
    },
    [playId, frames, durations, pitchPortrait],
  )

  const handleSaveToPlaybook = useCallback(
    (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) =>
      persistToPlaybook(playbookId, title, category, description, isPublic, { asCopy: false }),
    [persistToPlaybook],
  )

  const handleSaveAsCopy = useCallback(
    (playbookId: string, title: string, category: PlayCategory, description: string, isPublic: boolean) =>
      persistToPlaybook(playbookId, title, category, description, isPublic, { asCopy: true }),
    [persistToPlaybook],
  )

  const addLine = useCallback(
    (line: Line) => {
      markUndoCheckpoint()
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) =>
          index !== activeFrameIndex
            ? frame
            : { ...frame, lines: [...frame.lines, line] },
        ),
      )
    },
    [activeFrameIndex, markUndoCheckpoint],
  )

  const deleteLine = useCallback(
    (lineId: string) => {
      markUndoCheckpoint()
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) =>
          index !== activeFrameIndex
            ? frame
            : { ...frame, lines: frame.lines.filter((l) => l.id !== lineId) },
        ),
      )
    },
    [activeFrameIndex, markUndoCheckpoint],
  )

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

  const updateZoneRadius = useCallback(
    (id: string, r: number) => {
      if (isPlaying) return
      const clamped = Math.max(3, Math.min(45, r))
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) => {
          if (index !== activeFrameIndex) return frame
          return { ...frame, zones: (frame.zones ?? []).map((z) => (z.id === id ? { ...z, r: clamped } : z)) }
        }),
      )
    },
    [activeFrameIndex, isPlaying],
  )

  return {
    frames,
    durations,
    totalDuration,
    activeFrameIndex,
    activeFrame,
    visiblePlayers,
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
    userId,
    playbooks,
    setPlaybooks,
    tool,
    setTool,
    lineColor,
    lineDashed,
    setLineColor,
    setLineDashed,
    addZone,
    moveZone,
    deleteZone,
    updateZoneLabel,
    updateZoneRadius,
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
    markUndoCheckpoint,
    undo,
    redo,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
  }
}
