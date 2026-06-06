import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay, saveFormation as saveFormationAction } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import type { Formation, FormationCategory } from '@/lib/board/storage'
import type { Frame, Line, PlayerPosition, Zone, PlayCategory } from '@/types/play'
import type { PanelTab } from '@/components/board/PanelSlideOver'
import { tokens, defaultFrame } from '@/lib/board/defaults'
import { exportGif } from '@/lib/board/exportGif'
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

function interpolateZones(from: Zone[], to: Zone[], amount: number): Zone[] {
  return from.map((zone) => {
    const next = to.find((z) => z.id === zone.id) ?? zone
    return { ...zone, x: lerp(zone.x, next.x, amount), y: lerp(zone.y, next.y, amount) }
  })
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

function buildCumulative(durations: number[]): number[] {
  const cum: number[] = []
  let acc = 0
  for (const d of durations) {
    acc += d
    cum.push(acc)
  }
  return cum
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function interpolatePlayers(from: PlayerPosition[], to: PlayerPosition[], amount: number) {
  return from.map((player) => {
    const next = to.find((item) => item.id === player.id) ?? player
    return {
      id: player.id,
      x: lerp(player.x, next.x, amount),
      y: lerp(player.y, next.y, amount),
    }
  })
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
  loadFormation: (formation: Formation) => void
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
  const animationRef = useRef<number | null>(null)
  const originalFramesRef = useRef<Frame[] | null>(null)
  const [frames, setFrames] = useState<Frame[]>(() => normalizeFrames(initialFrames))
  const [durations, setDurations] = useState<number[]>(() =>
    normalizeDurations(initialDurations, normalizeFrames(initialFrames).length),
  )
  const [activeFrameIndex, setActiveFrameIndex] = useState(0)
  const [displayPlayers, setDisplayPlayers] = useState<PlayerPosition[] | null>(null)
  const [displayZones, setDisplayZones] = useState<Zone[] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
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
  const [activePlayers, setActivePlayers] = useState<string[]>(
    mode === 'fresh' ? [] : (initialActivePlayers ?? []),
  )

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

  // Load formations from Supabase
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('formations')
        .select('id,name,category,players,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(24)
        .then(({ data }) => {
          if (!data) return
          setFormations(data.map((f) => ({
            id: f.id,
            name: f.name,
            category: f.category as FormationCategory,
            players: f.players as PlayerPosition[],
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
        .select('id,name,category,players,created_at')
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
                players: f.players as PlayerPosition[],
                createdAt: f.created_at,
              })),
            )
          }
        })
    })
  }, [])

  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame
  const visiblePlayers = displayPlayers ?? activeFrame.players
  const visibleZones = displayZones ?? activeFrame.zones

  const playerById = useMemo(() => {
    return new Map(visiblePlayers.map((player) => [player.id, player]))
  }, [visiblePlayers])

  const stopPlayback = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsPlaying(false)
    setDisplayPlayers(null)
    setDisplayZones(null)
  }, [])

  const movePlayer = useCallback(
    (id: string, rawX: number, rawY: number) => {
      if (isPlaying) return
      const newX = snapGrid ? Math.round(clamp(rawX) / 5) * 5 : clamp(rawX)
      const newY = snapGrid ? Math.round(clamp(rawY) / 5) * 5 : clamp(rawY)
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
              players: frame.players.map((p) =>
                p.id === id ? { ...p, x: newX, y: newY } : p,
              ),
            }
          }),
        ),
      )
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

  const scrubTo = useCallback(
    (timeMs: number) => {
      if (isPlaying) return
      const playbackFrames = normalizeFrames(frames)
      if (playbackFrames.length < 2) return
      const segDurations = normalizeDurations(durations, playbackFrames.length)
      const cumulative = buildCumulative(segDurations)
      const total = cumulative[cumulative.length - 1] ?? 0
      const t0 = Math.min(total, Math.max(0, timeMs))

      let seg = 0
      for (let i = 0; i < cumulative.length; i++) {
        if (t0 <= cumulative[i]) { seg = i; break }
        seg = i
      }
      const segStart = seg === 0 ? 0 : cumulative[seg - 1]
      const segEnd = cumulative[seg]
      const progress = segEnd > segStart ? (t0 - segStart) / (segEnd - segStart) : 0

      setActiveFrameIndex(seg)
      setDisplayPlayers(
        interpolatePlayers(playbackFrames[seg].players, playbackFrames[Math.min(seg + 1, playbackFrames.length - 1)].players, progress),
      )
      setDisplayZones(
        interpolateZones(playbackFrames[seg].zones, playbackFrames[Math.min(seg + 1, playbackFrames.length - 1)].zones, progress),
      )
    },
    [frames, durations, isPlaying],
  )

  const resetBoard = useCallback(() => {
    stopPlayback()
    setFrames(originalFramesRef.current ?? [defaultFrame])
    setDurations(normalizeDurations(undefined, (originalFramesRef.current ?? [defaultFrame]).length))
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName || !userId) return

    const playersToSave = activeFrame.players.filter(
      (p) => p.id === 'ball' || activePlayers.includes(p.id),
    )

    const supabase = createClient()
    supabase
      .from('formations')
      .insert({
        name: trimmedName,
        category: formationCategory,
        players: playersToSave,
        user_id: userId,
      })
      .select('id,name,category,players,created_at')
      .single()
      .then(({ data }) => {
        if (data) {
          setFormations((prev) =>
            [
              {
                id: data.id,
                name: data.name,
                category: data.category as FormationCategory,
                players: data.players as PlayerPosition[],
                createdAt: data.created_at,
              },
              ...prev,
            ].slice(0, 12),
          )
        }
      })

    setFormationName('')
    setShowFormationModal(false)
  }, [activeFrame.players, activePlayers, formationCategory, formationName, userId])

  const loadFormation = useCallback(
    (formation: Formation) => {
      stopPlayback()

      // Add formation's player IDs to the active set
      const formationIds = formation.players.filter((p) => p.id !== 'ball').map((p) => p.id)
      if (formationIds.length > 0) {
        setActivePlayers((prev) => {
          const current = prev ?? []
          const next = [...current]
          for (const id of formationIds) {
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
                const saved = formation.players.find((item) => item.id === player.id)
                if (!saved) return player
                // Formations are stored in landscape coords; rotate if pitch is portrait
                return pitchPortrait ? rotatePitchCoords(saved) : saved
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
        zones: [...frame.zones, { id, x, y, r: 8, label: 'Zone' }],
      })),
    )
  }, [])

  const moveZone = useCallback(
    (id: string, x: number, y: number) => {
      if (isPlaying) return
      setFrames((currentFrames) =>
        currentFrames.map((frame, index) => {
          if (index !== activeFrameIndex) return frame
          return { ...frame, zones: frame.zones.map((z) => (z.id === id ? { ...z, x, y } : z)) }
        }),
      )
    },
    [activeFrameIndex, isPlaying],
  )

  const deleteZone = useCallback((id: string) => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({ ...frame, zones: frame.zones.filter((z) => z.id !== id) })),
    )
  }, [])

  const updateZoneLabel = useCallback((id: string, label: string) => {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => ({
        ...frame,
        zones: frame.zones.map((z) => (z.id === id ? { ...z, label } : z)),
      })),
    )
  }, [])

  const playFrames = useCallback(() => {
    const playbackFrames = normalizeFrames(frames).filter((frame) => frame.players.length > 0)
    if (playbackFrames.length < 2 || isPlaying) return

    const segDurations = normalizeDurations(durations, playbackFrames.length)
    const cumulative = buildCumulative(segDurations)
    const totalMs = cumulative[cumulative.length - 1] ?? 0

    const startedAt = performance.now()
    setIsPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startedAt

      if (elapsed >= totalMs) {
        setActiveFrameIndex(playbackFrames.length - 1)
        setDisplayPlayers(null)
        setIsPlaying(false)
        animationRef.current = null
        return
      }

      let seg = 0
      for (let i = 0; i < cumulative.length; i++) {
        if (elapsed < cumulative[i]) { seg = i; break }
        seg = i
      }
      const segStart = seg === 0 ? 0 : cumulative[seg - 1]
      const segEnd = cumulative[seg]
      const progress = Math.min(1, (elapsed - segStart) / (segEnd - segStart))

      setActiveFrameIndex(seg)
      setDisplayPlayers(
        interpolatePlayers(playbackFrames[seg].players, playbackFrames[seg + 1].players, progress),
      )
      setDisplayZones(
        interpolateZones(playbackFrames[seg].zones, playbackFrames[seg + 1].zones, progress),
      )
      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [frames, durations, isPlaying])

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
