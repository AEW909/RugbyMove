'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Grid3x3, Home, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { savePlay } from '@/app/actions/plays'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { storageKeys } from '@/lib/board/storage'
import type { Formation, FormationCategory, SavedMove } from '@/lib/board/storage'
import type { Frame, PlayerPosition, PlayCategory } from '@/types/play'
import PanelSlideOver from '@/components/board/PanelSlideOver'
import type { PanelTab } from '@/components/board/PanelSlideOver'
import DefaultsModal from '@/components/board/DefaultsModal'

type SetupItem = { id: string; name: string }

type TacticalBoardProps = {
  initialFrames?: Frame[]
  playId?: string
  mode?: 'fresh' | 'local' | 'saved'
  playTitle?: string
  playDescription?: string | null
  playCategory?: PlayCategory
  isPublic?: boolean
  onFramesChange?: (frames: Frame[]) => void
  isGuest?: boolean
  setupRequired?: { teams: SetupItem[]; playbooks: SetupItem[] }
}

type Token = {
  id: string
  label: string
  side: 'attack' | 'defend' | 'ball'
}

const tokens: Token[] = [
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
      return { id: token.id, x: 50, y: 35 }
    }

    const teamIndex = token.side === 'attack' ? index : index - 15
    const col = teamIndex % 5
    const row = Math.floor(teamIndex / 5)

    return {
      id: token.id,
      x: (token.side === 'attack' ? 3 : 57) + col * 10,
      y: 79 + row * 8,
    }
  })
}

const defaultFrame: Frame = {
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
      if (!first) {
        return ''
      }

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

export default function TacticalBoard({
  initialFrames,
  playId,
  mode = 'saved',
  playTitle = 'Untitled move',
  playDescription,
  playCategory = 'Attacking',
  isPublic = false,
  onFramesChange,
  isGuest = false,
  setupRequired,
}: TacticalBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
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
  const [showDefaultsModal, setShowDefaultsModal] = useState(!!setupRequired)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKeys.formations)
      setFormations(saved ? JSON.parse(saved) : [])

      const pendingMove = mode === 'local' ? window.localStorage.getItem(storageKeys.pendingMove) : null
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
    supabase
      .from('playbooks')
      .select('id,name')
      .order('name')
      .then(({ data }) => setPlaybooks(data ?? []))
  }, [])

  const activeFrame = frames[activeFrameIndex] ?? frames[0] ?? defaultFrame
  const visiblePlayers = displayPlayers ?? activeFrame.players

  const playerById = useMemo(() => {
    return new Map(visiblePlayers.map((player) => [player.id, player]))
  }, [visiblePlayers])

  const commitFrames = useCallback(
    (nextFrames: Frame[]) => {
      setFrames(normalizeFrames(nextFrames))
    },
    [],
  )

  const stopPlayback = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsPlaying(false)
    setDisplayPlayers(null)
  }, [])

  const updatePlayerPosition = useCallback(
    (id: string, clientX: number, clientY: number) => {
      const board = boardRef.current
      if (!board || isPlaying) {
        return
      }

      const rect = board.getBoundingClientRect()
      const rawX = ((clientX - rect.left) / rect.width) * 100
      const rawY = ((clientY - rect.top) / rect.height) * 100

      const clampedX = clamp(rawX)
      // Invert the display transform: pitch zone (display y 0-75%) → stored y 0-100; tray zone (display y 75-100%) → stored y 75-100
      const storedY = rawY <= 75 ? clamp((rawY / 75) * 100) : clamp(rawY)

      const x = snapGrid ? Math.round(clampedX / 5) * 5 : clampedX
      const y = snapGrid ? Math.min(95, Math.round(storedY / 5) * 5) : storedY

      const nextFrames = frames.map((frame, index) => {
        if (index !== activeFrameIndex) {
          return frame
        }
        return {
          ...frame,
          players: frame.players.map((player) =>
            player.id === id ? { ...player, x, y } : player,
          ),
        }
      })

      commitFrames(nextFrames)
    },
    [activeFrameIndex, commitFrames, frames, isPlaying, snapGrid],
  )

  const handlePointerDown = (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePlayerPosition(id, event.clientX, event.clientY)
  }

  const handlePointerMove = (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.buttons !== 1) {
      return
    }

    updatePlayerPosition(id, event.clientX, event.clientY)
  }

  const captureFrame = () => {
    const source = frames[activeFrameIndex] ?? defaultFrame
    const nextFrames = [
      ...frames.slice(0, activeFrameIndex + 1),
      {
        players: source.players.map((player) => ({ ...player })),
        lines: source.lines.map((line) => ({ ...line })),
      },
      ...frames.slice(activeFrameIndex + 1),
    ]
    commitFrames(nextFrames)
    setActiveFrameIndex(activeFrameIndex + 1)
  }

  const deleteFrame = (indexToDelete: number) => {
    stopPlayback()

    if (frames.length <= 1) {
      commitFrames([defaultFrame])
      setActiveFrameIndex(0)
      return
    }

    const nextFrames = frames.filter((_, index) => index !== indexToDelete)
    commitFrames(nextFrames)
    setActiveFrameIndex((currentIndex) => {
      if (currentIndex > indexToDelete) {
        return currentIndex - 1
      }

      if (currentIndex === indexToDelete) {
        return Math.max(0, currentIndex - 1)
      }

      return Math.min(currentIndex, nextFrames.length - 1)
    })
  }

  const resetBoard = () => {
    stopPlayback()
    commitFrames([defaultFrame])
    setActiveFrameIndex(0)
  }

  const saveFormation = () => {
    const trimmedName = formationName.trim()
    if (!trimmedName) {
      return
    }

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
  }

  const loadFormation = (formation: Formation) => {
    stopPlayback()
    const nextFrames = frames.map((frame, index) => {
      if (index !== activeFrameIndex) {
        return frame
      }

      return {
        ...frame,
        players: frame.players.map((player) => {
          const savedPlayer = formation.players.find((item) => item.id === player.id)
          return savedPlayer ? { ...savedPlayer } : player
        }),
      }
    })

    commitFrames(nextFrames)
  }

  const exportMove = () => {
    const svg = createAnimatedSvg(frames)
    downloadTextFile('rugbymove-move.svg', svg, 'image/svg+xml')
  }

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
    [frames, isPublic, playCategory, playDescription, playId, persistLocally],
  )

  const handleLoadPlay = useCallback(
    (play: SavedMove) => {
      stopPlayback()
      setFrames(normalizeFrames(play.frames))
      setActiveFrameIndex(0)
    },
    [stopPlayback],
  )

  const playFrames = () => {
    const playbackFrames = normalizeFrames(frames).filter((frame) => frame.players.length > 0)

    if (playbackFrames.length < 2 || isPlaying) {
      return
    }

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
  }

  return (
    <section className="overflow-visible rounded-lg border border-emerald-900/10 bg-white shadow-toolbar">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        >
          <Home className="h-4 w-4" />
          Home
        </a>

        <div className="h-5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={isPlaying ? stopPlayback : playFrames}
          disabled={frames.length < 2}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={captureFrame}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Frame
        </button>
        <button
          type="button"
          onClick={resetBoard}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={() => setSnapGrid((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition',
            snapGrid
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 text-slate-800 hover:bg-slate-50',
          )}
        >
          <Grid3x3 className="h-4 w-4" />
          Snap
        </button>

      </div>

      {/* Fixed side tab — opens the panel */}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={cn(
          'fixed right-0 top-1/2 z-30 -translate-y-1/2 flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-white py-6 pl-1.5 pr-1 shadow-md transition hover:bg-slate-50',
          panelOpen && 'pointer-events-none opacity-0',
        )}
        aria-label="Open panel"
      >
        <ChevronLeft className="h-4 w-4 text-slate-500" />
      </button>

      {/* ── Board ── */}
      <div className="p-4">
        <div
          ref={boardRef}
          className="relative aspect-[4/3] min-h-[360px] overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner"
          aria-label="Rugby tactical board"
        >
          {/* Pitch — top 75% */}
          <div className="absolute inset-x-0 top-0 h-[75%] overflow-hidden border-b-4 border-white bg-emerald-700">
            <div className="absolute inset-0 grid grid-cols-10">
              {Array.from({ length: 10 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    'border-r border-white/35',
                    index === 0 || index === 9 ? 'bg-emerald-900/15' : 'bg-transparent',
                  )}
                />
              ))}
            </div>
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
            <div className="absolute left-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute right-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute left-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />
            <div className="absolute right-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />
          </div>

          {/* Move lines SVG — covers full board coordinate space */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {activeFrame.lines.map((line) => (
              <line
                key={line.id}
                x1={`${line.from.x}%`}
                y1={`${line.from.y * 0.75}%`}
                x2={`${line.to.x}%`}
                y2={`${line.to.y * 0.75}%`}
                stroke={line.color ?? '#f8fafc'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={line.dashed ? '8 8' : undefined}
              />
            ))}
          </svg>

          {/* Tray area — bottom 25% */}
          <div className="absolute inset-x-0 bottom-0 flex h-[25%] border-t-2 border-slate-300">
            <div className="flex flex-1 items-center justify-center border-r border-dashed border-blue-300 bg-blue-50 text-[11px] font-semibold uppercase text-blue-700">
              Attack tray
            </div>
            <div className="flex flex-1 items-center justify-center bg-red-50 text-[11px] font-semibold uppercase text-red-700">
              Defence tray
            </div>
          </div>

          {/* Player tokens */}
          {tokens.map((token) => {
            const player = playerById.get(token.id)
            if (!player) {
              return null
            }

            const inPitch = player.y <= 75
            const displayX = player.x
            const displayY = inPitch ? player.y * 0.75 : 75 + (player.y - 75) * 1.0

            return (
              <button
                type="button"
                key={token.id}
                onPointerDown={handlePointerDown(token.id)}
                onPointerMove={handlePointerMove(token.id)}
                className={cn(
                  'absolute flex touch-none select-none items-center justify-center border-2 text-xs font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                  token.side === 'ball' &&
                    'h-8 w-12 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  token.side !== 'ball' && 'h-9 w-9 rounded-full',
                )}
                style={{
                  left: `${displayX}%`,
                  top: `${displayY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                aria-label={
                  token.side === 'ball'
                    ? 'Ball'
                    : `${token.side === 'attack' ? 'Attacking' : 'Defending'} player ${token.label}`
                }
              >
                {token.side === 'ball' ? (
                  <>
                    <span className="absolute inset-[2px] rounded-[50%] border-t-2 border-[#e11d48]" />
                    <span className="absolute inset-[4px] rounded-[50%] border-b-2 border-[#2563eb]" />
                    <span className="absolute left-[7px] top-1/2 h-[18px] w-[5px] -translate-y-1/2 rounded-[50%] border-l-2 border-[#16a34a]" />
                    <span className="absolute right-[7px] top-1/2 h-[18px] w-[5px] -translate-y-1/2 rounded-[50%] border-r-2 border-[#16a34a]" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-black tracking-[0.08em] text-slate-900">
                      G
                    </span>
                  </>
                ) : (
                  token.label
                )}
              </button>
            )
          })}
        </div>

        {/* ── Frame strip ── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold uppercase text-slate-400">Frames</span>
          {frames.map((frame, index) => (
            <div
              key={`${frame.players.length}-${index}`}
              className={cn(
                'flex shrink-0 overflow-hidden rounded-md border transition',
                activeFrameIndex === index
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  stopPlayback()
                  setActiveFrameIndex(index)
                }}
                className="px-3 py-1.5 text-sm font-semibold"
                aria-label={`Select frame ${index + 1}`}
              >
                {index + 1}
              </button>
              <button
                type="button"
                onClick={() => deleteFrame(index)}
                className="flex w-8 items-center justify-center border-l border-inherit text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete frame ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <PanelSlideOver
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        activeTab={panelTab}
        onTabChange={setPanelTab}
        formations={formations}
        savedPlays={savedPlays}
        playbooks={playbooks}
        onLoadFormation={loadFormation}
        onOpenSaveFormation={() => {
          setPanelOpen(false)
          setShowFormationModal(true)
        }}
        onLoadPlay={handleLoadPlay}
        onSaveToPlaybook={handleSaveToPlaybook}
        onSaveLocally={handleSaveLocally}
        onExport={exportMove}
        initialTitle={playTitle}
        saveStatus={saveStatus}
        isGuest={isGuest}
      />

      {showDefaultsModal && setupRequired && (
        <DefaultsModal
          teams={setupRequired.teams}
          playbooks={setupRequired.playbooks}
          onComplete={(teamId, playbookId) => {
            setShowDefaultsModal(false)
            setPlaybooks((prev) => {
              const alreadyInList = prev.some((pb) => pb.id === playbookId)
              return alreadyInList ? prev : [...prev, { id: playbookId, name: '' }]
            })
          }}
          onSkip={() => setShowDefaultsModal(false)}
        />
      )}

      {showFormationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowFormationModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-950">Save formation</h2>
              <button
                type="button"
                onClick={() => setShowFormationModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Saves this frame&apos;s player positions as a starting point for new moves.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input
                  value={formationName}
                  onChange={(e) => setFormationName(e.target.value)}
                  placeholder="e.g. Tight scrum left"
                  autoFocus
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-emerald-700"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Category
                <select
                  value={formationCategory}
                  onChange={(e) => setFormationCategory(e.target.value as FormationCategory)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-emerald-700"
                >
                  <option value="Scrum">Scrum</option>
                  <option value="Lineout">Lineout</option>
                  <option value="Penalty">Penalty</option>
                  <option value="Open Play">Open Play</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFormationModal(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFormation}
                disabled={!formationName.trim()}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Save formation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
