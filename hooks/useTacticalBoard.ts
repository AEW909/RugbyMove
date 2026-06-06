import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay, saveFormation as saveFormationAction } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import type { Formation, FormationCategory, FormationSlot } from '@/lib/board/storage'
import type { Frame, Line, PlayerPosition, PlayCategory } from '@/types/play'
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
  playerById: Map<string, PlayerPosition>
  isPlaying: boolean
  formations: Formation[]
  saveStatus: string
  snapGrid: boolean
  setSnapGrid: Dispatch<SetStateAction<boolean>>
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
  addLine: (line: Line) => void
  deleteLine: (lineId: string) => void
  selectedPlayerIds: Set<string>
  setSelectedPlayerIds: Dispatch<SetStateAction<Set<string>>>
  setActiveFrameIndex: Dispatch<SetStateAction<number>>
  movePlayer: (id: string, rawX: number, rawY: number) => void
  captureFrame: () => void
  deleteFrame: (index: number) => void
  resetBoard: () => void
  saveFormationFromSelection: (name: string, category: FormationCategory) => Promise<void>
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [formations, setFormations] = useState<Formation[]>([])
  const [saveStatus, setSaveStatus] = useState('')
  const [snapGrid, setSnapGrid] = useState(false)
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

  const totalDuration = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations])

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

  // Load user data (formations + playbooks) in a single effect
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
        .limit(24)
        .then(({ data }) => {
          if (data) {
            setFormations(
              data.map((f) => ({
                id: f.id,
                name: f.name,
                category: f.category as Formation['category'],
                slots: f.slots as FormationSlot[],
                createdAt: f.created_at,
              })),
            )
          }
        })
    })
  }, [])

  // Initialise frames for a fresh board
  useEffect(() => {
    if (mode === 'fresh') {
      setFrames([defaultFrame])
      setDurations([])
      setActiveFrameIndex(0)
    }
  }, [mode])

  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame
  const visiblePlayers = displayPlayers ?? activeFrame.players

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
    },
    [frames, durations, isPlaying],
  )

  const resetBoard = useCallback(() => {
    stopPlayback()
    setFrames(originalFramesRef.current ?? [defaultFrame])
    setDurations(normalizeDurations(undefined, (originalFramesRef.current ?? [defaultFrame]).length))
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormationFromSelection = useCallback(
    async (name: string, category: FormationCategory) => {
      if (!userId || selectedPlayerIds.size === 0) return

      const slots: FormationSlot[] = activeFrame.players
        .filter((p) => selectedPlayerIds.has(p.id) || p.id === 'ball')
        .map((p) => {
          const side: FormationSlot['side'] = p.id === 'ball'
            ? 'ball'
            : p.id.startsWith('attack-') ? 'attack' : 'defend'
          const pos = pitchPortrait ? rotatePitchCoords(p) : p
          return { side, x: pos.x, y: pos.y }
        })

      try {
        const data = await saveFormationAction({ name, category, slots })
        if (data) {
          setFormations((prev) =>
            [
              {
                id: data.id,
                name: data.name,
                category: data.category as Formation['category'],
                slots: data.slots as FormationSlot[],
                createdAt: data.updated_at,
              },
              ...prev,
            ].slice(0, 24),
          )
        }
        setSelectedPlayerIds(new Set())
      } catch {
        setSaveStatus('Formation save failed.')
      }
    },
    [userId, selectedPlayerIds, activeFrame.players, pitchPortrait],
  )

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
          animation_data: { frames: normalizedFrames, durations, pitchPortrait: pitchPortrait || undefined },
        })
        const supabase = createClient()
        await supabase
          .from('playbook_plays')
          .upsert(
            { playbook_id: playbookId, play_id: play.id },
            { onConflict: 'playbook_id,play_id' },
          )
        setSaveStatus('Saved to playbook.')
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
          title,
          description: description.trim() || null,
          category: category ?? 'Other',
          animation_data: { frames: normalizedFrames, durations, pitchPortrait: pitchPortrait || undefined },
        })
        const supabase = createClient()
        await supabase
          .from('playbook_plays')
          .upsert(
            { playbook_id: playbookId, play_id: play.id },
            { onConflict: 'playbook_id,play_id' },
          )
        setSaveStatus('Saved as new copy.')
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
    playerById,
    isPlaying,
    formations,
    saveStatus,
    snapGrid,
    setSnapGrid,
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
    addLine,
    deleteLine,
    selectedPlayerIds,
    setSelectedPlayerIds,
    setActiveFrameIndex,
    movePlayer,
    captureFrame,
    deleteFrame,
    resetBoard,
    saveFormationFromSelection,
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
