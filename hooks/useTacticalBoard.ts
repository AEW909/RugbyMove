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

export const DEFAULT_DURATION = 900
export const MIN_DURATION = 200
export const MAX_DURATION = 3000

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
  activePlayers: string[]
  addPlayers: (ids: string[]) => void
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
  handleSaveToPlaybook: (playbookId: string, title: string, category: PlayCategory, description: string) => Promise<void>
  handleSaveAsCopy: (playbookId: string, title: string, category: PlayCategory, description: string) => Promise<void>
  pitchPortrait: boolean
  togglePitchPortrait: () => void
  playFrames: () => void
  stopPlayback: () => void
}

function rotatePitchCoords<T extends { x: number; y: number }>(p: T): T {
  return { ...p, x: p.y, y: p.x }
}

export function useTacticalBoard({
  initialFrames,
  initialDurations,
  initialPitchPortrait = false,
  initialActivePlayers,
  playId,
  mode = 'saved',
  playTitle = 'rugbymove-move',
  playDescription,
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
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    if (mode === 'fresh') return []
    if (initialActivePlayers && initialActivePlayers.length > 0) return initialActivePlayers
    if (initialFrames && initialFrames.length > 0) return inferActivePlayers(normalizeFrame(initialFrames[0]))
    return []
  })

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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Load formations from Supabase
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
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

  // Initialise frames from pending move/formation or mode
  useEffect(() => {
    if (mode === 'fresh') {
      setFrames([defaultFrame])
      setDurations([])
      setActiveFrameIndex(0)
    }
  }, [mode])

  // Load saved plays and playbooks
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
        .select('id,name,category,slots,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12)
        .then(({ data }) => {
          if (data) {
            setFormations(
              data.map((f) => ({
                id: f.id,
                name: f.name,
                category: f.category as FormationCategory,
                slots: f.slots as FormationSlot[],
                createdAt: f.created_at,
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
      setFrames((currentFrames) => {
        // Record the player's position on the active frame before the move so we
        // know which subsequent frames still have the "inherited" position.
        const prev = currentFrames[activeFrameIndex]?.players.find((p) => p.id === id)
        const oldX = prev?.x ?? newX
        const oldY = prev?.y ?? newY

        const isGroupMove =
          tool === 'select' && selectedPlayerIds.has(id) && selectedPlayerIds.size > 1

        let hitBarrier = false

        return normalizeFrames(
          currentFrames.map((frame, index) => {
            // Active frame — apply the move
            if (index === activeFrameIndex) {
              if (isGroupMove && prev) {
                const dx = newX - prev.x
                const dy = newY - prev.y
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
                players: frame.players.map((p) =>
                  p.id === id ? { ...p, x: newX, y: newY } : p,
                ),
              }
            }

            // Subsequent frames — propagate only while the player's position
            // matches the pre-move position (i.e. no explicit animation stored).
            if (index > activeFrameIndex && !isGroupMove && !hitBarrier) {
              const fp = frame.players.find((p) => p.id === id)
              if (fp && fp.x === oldX && fp.y === oldY) {
                return {
                  ...frame,
                  players: frame.players.map((p) =>
                    p.id === id ? { ...p, x: newX, y: newY } : p,
                  ),
                }
              }
              hitBarrier = true
            }

            return frame
          }),
        )
      })
    },
    [activeFrameIndex, isPlaying, snapGrid, tool, selectedPlayerIds],
  )

  const captureFrame = useCallback(() => {
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
      const nextFrames = normalizeFrames(frames.filter((_, index) => index !== indexToDelete))
      setFrames(nextFrames)
      setDurations((prev) => {
        const next = prev.filter((_, i) => i !== indexToDelete)
        return normalizeDurations(next, nextFrames.length)
      })
      setActiveFrameIndex((currentIndex) => {
        if (currentIndex > indexToDelete) return currentIndex - 1
        if (currentIndex === indexToDelete) return Math.max(0, currentIndex - 1)
        return Math.min(currentIndex, nextFrames.length - 1)
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
    setFrames(originalFramesRef.current ?? [defaultFrame])
    setDurations(normalizeDurations(undefined, (originalFramesRef.current ?? [defaultFrame]).length))
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName || !userId) return

    // Build abstract slots from active players' current positions (no player IDs stored)
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
            ].slice(0, 12),
          )
        }
      })
      .catch(() => setSaveStatus('Formation save failed.'))

    setFormationName('')
    setShowFormationModal(false)
  }, [activeFrame.players, activePlayers, formationCategory, formationName, pitchPortrait, userId])

  // Accepts a pre-resolved list of {id, x, y} produced by FormationLoadDialog
  const loadFormation = useCallback(
    (players: PlayerPosition[]) => {
      stopPlayback()

      // Add the loaded player IDs to the active set
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

  const handleSaveToPlaybook = useCallback(
    async (playbookId: string, title: string, category: PlayCategory, description: string) => {
      const normalizedFrames = normalizeFrames(frames)
      try {
        const play = await savePlay({
          id:
            playId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              playId,
            )
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
          .upsert(
            { playbook_id: playbookId, play_id: play.id },
            { onConflict: 'playbook_id,play_id' },
          )
        setSaveStatus('Saved to playbook.')
        setIsDirty(false)
      } catch {
        setSaveStatus('Save failed. Please try again.')
      }
    },
    [playId, frames, durations, pitchPortrait],
  )

  const handleSaveAsCopy = useCallback(
    async (playbookId: string, title: string, category: PlayCategory, description: string) => {
      const normalizedFrames = normalizeFrames(frames)
      try {
        const play = await savePlay({
          // No id — always inserts a new play
          title,
          description: description.trim() || null,
          category: category ?? 'Other',
          animation_data: { frames: normalizedFrames, durations, pitchPortrait: pitchPortrait || undefined, activePlayers },
        })
        const supabase = createClient()
        await supabase
          .from('playbook_plays')
          .upsert(
            { playbook_id: playbookId, play_id: play.id },
            { onConflict: 'playbook_id,play_id' },
          )
        setSaveStatus('Saved as new copy.')
        setIsDirty(false)
      } catch {
        setSaveStatus('Save failed. Please try again.')
      }
    },
    [frames, durations, pitchPortrait],
  )

  const addLine = useCallback(
    (line: Line) => {
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) =>
          index !== activeFrameIndex
            ? frame
            : { ...frame, lines: [...frame.lines, line] },
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

  const addPlayers = useCallback((ids: string[]) => {
    setActivePlayers((prev) => {
      const current = prev ?? []
      const next = [...current]
      for (const id of ids) {
        if (!next.includes(id)) next.push(id)
      }
      return next
    })
    setIsDirty(true)
  }, [])

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
    activePlayers,
    addPlayers,
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
  }
}
