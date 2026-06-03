import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay, saveFormation as saveFormationAction } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import type { Formation, FormationCategory } from '@/lib/board/storage'
import type { Frame, Line, PlayerPosition, PlayCategory } from '@/types/play'
import type { PanelTab } from '@/components/board/PanelSlideOver'
import { tokens, defaultFrame } from '@/lib/board/defaults'
export { tokens, defaultFrame } from '@/lib/board/defaults'
export type { Token } from '@/lib/board/defaults'
export { SCRUM_FORMATION, LINEOUT_FORMATION } from '@/lib/board/defaults'

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

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function createAnimatedSvg(frames: Frame[]): string {
  const W = 800, H = 600
  const R = 14
  const dur = frames.length * 0.9

  const allIds = frames[0]?.players.map((p) => p.id) ?? []
  const paths = allIds
    .map((id) => {
      const positions = frames.map((f) => f.players.find((p) => p.id === id) ?? { x: 0, y: 0 })
      const xs = positions.map((p) => ((p.x / 100) * W).toFixed(1)).join(';')
      const ys = positions.map((p) => ((p.y / 100) * H).toFixed(1)).join(';')
      const isAttack = id.startsWith('attack')
      const fill = isAttack ? '#2563eb' : '#dc2626'
      return `<circle r="${R}" fill="${fill}">
  <animate attributeName="cx" values="${xs}" dur="${dur}s" repeatCount="indefinite"/>
  <animate attributeName="cy" values="${ys}" dur="${dur}s" repeatCount="indefinite"/>
</circle>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="800" viewBox="0 0 1320 800">
  <rect width="1320" height="800" fill="#15803d"/>
  <g stroke="#ffffff" stroke-opacity="0.55" stroke-width="2">
    <rect x="20" y="20" width="1280" height="760" fill="none" stroke-opacity="0.9" stroke-width="5"/>
    <line x1="660" y1="20" x2="660" y2="780"/>
    <line x1="127" y1="20" x2="127" y2="780" stroke-opacity="0.85"/>
    <line x1="1193" y1="20" x2="1193" y2="780" stroke-opacity="0.85"/>
    <line x1="361" y1="20" x2="361" y2="780" stroke-dasharray="12 12"/>
    <line x1="959" y1="20" x2="959" y2="780" stroke-dasharray="12 12"/>
    <line x1="553" y1="20" x2="553" y2="780" stroke-dasharray="6 8" stroke-opacity="0.4"/>
    <line x1="767" y1="20" x2="767" y2="780" stroke-dasharray="6 8" stroke-opacity="0.4"/>
  </g>
  ${tokenMarkup}
</svg>`
}


export type TacticalBoardProps = {
  initialFrames?: Frame[]
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
  activeFrameIndex: number
  activeFrame: Frame
  visiblePlayers: PlayerPosition[]
  playerById: Map<string, PlayerPosition>
  isPlaying: boolean
  formations: Formation[]
  formationName: string
  setFormationName: (name: string) => void
  formationCategory: FormationCategory
  setFormationCategory: (cat: FormationCategory) => void
  saveStatus: string
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
  handleSaveToPlaybook: (playbookId: string, title: string) => Promise<void>
  playFrames: () => void
  stopPlayback: () => void
}

export function useTacticalBoard({
  initialFrames,
  playId,
  mode = 'saved',
  playDescription,
  playCategory = 'Other',
}: TacticalBoardProps): UseTacticalBoardReturn {
  const animationRef = useRef<number | null>(null)
  const originalFramesRef = useRef<Frame[] | null>(null)
  const [frames, setFrames] = useState<Frame[]>(() => normalizeFrames(initialFrames))
  const [activeFrameIndex, setActiveFrameIndex] = useState(0)
  const [displayPlayers, setDisplayPlayers] = useState<PlayerPosition[] | null>(null)
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
  const [lineColor, setLineColor] = useState('#f8fafc')
  const [lineDashed, setLineDashed] = useState(false)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())

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

  // Load formations: DB if logged in, localStorage fallback
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        try {
          const saved = window.localStorage.getItem(storageKeys.formations)
          setFormations(saved ? JSON.parse(saved) : [])
        } catch {
          setFormations([])
        }
        return
      }
      supabase
        .from('formations')
        .select('id,name,category,players,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(24)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            try {
              const saved = window.localStorage.getItem(storageKeys.formations)
              setFormations(saved ? JSON.parse(saved) : [])
            } catch {
              setFormations([])
            }
            return
          }
          const dbFormations: Formation[] = data.map((f) => ({
            id: f.id,
            name: f.name,
            category: f.category as FormationCategory,
            players: f.players as PlayerPosition[],
            createdAt: f.updated_at,
          }))
          setFormations(dbFormations)
          window.localStorage.setItem(storageKeys.formations, JSON.stringify(dbFormations))
        })
    })
  }, [])

  // Initialise frames from pending move/formation or mode
  useEffect(() => {
    if (mode === 'fresh') {
      setFrames([defaultFrame])
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
    setActiveFrameIndex((i) => i + 1)
  }, [activeFrameIndex])

  const deleteFrame = useCallback(
    (indexToDelete: number) => {
      stopPlayback()
      if (frames.length <= 1) {
        setFrames([defaultFrame])
        setActiveFrameIndex(0)
        return
      }
      const nextFrames = normalizeFrames(frames.filter((_, index) => index !== indexToDelete))
      setFrames(nextFrames)
      setActiveFrameIndex((currentIndex) => {
        if (currentIndex > indexToDelete) return currentIndex - 1
        if (currentIndex === indexToDelete) return Math.max(0, currentIndex - 1)
        return Math.min(currentIndex, nextFrames.length - 1)
      })
    },
    [frames, stopPlayback],
  )

  const resetBoard = useCallback(() => {
    stopPlayback()
    setFrames(originalFramesRef.current ?? [defaultFrame])
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName || !userId) return

    const supabase = createClient()
    supabase
      .from('formations')
      .insert({
        name: trimmedName,
        category: formationCategory,
        players: activeFrame.players,
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
  }, [activeFrame.players, formationCategory, formationName, userId])

  const loadFormation = useCallback(
    (formation: Formation) => {
      stopPlayback()
      setFrames((currentFrames) =>
        normalizeFrames(
          currentFrames.map((frame, index) => {
            if (index !== activeFrameIndex) return frame
            return {
              ...frame,
              players: frame.players.map((player) => {
                const savedPlayer = formation.players.find((item) => item.id === player.id)
                return savedPlayer ? { ...savedPlayer } : player
              }),
            }
          }),
        ),
      )
    },
    [activeFrameIndex, stopPlayback],
  )

  const exportMove = useCallback(() => {
    const svg = createAnimatedSvg(frames)
    downloadTextFile('rugbymove-move.svg', svg, 'image/svg+xml')
  }, [frames])

  const handleSaveToPlaybook = useCallback(
    async (playbookId: string, title: string) => {
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
          description: playDescription ?? null,
          category: playCategory ?? 'Other',
          animation_data: { frames: normalizedFrames },
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
    [isPublic, playCategory, playDescription, playId, frames],
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

    const durationPerSegment = 900
    const startedAt = performance.now()
    const totalSegments = playbackFrames.length - 1
    setIsPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const segment = Math.max(
        0,
        Math.min(totalSegments - 1, Math.floor(elapsed / durationPerSegment)),
      )
      const segmentProgress = Math.min(1, (elapsed % durationPerSegment) / durationPerSegment)
      const fromFrame = playbackFrames[segment]
      const toFrame = playbackFrames[segment + 1]

      setActiveFrameIndex(segment)
      setDisplayPlayers(interpolatePlayers(fromFrame.players, toFrame.players, segmentProgress))

      if (elapsed < totalSegments * durationPerSegment) {
        animationRef.current = requestAnimationFrame(tick)
        return
      }

      setActiveFrameIndex(playbackFrames.length - 1)
      setDisplayPlayers(null)
      setIsPlaying(false)
      animationRef.current = null
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [frames, isPlaying])

  return {
    frames,
    activeFrameIndex,
    activeFrame,
    visiblePlayers,
    playerById,
    isPlaying,
    formations,
    formationName,
    setFormationName,
    formationCategory,
    setFormationCategory,
    saveStatus,
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
    handleSaveToPlaybook,
    playFrames,
    stopPlayback,
  }
}
