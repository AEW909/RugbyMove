import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { savePlay } from '@/app/actions/plays'
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
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function svgPositionValues(frames: Frame[], id: string, axis: 'x' | 'y') {
  return frames
    .map((frame) => clamp(frame.players.find((player) => player.id === id)?.[axis] ?? 50))
    .join('%;%')
    .concat('%')
}

function createAnimatedSvg(frames: Frame[]) {
  const safeFrames = normalizeFrames(frames)
  const duration = Math.max(1, safeFrames.length - 1)

  const tokenMarkup = tokens
    .map((token) => {
      const first = safeFrames[0].players.find((player) => player.id === token.id)
      if (!first) return ''

      const xValues = svgPositionValues(safeFrames, token.id, 'x')
      const yValues = svgPositionValues(safeFrames, token.id, 'y')
      const firstX = clamp(first.x)
      const firstY = clamp(first.y)
      const animateX = `<animate attributeName="cx" dur="${duration}s" values="${xValues}" fill="freeze" />`
      const animateY = `<animate attributeName="cy" dur="${duration}s" values="${yValues}" fill="freeze" />`

      if (token.side === 'ball') {
        return `
          <g>
            <ellipse cx="${firstX}%" cy="${firstY}%" rx="2.8%" ry="1.6%" fill="#f8fafc" stroke="#14532d" stroke-width="0.45%">
              ${animateX}${animateY}
            </ellipse>
          </g>`
      }

      const fill = token.side === 'attack' ? '#2563eb' : '#dc2626'
      return `
        <g>
          <circle cx="${firstX}%" cy="${firstY}%" r="2.1%" fill="${fill}" stroke="#ffffff" stroke-width="0.35%">
            ${animateX}${animateY}
          </circle>
          <text x="${firstX}%" y="${firstY}%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">${token.label}</text>
        </g>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="800" viewBox="0 0 1320 800">
  <rect width="1320" height="800" fill="#15803d"/>
  <g stroke="#ffffff" stroke-opacity="0.55" stroke-width="2">
    <rect x="20" y="20" width="1280" height="760" fill="none" stroke-opacity="0.9" stroke-width="5"/>
    <line x1="660" y1="20" x2="660" y2="780"/>
    <line x1="66" y1="20" x2="66" y2="780" stroke-opacity="0.85"/>
    <line x1="1254" y1="20" x2="1254" y2="780" stroke-opacity="0.85"/>
    <line x1="290" y1="20" x2="290" y2="780" stroke-dasharray="12 12"/>
    <line x1="1030" y1="20" x2="1030" y2="780" stroke-dasharray="12 12"/>
  </g>
  ${tokenMarkup}
</svg>`
}

function saveMoveToStorage(move: SavedMove) {
  const saved = window.localStorage.getItem(storageKeys.moves)
  const moves = saved ? (JSON.parse(saved) as SavedMove[]) : []
  const nextMoves = [move, ...moves.filter((item) => item.id !== move.id)].slice(0, 24)
  window.localStorage.setItem(storageKeys.moves, JSON.stringify(nextMoves))
}

export type TacticalBoardProps = {
  initialFrames?: Frame[]
  playId?: string
  mode?: 'fresh' | 'local' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playCategory?: PlayCategory
  isPublic?: boolean
  onFramesChange?: (frames: Frame[]) => void
  isGuest?: boolean
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
  playCategory = 'Attacking',
  isPublic = false,
}: TacticalBoardProps): UseTacticalBoardReturn {
  const animationRef = useRef<number | null>(null)
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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKeys.formations)
      setFormations(saved ? JSON.parse(saved) : [])

      const pendingMove =
        mode === 'local' ? window.localStorage.getItem(storageKeys.pendingMove) : null
      if (pendingMove) {
        const move = JSON.parse(pendingMove) as SavedMove
        window.localStorage.removeItem(storageKeys.pendingMove)
        setFrames(normalizeFrames(move.frames))
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
      setFormations([])
    }
  }, [mode])

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
      const x = snapGrid ? Math.round(clamp(rawX) / 5) * 5 : clamp(rawX)
      const y = snapGrid ? Math.round(clamp(rawY) / 5) * 5 : clamp(rawY)
      setFrames((currentFrames) =>
        normalizeFrames(
          currentFrames.map((frame, index) => {
            if (index !== activeFrameIndex) return frame
            return {
              ...frame,
              players: frame.players.map((player) =>
                player.id === id ? { ...player, x, y } : player,
              ),
            }
          }),
        ),
      )
    },
    [activeFrameIndex, isPlaying, snapGrid],
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
    setFrames([defaultFrame])
    setActiveFrameIndex(0)
  }, [stopPlayback])

  const saveFormation = useCallback(() => {
    const trimmedName = formationName.trim()
    if (!trimmedName) return
    const nextFormation: Formation = {
      id: crypto.randomUUID(),
      name: trimmedName,
      category: formationCategory,
      players: activeFrame.players.map((player) => ({ ...player })),
      createdAt: new Date().toISOString(),
    }
    const nextFormations = [nextFormation, ...formations].slice(0, 12)
    setFormations(nextFormations)
    window.localStorage.setItem(storageKeys.formations, JSON.stringify(nextFormations))
    setFormationName('')
    setShowFormationModal(false)
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
          description: playDescription,
          category: playCategory,
          is_public: isPublic,
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
    [isPublic, playCategory, playDescription, playId, persistLocally],
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
