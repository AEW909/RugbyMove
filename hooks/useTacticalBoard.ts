import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay, saveFormation as saveFormationAction } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import { storageKeys } from '@/lib/board/storage'
import type { Formation, FormationCategory, SavedMove } from '@/lib/board/storage'
import type { Frame, PlayerPosition, PlayCategory } from '@/types/play'
import type { PanelTab } from '@/components/board/PanelSlideOver'

export type Token = {
  id: string
  label: string
  side: 'attack' | 'defend' | 'ball'
}

export const tokens: Token[] = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `attack-${index + 1}`,
    label: String(index + 1),
    side: 'attack' as const,
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `defend-${index + 1}`,
    label: String(index + 1),
    side: 'defend' as const,
  })),
  { id: 'ball', label: '', side: 'ball' as const },
]

function createDefaultPlayers(): PlayerPosition[] {
  return tokens.map((token, index) => {
    if (token.side === 'ball') {
      return { id: token.id, x: 50, y: 45 }
    }
    const teamIndex = token.side === 'attack' ? index : index - 15
    const y = 4 + teamIndex * 6.5
    return {
      id: token.id,
      x: token.side === 'attack' ? 4 : 96,
      y,
    }
  })
}

export const defaultFrame: Frame = {
  players: createDefaultPlayers(),
  lines: [],
}

// Built-in preset: diagonal scrum — loosehead (top-left) to tighthead (bottom-right).
// Front row pairs are 3 x-units apart (touching). Diagonal step: Δx=2, Δy=3 ≈ 24 px at 800×600.
// Ball at tunnel mouth (loosehead, top). Both 9s sit tight to the tunnel.
export const SCRUM_FORMATION: Formation = {
  id: 'builtin-scrum',
  name: 'Scrum',
  category: 'Scrum',
  createdAt: '',
  players: [
    { id: 'ball',      x: 44, y: 33 },
    // Attack front row — loosehead → hooker → tighthead (diagonal, Δx=2 Δy=3)
    { id: 'attack-1',  x: 43, y: 38 },
    { id: 'attack-2',  x: 45, y: 41 },
    { id: 'attack-3',  x: 47, y: 44 },
    // Attack second row (3 x-units behind front row)
    { id: 'attack-6',  x: 41, y: 36 },
    { id: 'attack-4',  x: 40, y: 39 },
    { id: 'attack-5',  x: 42, y: 42 },
    { id: 'attack-7',  x: 44, y: 47 },
    { id: 'attack-8',  x: 38, y: 41 },
    // Attack 9 — at tunnel mouth, loosehead side
    { id: 'attack-9',  x: 41, y: 33 },
    // Defend front row — 3 x-units right of attack (touching)
    { id: 'defend-3',  x: 46, y: 38 },
    { id: 'defend-2',  x: 48, y: 41 },
    { id: 'defend-1',  x: 50, y: 44 },
    // Defend second row (3 x-units right of defend front row)
    { id: 'defend-7',  x: 49, y: 35 },
    { id: 'defend-5',  x: 49, y: 39 },
    { id: 'defend-4',  x: 51, y: 43 },
    { id: 'defend-6',  x: 53, y: 47 },
    { id: 'defend-8',  x: 59, y: 43 },
    // Defend 9 — separated, top-right of cluster
    { id: 'defend-9',  x: 53, y: 31 },
  ],
}

// Built-in preset: compact lineout near the top touchline.
// Players are touching (4-unit y-spacing ≈ token diameter at typical board size).
// Attack scrum half sits tight to the left of the attack line.
export const LINEOUT_FORMATION: Formation = {
  id: 'builtin-lineout',
  name: 'Lineout',
  category: 'Lineout',
  createdAt: '',
  players: [
    { id: 'ball',      x: 30, y: 4 },
    // Attack hooker — at touchline (thrower)
    { id: 'attack-2',  x: 28, y: 3 },
    // Defend hooker — opposite side of lineout
    { id: 'defend-2',  x: 42, y: 3 },
    // Attack scrum half — just left of lineout, mid-height
    { id: 'attack-9',  x: 24, y: 20 },
    // Attack lineout line: 1, 4, 3, 5, 6, 7, 8 — touching, y-spacing 4
    { id: 'attack-1',  x: 30, y: 8 },
    { id: 'attack-4',  x: 30, y: 12 },
    { id: 'attack-3',  x: 30, y: 16 },
    { id: 'attack-5',  x: 30, y: 20 },
    { id: 'attack-6',  x: 30, y: 24 },
    { id: 'attack-7',  x: 30, y: 28 },
    { id: 'attack-8',  x: 30, y: 32 },
    // Defend lineout line: 1, 4, 3, 5, 6, 7, 8
    { id: 'defend-1',  x: 36, y: 8 },
    { id: 'defend-4',  x: 36, y: 12 },
    { id: 'defend-3',  x: 36, y: 16 },
    { id: 'defend-5',  x: 36, y: 20 },
    { id: 'defend-6',  x: 36, y: 24 },
    { id: 'defend-7',  x: 36, y: 28 },
    { id: 'defend-8',  x: 36, y: 32 },
  ],
}

function normalizeFrame(frame: Partial<Frame> | undefined): Frame {
  return {
    players: Array.isArray(frame?.players) ? frame.players : createDefaultPlayers(),
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#15803d"/>
${paths}
</svg>`
}

function saveMoveToStorage(move: SavedMove) {
  try {
    const stored = window.localStorage.getItem(storageKeys.moves)
    const existing: SavedMove[] = stored ? JSON.parse(stored) : []
    const next = [move, ...existing.filter((m) => m.id !== move.id)].slice(0, 24)
    window.localStorage.setItem(storageKeys.moves, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
}

export type TacticalBoardProps = {
  initialFrames?: Frame[]
  playId?: string
  mode?: 'fresh' | 'local' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playCategory?: PlayCategory
  onFramesChange?: (frames: Frame[]) => void
  isGuest?: boolean
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
  savedPlays: SavedMove[]
  playbooks: { id: string; name: string }[]
  setPlaybooks: Dispatch<SetStateAction<{ id: string; name: string }[]>>
  tool: 'pointer' | 'select'
  setTool: Dispatch<SetStateAction<'pointer' | 'select'>>
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
  handleSaveLocally: (title: string) => void
  handleSaveToPlaybook: (playbookId: string, title: string) => Promise<void>
  handleLoadPlay: (play: SavedMove) => void
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
  const [savedPlays, setSavedPlays] = useState<SavedMove[]>([])
  const [playbooks, setPlaybooks] = useState<{ id: string; name: string }[]>([])
  const [tool, setTool] = useState<'pointer' | 'select'>('pointer')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'g' || e.key === 'G') setTool('select')
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
    try {
      const pendingMove =
        mode === 'local' ? window.localStorage.getItem(storageKeys.pendingMove) : null
      if (pendingMove) {
        const move = JSON.parse(pendingMove) as SavedMove
        window.localStorage.removeItem(storageKeys.pendingMove)
        const loadedFrames = normalizeFrames(move.frames)
        originalFramesRef.current = loadedFrames
        setFrames(loadedFrames)
        setActiveFrameIndex(0)
        return
      }

      if (mode === 'fresh') {
        window.localStorage.removeItem(storageKeys.pendingMove)
        window.localStorage.removeItem(storageKeys.pendingFormation)
        setFrames([defaultFrame])
        setActiveFrameIndex(0)
        return
      }

      const pendingFormation =
        mode === 'local' ? window.localStorage.getItem(storageKeys.pendingFormation) : null
      if (pendingFormation) {
        const formation = JSON.parse(pendingFormation) as Formation
        window.localStorage.removeItem(storageKeys.pendingFormation)
        setFrames((currentFrames) => {
          const firstFrame = currentFrames[0] ?? defaultFrame
          return [
            {
              ...firstFrame,
              players: firstFrame.players.map((player) => {
                const savedPlayer = formation.players.find((item) => item.id === player.id)
                return savedPlayer ? { ...savedPlayer } : player
              }),
            },
          ]
        })
      }
    } catch {
      /* ignore parse errors */
    }
  }, [mode])

  // Load saved plays and playbooks
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKeys.moves)
      setSavedPlays(stored ? (JSON.parse(stored) as SavedMove[]) : [])
    } catch {
      setSavedPlays([])
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('playbooks')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name')
        .then(({ data }) => setPlaybooks(data ?? []))
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
    if (!trimmedName) return

    const id = crypto.randomUUID()
    const nextFormation: Formation = {
      id,
      name: trimmedName,
      category: formationCategory,
      players: activeFrame.players.map((player) => ({ ...player })),
      createdAt: new Date().toISOString(),
    }

    const nextFormations = [nextFormation, ...formations].slice(0, 24)
    setFormations(nextFormations)
    window.localStorage.setItem(storageKeys.formations, JSON.stringify(nextFormations))
    setFormationName('')
    setShowFormationModal(false)

    // Persist to DB (fire and forget — localStorage is already saved)
    saveFormationAction({
      id,
      name: trimmedName,
      category: formationCategory,
      players: activeFrame.players.map((p) => ({ ...p })),
    }).catch(() => { /* localStorage fallback already done */ })
  }, [activeFrame.players, formations, formationCategory, formationName])

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

  const persistLocally = useCallback(
    (title: string): SavedMove => {
      const move: SavedMove = {
        id: crypto.randomUUID(),
        title,
        frames: normalizeFrames(frames),
        updatedAt: new Date().toISOString(),
      }
      saveMoveToStorage(move)
      setSavedPlays((prev) => [move, ...prev.filter((p) => p.id !== move.id)].slice(0, 24))
      return move
    },
    [frames],
  )

  const handleSaveLocally = useCallback(
    (title: string) => {
      persistLocally(title)
      setSaveStatus('Saved locally.')
    },
    [persistLocally],
  )

  const handleSaveToPlaybook = useCallback(
    async (playbookId: string, title: string) => {
      const move = persistLocally(title)
      const normalizedFrames = move.frames
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
      } catch (error) {
        setSaveStatus(
          error instanceof Error && error.message.includes('signed in')
            ? 'Saved locally. Log in to save to your account.'
            : 'Saved locally. Account save failed.',
        )
      }
    },
    [playCategory, playDescription, playId, persistLocally],
  )

  const handleLoadPlay = useCallback(
    (play: SavedMove) => {
      stopPlayback()
      setFrames(normalizeFrames(play.frames))
      setActiveFrameIndex(0)
    },
    [stopPlayback],
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
    savedPlays,
    playbooks,
    setPlaybooks,
    tool,
    setTool,
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
    handleSaveLocally,
    handleSaveToPlaybook,
    handleLoadPlay,
    playFrames,
    stopPlayback,
  }
}
